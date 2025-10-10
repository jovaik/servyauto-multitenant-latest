
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

    // Obtener fecha del inicio del mes actual
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    // Obtener todas las facturas (incluyendo tickets)
    const todasFacturas = await prisma.factura.findMany({
      select: {
        tipo: true,
        total: true,
        estado: true,
        createdAt: true,
        metodoPago: true
      }
    })

    // Obtener todas las citas COMPLETADAS (son ventas cobradas)
    const citasCompletadas = await prisma.cita.findMany({
      where: {
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
    
    // Ingresos del mes actual (facturas pagadas)
    const ingresosMesFacturas = todasFacturas
      .filter((f: any) => f.createdAt >= inicioMes && f.estado === 'PAGADA')
      .reduce((sum: number, f: any) => sum + f.total, 0)

    // Ingresos del mes actual (citas completadas)
    const ingresosMesCitas = citasCompletadas
      .filter((c: any) => c.createdAt >= inicioMes)
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
