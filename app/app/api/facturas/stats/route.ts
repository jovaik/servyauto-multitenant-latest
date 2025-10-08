
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

    // Obtener todas las facturas
    const todasFacturas = await prisma.factura.findMany({
      select: {
        total: true,
        pagada: true,
        createdAt: true
      }
    })

    // Obtener todos los tickets
    const todosTickets = await prisma.ticket.findMany({
      select: {
        total: true,
        pagado: true,
        createdAt: true
      }
    })

    // Calcular estadísticas
    const totalFacturas = todasFacturas.length
    const totalTickets = todosTickets.length
    
    // Ingresos del mes actual
    const ingresosMesFacturas = todasFacturas
      .filter(f => f.createdAt >= inicioMes && f.pagada)
      .reduce((sum, f) => sum + f.total, 0)
      
    const ingresosMesTickets = todosTickets
      .filter(t => t.createdAt >= inicioMes && t.pagado)
      .reduce((sum, t) => sum + t.total, 0)

    const ingresosMes = ingresosMesFacturas + ingresosMesTickets

    // Pendientes de cobro
    const pendientesCobroFacturas = todasFacturas
      .filter(f => !f.pagada)
      .reduce((sum, f) => sum + f.total, 0)
      
    const pendientesCobroTickets = todosTickets
      .filter(t => !t.pagado)
      .reduce((sum, t) => sum + t.total, 0)

    const pendientesCobro = pendientesCobroFacturas + pendientesCobroTickets

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
