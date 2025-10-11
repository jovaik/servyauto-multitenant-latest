
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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
    const buildDateFilter = () => {
      if (fechaDesdeDate && fechaHastaDate) {
        return {
          createdAt: {
            gte: fechaDesdeDate,
            lte: fechaHastaDate
          }
        }
      } else if (fechaDesdeDate) {
        return {
          createdAt: {
            gte: fechaDesdeDate
          }
        }
      } else if (fechaHastaDate) {
        return {
          createdAt: {
            lte: fechaHastaDate
          }
        }
      }
      return {}
    }

    const dateFilter = buildDateFilter()

    // Obtener todas las facturas (incluyendo tickets) con filtro de fecha
    const todasFacturas = await prisma.factura.findMany({
      where: dateFilter,
      select: {
        tipo: true,
        total: true,
        estado: true,
        createdAt: true,
        metodoPago: true
      }
    })

    // Obtener todas las citas COMPLETADAS (son ventas cobradas) con filtro de fecha
    const citasCompletadas = await prisma.cita.findMany({
      where: {
        ...dateFilter,
        estado: 'COMPLETADA',
        total: { not: null },
        metodoPago: { not: null }
      },
      select: {
        total: true,
        metodoPago: true,
        createdAt: true
      }
    })

    // Calcular estadísticas de facturas
    const totalFacturas = todasFacturas.filter((f: any) => f.tipo === 'FACTURA').length
    const totalTickets = todasFacturas.filter((f: any) => f.tipo === 'TICKET').length
    
    // Ingresos (facturas pagadas)
    const ingresosMesFacturas = todasFacturas
      .filter((f: any) => f.estado === 'PAGADA')
      .reduce((sum: number, f: any) => sum + f.total, 0)

    // Ingresos (citas completadas)
    const ingresosMesCitas = citasCompletadas
      .reduce((sum: number, c: any) => sum + (c.total || 0), 0)

    const ingresosMes = ingresosMesFacturas + ingresosMesCitas

    // Pendientes de cobro (solo facturas, las citas completadas ya están cobradas)
    const pendientesCobro = todasFacturas
      .filter((f: any) => f.estado === 'PENDIENTE' || f.estado === 'VENCIDA')
      .reduce((sum: number, f: any) => sum + f.total, 0)

    // ====== DESGLOSE POR MÉTODO DE PAGO ======
    // Incluye tanto facturas pagadas como citas completadas
    
    // FACTURAS pagadas
    const facturasPagadas = todasFacturas.filter((f: any) => f.estado === 'PAGADA')
    const ventasEfectivoFacturas = facturasPagadas
      .filter((f: any) => f.metodoPago === 'EFECTIVO')
      .reduce((sum: number, f: any) => sum + f.total, 0)
    
    const ventasTPVSumupFacturas = facturasPagadas
      .filter((f: any) => f.metodoPago === 'TPV_SUMUP')
      .reduce((sum: number, f: any) => sum + f.total, 0)
    
    const ventasTPVUnicajaFacturas = facturasPagadas
      .filter((f: any) => f.metodoPago === 'TPV_UNICAJA')
      .reduce((sum: number, f: any) => sum + f.total, 0)

    // CITAS completadas
    const ventasEfectivoCitas = citasCompletadas
      .filter((c: any) => c.metodoPago === 'EFECTIVO')
      .reduce((sum: number, c: any) => sum + (c.total || 0), 0)
    
    const ventasTPVSumupCitas = citasCompletadas
      .filter((c: any) => c.metodoPago === 'TPV_SUMUP')
      .reduce((sum: number, c: any) => sum + (c.total || 0), 0)
    
    const ventasTPVUnicajaCitas = citasCompletadas
      .filter((c: any) => c.metodoPago === 'TPV_UNICAJA')
      .reduce((sum: number, c: any) => sum + (c.total || 0), 0)

    // TOTALES combinados (facturas + citas)
    const ventasEfectivo = ventasEfectivoFacturas + ventasEfectivoCitas
    const ventasTPVSumup = ventasTPVSumupFacturas + ventasTPVSumupCitas
    const ventasTPVUnicaja = ventasTPVUnicajaFacturas + ventasTPVUnicajaCitas
    const totalVentas = ventasEfectivo + ventasTPVSumup + ventasTPVUnicaja

    // ====== OBTENER GASTOS PARA RESTAR DEL EFECTIVO ======
    const todosGastos = await prisma.gasto.findMany({
      where: dateFilter,
      select: {
        importe: true,
        metodoPago: true
      }
    })

    // Gastos pagados en efectivo
    const gastosEfectivo = todosGastos
      .filter((g: any) => g.metodoPago === 'EFECTIVO')
      .reduce((sum: number, g: any) => sum + g.importe, 0)

    // Efectivo real en caja = Ventas en efectivo - Gastos en efectivo
    const efectivoEnCaja = ventasEfectivo - gastosEfectivo

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
      // Gastos
      gastosEfectivo,
      efectivoEnCaja, // Efectivo real que debe haber en caja
      // Info adicional para verificación
      totalCitasCompletadas: citasCompletadas.length
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
