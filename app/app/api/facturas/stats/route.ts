
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
        createdAt: true
      }
    })

    // Calcular estadísticas
    const totalFacturas = todasFacturas.filter((f: any) => f.tipo === 'FACTURA').length
    const totalTickets = todasFacturas.filter((f: any) => f.tipo === 'TICKET').length
    
    // Ingresos del mes actual
    const ingresosMes = todasFacturas
      .filter((f: any) => f.createdAt >= inicioMes && f.estado === 'PAGADA')
      .reduce((sum: number, f: any) => sum + f.total, 0)

    // Pendientes de cobro
    const pendientesCobro = todasFacturas
      .filter((f: any) => f.estado === 'PENDIENTE' || f.estado === 'VENCIDA')
      .reduce((sum: number, f: any) => sum + f.total, 0)

    const stats = {
      totalFacturas,
      totalTickets,
      ingresosMes,
      pendientesCobro
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
