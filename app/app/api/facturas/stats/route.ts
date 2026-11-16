import { facturasPorLocal } from '@/lib/factura-local'
import { loadCashLedger, summarizeCashLedger } from '@/lib/cash-ledger'
import { dashboardExtraPeriod } from '@/lib/dashboard-period'

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
    if (searchParams.get('diario') === '1') return NextResponse.json(await loadCashLedger(localContext))
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    // Configurar filtros de fecha
    let fechaDesdeDate: Date | undefined
    let fechaHastaDate: Date | undefined

    try {
      if (fechaDesde || fechaHasta) {
        const range = dashboardExtraPeriod('personalizado', fechaDesde || fechaHasta, fechaHasta || fechaDesde)!
        if (fechaDesde) fechaDesdeDate = range.startDate
        if (fechaHasta) fechaHastaDate = range.endDate
      }
    } catch {
      return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 })
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
    
    // Pendientes de cobro (solo facturas, las citas completadas ya están cobradas)
    const pendientesCobro = todasFacturas
      .filter((f: any) => f.estado === 'PENDIENTE' || f.estado === 'VENCIDA')
      .reduce((sum: number, f: any) => sum + f.total, 0)

    const movements = await loadCashLedger(localContext, fechaDesdeDate, fechaHastaDate)
    const cash = summarizeCashLedger(movements)
    const stats = {
      totalFacturas, totalTickets, pendientesCobro,
      ingresosMes: cash.totalIngresosCaja,
      ...cash,
      totalCitasCompletadasSinFactura: citasCompletadasSinFactura.length,
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
