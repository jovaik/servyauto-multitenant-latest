
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext, buildLocalFilter } from '@/lib/local-context'

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
        totalGastosMes: 0, totalFacturas: 0, totalTickets: 0, totalGastos: 0
      })
    }
    
    const localFilter = buildLocalFilter(localContext)

    // Obtener fecha actual
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    // Primer día del mes actual
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1)

    // Gastos del mes actual - filtrado por local
    const gastosMes = await prisma.gasto.findMany({
      where: {
        fecha: {
          gte: firstDayOfMonth
        },
        ...localFilter
      }
    })

    const totalGastosMes = gastosMes.reduce((sum: number, gasto: any) => sum + gasto.importe, 0)

    // Gastos por tipo de documento - filtrado por local
    const gastosPorTipo = await prisma.gasto.groupBy({
      by: ['tipo'],
      where: localFilter,
      _count: {
        tipo: true
      }
    })

    const stats = {
      totalGastosMes,
      totalFacturas: gastosPorTipo.find((g: any) => g.tipo === 'FACTURA')?._count.tipo || 0,
      totalTickets: gastosPorTipo.find((g: any) => g.tipo === 'TICKET')?._count.tipo || 0,
      totalGastos: await prisma.gasto.count({ where: localFilter })
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching gastos stats:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
