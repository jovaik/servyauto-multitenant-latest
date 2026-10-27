import { prisma } from '@/lib/db'
import { notificarCreacionGSControl, notificarModificacionGSControl, notificarEliminacionGSControl, mapearCategoriaGasto } from '@/lib/gscontrol-sync'

// El modelo Gasto no admite REVOLUT como metodoPago.
const METODOS_GASTO = ['EFECTIVO', 'TPV_SUMUP', 'TPV_UNICAJA']
function metodoGastoValido(m?: string | null): string {
  return m && METODOS_GASTO.includes(m) ? m : 'EFECTIVO'
}

// Mapea el tipo de coste interno de la cita a una etiqueta de gasto legible.
function tipoGastoDesde(tipo?: string | null): string {
  switch ((tipo || '').toUpperCase()) {
    case 'SUBCONTRATA': return 'Subcontrata'
    case 'RECAMBIO': return 'Recambios'
    default: return 'Otros'
  }
}

export interface SyncGastoCosteCitaParams {
  costeId: string
  descripcion: string
  importe: number
  tipo?: string | null
  fecha: Date
  localId?: string | null
  proveedor?: string | null
  metodoPago?: string | null
  creadoPorId?: string | null
  creadoPorNombre?: string | null
  matricula?: string | null
}

/**
 * Crea / actualiza / elimina el Gasto que representa un COSTE INTERNO anotado en
 * una cita de la agenda (subcontrata, recambio, otro). Así ese coste entra en la
 * pantalla de Gastos, en los cierres de caja y en las liquidaciones.
 * Es idempotente: se enlaza por `citaCosteInternoId`, de modo que nunca duplica.
 */
export async function syncGastoCosteCita(params: SyncGastoCosteCitaParams) {
  const { costeId, descripcion, importe, tipo, fecha } = params
  const existente = await prisma.gasto.findFirst({ where: { citaCosteInternoId: costeId } })

  if (!importe || importe <= 0) {
    if (existente) {
      await prisma.gasto.delete({ where: { id: existente.id } })
      try { await notificarEliminacionGSControl(existente.id) } catch {}
    }
    return null
  }

  const tipoGasto = tipoGastoDesde(tipo)
  const conceptoGasto = params.matricula
    ? `Coste ${tipoGasto.toLowerCase()}: ${descripcion} (${params.matricula})`
    : `Coste ${tipoGasto.toLowerCase()}: ${descripcion}`
  const metodoPago = metodoGastoValido(params.metodoPago)

  if (existente) {
    const gasto = await prisma.gasto.update({
      where: { id: existente.id },
      data: {
        concepto: conceptoGasto,
        fecha,
        tipoGasto,
        importe,
        metodoPago: metodoPago as any,
        proveedor: params.proveedor ?? existente.proveedor,
        localId: params.localId ?? existente.localId,
      },
    })
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
      tipoGasto,
      importe,
      metodoPago: metodoPago as any,
      tipo: 'TICKET',
      iva: 21,
      adjunto: false,
      proveedor: params.proveedor ?? null,
      localId: params.localId ?? null,
      creadoPorId: params.creadoPorId ?? null,
      creadoPorNombre: params.creadoPorNombre ?? 'Agenda',
      citaCosteInternoId: costeId,
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

/** Elimina el gasto asociado a un coste interno de cita (al borrar el coste). */
export async function eliminarGastoCosteCita(costeId: string) {
  const gastos = await prisma.gasto.findMany({ where: { citaCosteInternoId: costeId } })
  for (const g of gastos) {
    await prisma.gasto.delete({ where: { id: g.id } })
    try { await notificarEliminacionGSControl(g.id) } catch {}
  }
}
