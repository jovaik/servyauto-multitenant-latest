
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Fecha actual para filtrar el mes
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Estadísticas paralelas
    const [totalFacturas, totalTickets, ingresosMes, pendientesCobro] = await Promise.all([
      // Total facturas
      prisma.factura.count({
        where: { tipo: 'FACTURA' }
      }),
      
      // Total tickets
      prisma.factura.count({
        where: { tipo: 'TICKET' }
      }),
      
      // Ingresos del mes actual
      prisma.factura.aggregate({
        where: {
          estado: 'PAGADA',
          fecha: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _sum: {
          total: true
        }
      }),
      
      // Pendientes de cobro
      prisma.factura.aggregate({
        where: {
          estado: 'PENDIENTE'
        },
        _sum: {
          total: true
        }
      })
    ])

    const stats = {
      totalFacturas,
      totalTickets,
      ingresosMes: ingresosMes._sum.total || 0,
      pendientesCobro: pendientesCobro._sum.total || 0
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching factura stats:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
