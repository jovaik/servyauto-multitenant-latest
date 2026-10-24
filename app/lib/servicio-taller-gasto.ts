import { prisma } from '@/lib/db'
import { notificarCreacionGSControl, notificarModificacionGSControl, notificarEliminacionGSControl, mapearCategoriaGasto } from '@/lib/gscontrol-sync'

// Métodos de pago válidos para un Gasto (el modelo Gasto no admite REVOLUT)
const METODOS_GASTO = ['EFECTIVO', 'TPV_SUMUP', 'TPV_UNICAJA']
function metodoGastoValido(m?: string | null): string {
  return m && METODOS_GASTO.includes(m) ? m : 'EFECTIVO'
}

export interface SyncGastoCosteParams {
  servicioId: string
  concepto: string
  fecha: Date
  tipoGasto: string
  coste: number
  metodoPagoCoste?: string | null
  localId?: string | null
  creadoPorId?: string | null
  creadoPorNombre?: string | null
  // Si true, mantiene el localId existente del gasto cuando ya existe (no lo pisa)
  conservarLocalExistente?: boolean
}

/**
 * Crea / actualiza / elimina el Gasto que representa el COSTE INTERNO de un
 * servicio de taller (lo que pagamos al tapicero, pintor, repuesto, subcontrata…).
 * Así ese coste entra en la pantalla de Gastos, en los cierres y en las liquidaciones.
 * Es idempotente: se enlaza por `servicioTallerId`, de modo que nunca duplica.
 */
export async function syncGastoCosteServicio(params: SyncGastoCosteParams) {
  const { servicioId, concepto, fecha, tipoGasto, coste } = params
  const existente = await prisma.gasto.findFirst({ where: { servicioTallerId: servicioId } })

  // Sin coste → no debe haber gasto. Si existía, se elimina.
  if (!coste || coste <= 0) {
    if (existente) {
      await prisma.gasto.delete({ where: { id: existente.id } })
      try { await notificarEliminacionGSControl(existente.id) } catch {}
    }
    return null
  }

  const conceptoGasto = `Coste taller: ${concepto}`
  const metodoPago = metodoGastoValido(params.metodoPagoCoste)

  if (existente) {
    const data: any = {
      concepto: conceptoGasto,
      fecha,
      tipoGasto: tipoGasto || 'Otros',
      importe: coste,
      metodoPago,
    }
    if (!params.conservarLocalExistente && params.localId !== undefined) {
      data.localId = params.localId
    }
    const gasto = await prisma.gasto.update({ where: { id: existente.id }, data })
    try {
      await notificarModificacionGSControl({
        id: gasto.id, esIngreso: false, fecha: gasto.fecha, importe: gasto.importe,
        descripcion: conceptoGasto, costCategory: mapearCategoriaGasto(gasto.tipoGasto),
      })
    } catch {}
    return gasto
  }

  const gasto = await prisma.gasto.create({
    data: {
      concepto: conceptoGasto,
      fecha,
      tipoGasto: tipoGasto || 'Otros',
      importe: coste,
      metodoPago: metodoPago as any,
      tipo: 'TICKET',
      iva: 21,
      adjunto: false,
      localId: params.localId ?? null,
      creadoPorId: params.creadoPorId ?? null,
      creadoPorNombre: params.creadoPorNombre ?? 'Taller Rápido',
      servicioTallerId: servicioId,
    },
  })
  try {
    await notificarCreacionGSControl({
      id: gasto.id, esIngreso: false, fecha: gasto.fecha, importe: gasto.importe,
      descripcion: conceptoGasto, costCategory: mapearCategoriaGasto(gasto.tipoGasto),
    })
  } catch {}
  return gasto
}

/** Elimina el gasto de coste asociado a un servicio (al borrar el servicio). */
export async function eliminarGastoCosteServicio(servicioId: string) {
  const gastos = await prisma.gasto.findMany({ where: { servicioTallerId: servicioId } })
  for (const g of gastos) {
    await prisma.gasto.delete({ where: { id: g.id } })
    try { await notificarEliminacionGSControl(g.id) } catch {}
  }
}
