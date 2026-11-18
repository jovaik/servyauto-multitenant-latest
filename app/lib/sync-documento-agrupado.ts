import type { Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'

export class DocumentoAgrupadoError extends Error {}
const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

// Se ejecuta dentro de la MISMA transacción que guarda la cita. Nunca crea cobros.
export async function syncDocumentoAgrupado(tx: Prisma.TransactionClient, facturaId: string) {
  await tx.$queryRaw`SELECT id FROM facturas WHERE id = ${facturaId} FOR UPDATE`
  const factura = await tx.factura.findUniqueOrThrow({ where: { id: facturaId }, include: { factura_items: { orderBy: { id: 'asc' } } } })
  const citas = await tx.cita.findMany({
    where: { facturaAgrupadaId: facturaId },
    include: { vehiculo: true, cita_servicios: { include: { servicios: true } }, lineasManuales: { orderBy: { createdAt: 'asc' } } },
    orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
  })
  if (!citas.length) throw new DocumentoAgrupadoError('El documento ya no tiene citas vinculadas. Recarga antes de editar.')
  const total = redondear(citas.reduce((s, c) => s + (c.total || 0), 0))
  if (factura.estado === 'CANCELADA') throw new DocumentoAgrupadoError('El documento está cancelado. Revisa su situación en Facturación antes de cambiar los servicios.')
  if (factura.estado === 'PAGADA' && Math.abs(total - factura.total) > 0.005) {
    throw new DocumentoAgrupadoError('El documento agrupado ya está cobrado. Revisa el ajuste en Facturación antes de cambiar su importe; no se ha guardado el cambio de servicios.')
  }
  const locales = Array.from(new Set(citas.map(c => c.localId)))
  if (locales.length > 1 && locales.includes(null)) throw new DocumentoAgrupadoError('Asigna un local a todos los servicios antes de agrupar entre locales.')
  const reparto = locales.filter((l): l is string => !!l).sort().map(localId => ({
    localId, total: redondear(citas.filter(c => c.localId === localId).reduce((s, c) => s + (c.total || 0), 0)),
  }))
  // Actualizar líneas en lugar de borrarlas: sus ids reservan números históricos convertidos.
  for (const [i, cita] of citas.entries()) {
    const vehiculo = [cita.vehiculo.matricula, cita.vehiculo.marca, cita.vehiculo.modelo].filter(Boolean).join(' ')
    const conceptos = [...cita.cita_servicios.map(cs => cs.servicios.nombre), ...cita.lineasManuales.map(l => l.descripcion)]
    const fecha = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric' }).format(cita.fecha)
    const data = { descripcion: `${fecha} · ${vehiculo || 'VEHÍCULO'} · ${conceptos.join(', ') || 'Servicio'}`.toUpperCase(), cantidad: 1, precio: redondear(cita.total || 0), total: redondear(cita.total || 0) }
    const existente = factura.factura_items[i]
    if (existente) await tx.factura_items.update({ where: { id: existente.id }, data })
    else await tx.factura_items.create({ data: { ...data, facturaId, id: `${factura.numero}-${i + 1}-${randomUUID()}` } })
  }
  // No borrar referencias fiscales históricas. Un cambio de composición se revisa aparte.
  if (factura.factura_items.length > citas.length) throw new DocumentoAgrupadoError('El documento tiene líneas adicionales editadas en Facturación. Revisa el documento antes de sincronizar desde Agenda.')
  const subtotal = redondear(total / 1.21)
  return tx.factura.update({ where: { id: facturaId }, data: {
    total, subtotal, iva: redondear(total - subtotal),
    localId: locales.length > 1 ? null : locales[0],
    localesAgrupados: locales.length > 1 ? reparto.map(r => r.localId) : [],
    ...(locales.length > 1 || factura.repartoLocales ? { repartoLocales: reparto } : {}),
  } })
}
