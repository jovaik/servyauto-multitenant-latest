import { prisma } from '@/lib/db'

export type RepartoLocal = { localId: string; total: number }[]

// Reparto en céntimos, estable: la suma de las partes siempre coincide con el documento.
export function distribuirImporte(importe: number, reparto: RepartoLocal): number[] {
  const cents = Math.round(importe * 100)
  const pesos = reparto.map(r => Math.round(r.total * 100))
  const total = pesos.reduce((s, n) => s + n, 0)
  let acumulado = 0
  let anterior = 0
  return pesos.map(peso => {
    acumulado += peso
    const limite = total ? Math.round(cents * acumulado / total) : 0
    const parte = limite - anterior
    anterior = limite
    return parte / 100
  })
}

export function partesFactura(f: any): any[] {
  const reparto: RepartoLocal = Array.isArray(f.repartoLocales) ? f.repartoLocales : []
  if (reparto.length < 2) return [f]
  const campos = ['total', 'subtotal', 'iva'].filter(k => typeof f[k] === 'number')
  const valores = Object.fromEntries(campos.map(k => [k, distribuirImporte(f[k], reparto)]))
  return reparto.map((r, i) => ({ ...f, localId: r.localId, ...Object.fromEntries(campos.map(k => [k, valores[k][i]])) }))
}

function alcance(where: any = {}) {
  const { localId, ...resto } = where
  if (localId === undefined) return { where, ids: null as string[] | null }
  const ids = typeof localId === 'string' ? [localId] : localId?.in || []
  return {
    ids,
    where: { AND: [resto, { OR: [{ localId }, { localesAgrupados: { hasSome: ids } }] }] },
  }
}

function ajustar(f: any, ids: string[] | null, conservarTotal = false): any {
  const partes = partesFactura(f)
  if (!ids || partes.length < 2) return f
  const propias = partes.filter(p => ids.includes(p.localId))
  const importes = Object.fromEntries(['total', 'subtotal', 'iva'].filter(k => typeof f[k] === 'number')
    .map(k => [k, Math.round(propias.reduce((s, p) => s + p[k], 0) * 100) / 100]))
  return conservarTotal ? { ...f, totalLocal: importes.total } : { ...f, ...importes }
}

// Solo lecturas económicas. El documento/PDF conserva siempre su importe íntegro.
export const facturasPorLocal = {
  async findMany(args: any, conservarTotal = false): Promise<any[]> {
    const a = alcance(args.where)
    const rows = await prisma.factura.findMany({ ...args, where: a.where,
      ...(args.select ? { select: { ...args.select, localesAgrupados: true, repartoLocales: true } } : {}),
    })
    return rows.map(f => ajustar(f, a.ids, conservarTotal))
  },
  async aggregate(args: any): Promise<any> {
    const a = alcance(args.where)
    const resultado: any = await prisma.factura.aggregate({ ...args, where: a.where })
    if (!a.ids || !args._sum) return resultado
    const multi = await prisma.factura.findMany({ where: { AND: [a.where, { localesAgrupados: { hasSome: a.ids } }] } })
    for (const f of multi) {
      const ajustada = ajustar(f, a.ids)
      for (const k of Object.keys(args._sum)) {
        resultado._sum[k] += (ajustada[k] || 0) - ((f as any)[k] || 0)
      }
    }
    return resultado
  },
  async groupBy(args: any): Promise<any[]> {
    const a = alcance(args.where)
    const resultado: any[] = await (prisma.factura.groupBy as any)({ ...args, where: a.where })
    if (!a.ids || !args._sum) return resultado
    const multi = await prisma.factura.findMany({ where: { AND: [a.where, { localesAgrupados: { hasSome: a.ids } }] } })
    for (const f of multi) {
      const grupo = resultado.find(g => args.by.every((k: string) => g[k] === (f as any)[k]))
      if (!grupo) continue
      const ajustada = ajustar(f, a.ids)
      for (const k of Object.keys(args._sum)) grupo._sum[k] += (ajustada[k] || 0) - ((f as any)[k] || 0)
    }
    return resultado
  },
}
