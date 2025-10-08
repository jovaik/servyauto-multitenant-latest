
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    // Obtener estadísticas
    const [citasHoy, facturacionMensual, clientesTotal, citasPendientes] = await Promise.all([
      prisma.cita.count({
        where: {
          fecha: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.cita.aggregate({
        where: {
          fecha: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          estado: 'COMPLETADA',
        },
        _sum: {
          precioFinal: true,
        },
      }),
      prisma.cliente.count(),
      prisma.cita.count({
        where: {
          estado: 'PENDIENTE',
        },
      }),
    ])

    return NextResponse.json({
      citasHoy: citasHoy || 0,
      facturacionMensual: facturacionMensual._sum?.precioFinal || 0,
      clientesTotal: clientesTotal || 0,
      citasPendientes: citasPendientes || 0,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
