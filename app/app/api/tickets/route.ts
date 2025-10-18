
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET - Obtener historial de movimientos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const movimientos = await prisma.inventarioTickets.findMany({
      orderBy: {
        fecha: 'desc'
      },
      take: 100 // Limitar a los últimos 100 movimientos
    })

    return NextResponse.json(movimientos)
  } catch (error) {
    console.error('Error obteniendo movimientos:', error)
    return NextResponse.json({ error: 'Error al obtener movimientos' }, { status: 500 })
  }
}

// POST - Crear nuevo movimiento (compra o ajuste)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { tipo, cantidad, concepto } = body

    if (!tipo || !cantidad || cantidad <= 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    // Obtener saldo actual
    const ultimoMovimiento = await prisma.inventarioTickets.findFirst({
      orderBy: {
        createdAt: 'desc'
      }
    })

    const saldoAnterior = ultimoMovimiento?.saldoActual || 0
    const saldoActual = saldoAnterior + cantidad

    // Crear movimiento
    const movimiento = await prisma.inventarioTickets.create({
      data: {
        tipo,
        cantidad,
        saldoAnterior,
        saldoActual,
        concepto: concepto || null,
        usuarioId: (session.user as any).id || null
      }
    })

    return NextResponse.json(movimiento)
  } catch (error) {
    console.error('Error creando movimiento:', error)
    return NextResponse.json({ error: 'Error al crear movimiento' }, { status: 500 })
  }
}
