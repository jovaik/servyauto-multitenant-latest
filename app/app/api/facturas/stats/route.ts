import { facturasPorLocal } from '@/lib/factura-local'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext, buildLocalFilter } from '@/lib/local-context'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener contexto de local para filtrado
    const localContext = await getLocalContext()
    
    if (!localContext) {
      return NextResponse.json({
        totalFacturas: 0, totalTickets: 0, ingresosMes: 0, pendientesCobro: 0,
        totalVentas: 0, ventasEfectivo: 0, ventasTPVSumup: 0, ventasTPVUnicaja: 0, ventasRevolut: 0,
        gastosEfectivo: 0, gastosTotal: 0, transferenciasEntrada: 0, transferenciasSalida: 0,
        efectivoEnCaja: 0, totalCitasCompletadasSinFactura: 0
      })
    }
    
    const localFilter = buildLocalFilter(localContext)

    // Obtener parámetros de fecha de la query string
    const { searchParams } = new URL(request.url)
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    // Configurar filtros de fecha
    let fechaDesdeDate: Date | undefined
    let fechaHastaDate: Date | undefined

    if (fechaDesde) {
      fechaDesdeDate = new Date(fechaDesde)
      fechaDesdeDate.setHours(0, 0, 0, 0)
    }

    if (fechaHasta) {
      fechaHastaDate = new Date(fechaHasta)
      fechaHastaDate.setHours(23, 59, 59, 999)
    }

    // Construir el filtro de fecha para las consultas
    // IMPORTANTE: Usamos 'fecha' (no 'createdAt') para que coincida con la fecha visible del documento
    const buildDateFilterFacturas = () => {
      if (fechaDesdeDate && fechaHastaDate) {
        return {
          fecha: {
            gte: fechaDesdeDate,
            lte: fechaHastaDate
          }
        }
      } else if (fechaDesdeDate) {
        return {
          fecha: {
            gte: fechaDesdeDate
          }
        }
      } else if (fechaHastaDate) {
        return {
          fecha: {
            lte: fechaHastaDate
          }
        }
      }
      return {}
    }

    const buildDateFilterCitas = () => {
      if (fechaDesdeDate && fechaHastaDate) {
        return {
          fecha: {
            gte: fechaDesdeDate,
            lte: fechaHastaDate
          }
        }
      } else if (fechaDesdeDate) {
        return {
          fecha: {
            gte: fechaDesdeDate
          }
        }
      } else if (fechaHastaDate) {
        return {
          fecha: {
            lte: fechaHastaDate
          }
        }
      }
      return {}
    }

    const buildDateFilterGastos = () => {
      if (fechaDesdeDate && fechaHastaDate) {
        return {
          fecha: {
            gte: fechaDesdeDate,
            lte: fechaHastaDate
          }
        }
      } else if (fechaDesdeDate) {
        return {
          fecha: {
            gte: fechaDesdeDate
          }
        }
      } else if (fechaHastaDate) {
        return {
          fecha: {
            lte: fechaHastaDate
          }
        }
      }
      return {}
    }

    const dateFilterFacturas = buildDateFilterFacturas()
    const dateFilterCitas = buildDateFilterCitas()
    const dateFilterGastos = buildDateFilterGastos()

    // Obtener todas las facturas (incluyendo tickets) con filtro de fecha Y local
    const todasFacturas = await facturasPorLocal.findMany({
      where: {
        ...dateFilterFacturas,
        ...localFilter
      },
      select: {
        id: true,
        tipo: true,
        total: true,
        estado: true,
        fecha: true,
        metodoPago: true,
        citaId: true
      }
    })

    // Obtener IDs de citas que ya tienen factura asociada (para evitar duplicados) - filtrado por local
    const citasConFactura = await facturasPorLocal.findMany({
      where: {
        citaId: { not: null },
        ...localFilter
      },
      select: {
        citaId: true
      }
    })
    const citasConFacturaIds = citasConFactura
      .map((f: any) => f.citaId)
      .filter((id: any): id is string => id !== null && id !== undefined)

    // Obtener todas las citas COMPLETADAS que NO tienen factura (para evitar duplicación) - filtrado por local
    const citasCompletadasSinFactura = await prisma.cita.findMany({
      where: {
        ...dateFilterCitas,
        ...localFilter,
        estado: 'COMPLETADA',
        facturaAgrupadaId: null,
        cobroDiferido: false,
        total: { not: null },
        metodoPago: { not: null },
        id: { notIn: citasConFacturaIds }
      },
      select: {
        id: true,
        total: true,
        metodoPago: true,
        fecha: true
      }
    })

    // Calcular estadísticas de facturas
    const totalFacturas = todasFacturas.filter((f: any) => f.tipo === 'FACTURA').length
    const totalTickets = todasFacturas.filter((f: any) => f.tipo === 'TICKET').length
    
    // Ingresos (facturas pagadas)
    const ingresosMesFacturas = todasFacturas
      .filter((f: any) => f.estado === 'PAGADA')
      .reduce((sum: number, f: any) => sum + f.total, 0)

    // Ingresos (citas completadas SIN factura - para evitar duplicados)
    const ingresosMesCitas = citasCompletadasSinFactura
      .reduce((sum: number, c: any) => sum + (c.total || 0), 0)

    const ingresosMes = ingresosMesFacturas + ingresosMesCitas

    // Pendientes de cobro (solo facturas, las citas completadas ya están cobradas)
    const pendientesCobro = todasFacturas
      .filter((f: any) => f.estado === 'PENDIENTE' || f.estado === 'VENCIDA')
      .reduce((sum: number, f: any) => sum + f.total, 0)

    // ====== DESGLOSE POR MÉTODO DE PAGO (ALINEADO CON EL DIARIO DE CAJA) ======
    // Una cita puede cobrarse en varios métodos/cuentas mediante PAGOS PARCIALES. El ticket
    // guarda un único método, pero el desglose real está en los pagos parciales. Para que
    // Facturación coincida EXACTAMENTE con el Diario: la factura solo aporta el RESTO no
    // cubierto por pagos parciales (en su método), y cada pago parcial se suma por su método real.
    // Las cifras de caja siguen el cobro, no la emisión fiscal (una conversión no mueve dinero).
    const rangoCobro = { gte: fechaDesdeDate, lte: fechaHastaDate }
    const facturasPagadas = await facturasPorLocal.findMany({
      where: {
        ...localFilter,
        estado: 'PAGADA',
        ...((fechaDesdeDate || fechaHastaDate) ? { OR: [
          { fechaPago: rangoCobro },
          { fechaPago: null, fecha: rangoCobro },
        ] } : {}),
      },
      select: { id: true, citaId: true, total: true, metodoPago: true },
    })

    // Suma de TODOS los pagos parciales por cita (sin filtro de fecha) para deducir el resto
    const pagosTodosDeCita = await prisma.pagoParcial.findMany({
      where: { cita: localFilter },
      select: { citaId: true, importe: true, cita: { select: { facturaAgrupadaId: true } } }
    })
    const sumPagosPorCita: Record<string, number> = {}
    const sumPagosPorAgrupada: Record<string, number> = {}
    for (const p of pagosTodosDeCita) {
      if (p.cita.facturaAgrupadaId) sumPagosPorAgrupada[p.cita.facturaAgrupadaId] = (sumPagosPorAgrupada[p.cita.facturaAgrupadaId] || 0) + p.importe
      if (!p.citaId) continue
      sumPagosPorCita[p.citaId] = (sumPagosPorCita[p.citaId] || 0) + (p.importe || 0)
    }
    // Pagos parciales DENTRO del periodo (por su método real)
    const pagosParcialesPeriodo = await prisma.pagoParcial.findMany({
      where: { cita: localFilter, ...dateFilterGastos },
      select: { importe: true, metodoPago: true }
    })

    const buckets: Record<string, number> = { EFECTIVO: 0, TPV_SUMUP: 0, TPV_UNICAJA: 0, REVOLUT: 0 }
    // Facturas pagadas: solo el RESTO no cubierto por pagos parciales, en el método de la factura
    for (const f of facturasPagadas) {
      const sp = (f as any).citaId ? (sumPagosPorCita[(f as any).citaId] || 0) : (sumPagosPorAgrupada[f.id] || 0)
      const imp = sp > 0 ? Math.round((((f as any).total || 0) - sp) * 100) / 100 : ((f as any).total || 0)
      if (sp > 0 && imp <= 0.01) continue
      const m = (f as any).metodoPago
      if (m && buckets[m] !== undefined) buckets[m] += imp
    }
    // Citas completadas SIN factura: su método completo
    for (const c of citasCompletadasSinFactura) {
      const m = (c as any).metodoPago
      if (m && buckets[m] !== undefined) buckets[m] += ((c as any).total || 0)
    }
    // Pagos parciales del periodo: por su método/cuenta real (efectivo, SumUp de Barto, etc.)
    for (const p of pagosParcialesPeriodo) {
      const m = (p as any).metodoPago
      if (m && buckets[m] !== undefined) buckets[m] += ((p as any).importe || 0)
    }

    const ventasEfectivo = Math.round(buckets.EFECTIVO * 100) / 100
    const ventasTPVSumup = Math.round(buckets.TPV_SUMUP * 100) / 100
    const ventasTPVUnicaja = Math.round(buckets.TPV_UNICAJA * 100) / 100
    const ventasRevolut = Math.round(buckets.REVOLUT * 100) / 100
    const totalVentas = Math.round((ventasEfectivo + ventasTPVSumup + ventasTPVUnicaja + ventasRevolut) * 100) / 100

    // ====== OBTENER GASTOS PARA RESTAR DEL EFECTIVO ====== (filtrado por local)
    const todosGastos = await prisma.gasto.findMany({
      where: {
        ...dateFilterGastos,
        ...localFilter
      },
      select: {
        importe: true,
        metodoPago: true
      }
    })

    // Gastos pagados en efectivo
    const gastosEfectivo = todosGastos
      .filter((g: any) => g.metodoPago === 'EFECTIVO')
      .reduce((sum: number, g: any) => sum + g.importe, 0)

    // Mismo criterio que el Diario: salida en origen, entrada en destino,
    // e inversión en la fecha de devolución. Sin local, el movimiento interno es neutro.
    let transferenciasEntrada = 0
    let transferenciasSalida = 0
    const selectedLocalId = localContext.selectedLocalId
    if (selectedLocalId) {
      const rango = { gte: fechaDesdeDate, lte: fechaHastaDate }
      const transferencias = await prisma.transferenciaCaja.findMany({
        where: {
          AND: [
            { OR: [{ origenLocalId: selectedLocalId }, { destinoLocalId: selectedLocalId }] },
            { OR: [
              { fecha: rango },
              { estado: 'DEVUELTO', fechaDevolucion: { not: null, ...rango } }
            ] }
          ]
        },
        select: {
          origenLocalId: true, destinoLocalId: true, importe: true,
          fecha: true, estado: true, fechaDevolucion: true
        }
      })
      const enPeriodo = (fecha: Date) =>
        (!fechaDesdeDate || fecha >= fechaDesdeDate) && (!fechaHastaDate || fecha <= fechaHastaDate)
      for (const t of transferencias) {
        if (enPeriodo(t.fecha)) {
          if (t.origenLocalId === selectedLocalId) transferenciasSalida += t.importe
          if (t.destinoLocalId === selectedLocalId) transferenciasEntrada += t.importe
        }
        if (t.estado === 'DEVUELTO' && t.fechaDevolucion && enPeriodo(t.fechaDevolucion)) {
          if (t.origenLocalId === selectedLocalId) transferenciasEntrada += t.importe
          if (t.destinoLocalId === selectedLocalId) transferenciasSalida += t.importe
        }
      }
    }

    // Total de gastos del periodo (TODOS los métodos + transferencias de salida).
    // Coincide con el "Total Gastos" que muestra el Diario de Caja.
    const gastosTodosMetodos = todosGastos.reduce((sum: number, g: any) => sum + (g.importe || 0), 0)
    const gastosTotal = Math.round((gastosTodosMetodos + transferenciasSalida) * 100) / 100

    // Las transferencias mueven efectivo, pero no son ventas ni gastos operativos.
    const efectivoEnCaja = Math.round(
      (ventasEfectivo - gastosEfectivo + transferenciasEntrada - transferenciasSalida) * 100
    ) / 100

    const stats = {
      totalFacturas,
      totalTickets,
      ingresosMes,
      pendientesCobro,
      // Desglose por método de pago (incluye facturas + citas completadas)
      totalVentas,
      ventasEfectivo,
      ventasTPVSumup,
      ventasTPVUnicaja,
      ventasRevolut,
      // Gastos
      gastosEfectivo,
      gastosTotal,
      transferenciasEntrada,
      transferenciasSalida,
      efectivoEnCaja, // Efectivo real que debe haber en caja
      // Info adicional para verificación
      totalCitasCompletadasSinFactura: citasCompletadasSinFactura.length
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
