
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener saldo actual
    const ultimoMovimiento = await prisma.inventarioTickets.findFirst({
      orderBy: {
        createdAt: 'desc'
      }
    })

    const saldoActual = ultimoMovimiento?.saldoActual || 0

    // Calcular tickets comprados (suma de COMPRA y AJUSTE positivos)
    const compras = await prisma.inventarioTickets.aggregate({
      where: {
        tipo: {
          in: ['COMPRA', 'AJUSTE']
        },
        cantidad: {
          gt: 0
        }
      },
      _sum: {
        cantidad: true
      }
    })

    // Calcular tickets usados (suma de CONSUMO)
    const consumos = await prisma.inventarioTickets.aggregate({
      where: {
        tipo: 'CONSUMO'
      },
      _sum: {
        cantidad: true
      }
    })

    const ticketsComprados = compras._sum.cantidad || 0
    const ticketsUsados = Math.abs(consumos._sum.cantidad || 0)
    const alertaBajo = saldoActual <= 10

    return NextResponse.json({
      saldoActual,
      ticketsComprados,
      ticketsUsados,
      alertaBajo
    })
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
