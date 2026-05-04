import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext, buildLocalFilter, getLocalIdForCreate } from '@/lib/local-context'

// GET - Obtener historial de movimientos (filtrado por local)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const localContext = await getLocalContext()
    if (!localContext) {
      return NextResponse.json([])
    }

    const localFilter = buildLocalFilter(localContext)

    const movimientos = await prisma.inventarioTickets.findMany({
      where: localFilter,
      include: {
        local: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: {
        fecha: 'desc'
      },
      take: 100
    })

    return NextResponse.json(movimientos)
  } catch (error) {
    console.error('Error obteniendo movimientos:', error)
    return NextResponse.json({ error: 'Error al obtener movimientos' }, { status: 500 })
  }
}

// POST - Crear nuevo movimiento (compra o ajuste), asignado al local activo
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { tipo, cantidad, concepto, localId: bodyLocalId } = body

    if (!tipo || !cantidad || cantidad <= 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    // Determinar localId: del body o del contexto activo
    const localContext = await getLocalContext()
    const localId = bodyLocalId || (localContext ? getLocalIdForCreate(localContext) : null)

    if (!localId) {
      return NextResponse.json(
        { error: 'Debes seleccionar un local antes de registrar tickets' },
        { status: 400 }
      )
    }

    // Obtener saldo actual PARA ESTE LOCAL
    const ultimoMovimiento = await prisma.inventarioTickets.findFirst({
      where: { localId },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const saldoAnterior = ultimoMovimiento?.saldoActual || 0
    const saldoActual = saldoAnterior + cantidad

    const movimiento = await prisma.inventarioTickets.create({
      data: {
        tipo,
        cantidad,
        saldoAnterior,
        saldoActual,
        concepto: concepto || null,
        usuarioId: (session.user as any).id || null,
        localId,
        ...(localContext?.tenantId ? { tenantId: localContext.tenantId } : {})
      },
      include: {
        local: {
          select: { id: true, nombre: true }
        }
      }
    })

    return NextResponse.json(movimiento)
  } catch (error) {
    console.error('Error creando movimiento:', error)
    return NextResponse.json({ error: 'Error al crear movimiento' }, { status: 500 })
  }
}
