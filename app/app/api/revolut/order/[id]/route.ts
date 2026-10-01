export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { cancelRevolutOrder, refreshAndReconcileRevolut } from '@/lib/revolut'

// GET - Estado del pedido (y marca el cobro en la cita/factura si ya está pagado)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { status, order } = await refreshAndReconcileRevolut(params.id)
    return NextResponse.json({ orderId: order.id, status, state: order.state })
  } catch (error: any) {
    console.error('[Revolut] Error consultando pedido:', error)
    return NextResponse.json({ error: error?.message || 'Error consultando Revolut' }, { status: 500 })
  }
}

// DELETE - Cancelar el enlace
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    try { await cancelRevolutOrder(params.id) } catch (e) { console.warn('[Revolut] Aviso al cancelar:', e) }
    await prisma.revolut_transactions.updateMany({
      where: { order_id: params.id, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    })
    return NextResponse.json({ message: 'Enlace cancelado' })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al cancelar' }, { status: 500 })
  }
}
