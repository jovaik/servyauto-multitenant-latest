export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomUUID } from 'crypto'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext } from '@/lib/local-context'
import { createRevolutOrder, isRevolutConfigured } from '@/lib/revolut'

// POST - Crear enlace de pago de Revolut para una cita o factura
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    if (!isRevolutConfigured()) {
      return NextResponse.json(
        { error: 'Revolut aún no está conectado. Falta añadir la clave de Revolut Business.' },
        { status: 400 }
      )
    }

    const { amount, description, citaId, facturaId } = await request.json()
    const amt = Number(amount)
    if (!amt || amt <= 0) return NextResponse.json({ error: 'El importe debe ser mayor que 0' }, { status: 400 })

    // Determinar localId y email del cliente
    let localId: string | null = null
    let customerEmail: string | null = null

    if (citaId) {
      const cita = await prisma.cita.findUnique({
        where: { id: citaId },
        select: { localId: true, cliente: { select: { email: true } } },
      })
      localId = cita?.localId || null
      customerEmail = cita?.cliente?.email || null
    }
    if (facturaId) {
      const factura = await prisma.factura.findUnique({
        where: { id: facturaId },
        select: { localId: true, cliente: { select: { email: true } } },
      })
      if (!localId) localId = factura?.localId || null
      if (!customerEmail) customerEmail = factura?.cliente?.email || null
    }
    if (!localId) {
      const localContext = await getLocalContext()
      localId = localContext?.selectedLocalId || null
    }
    if (!localId) {
      const u = await prisma.user.findUnique({ where: { email: session.user?.email || '' } })
      localId = u?.localId || null
    }

    const local = localId ? await prisma.local.findUnique({ where: { id: localId } }) : null
    const localPrefix = local?.nombre?.substring(0, 10).replace(/\s+/g, '').toUpperCase() || 'SERVY'
    const reference = `${localPrefix}-${Date.now()}`

    const order = await createRevolutOrder({
      amount: amt,
      description: description || `Pago ServyAuto - ${local?.nombre || ''}`,
      reference,
      customerEmail,
    })

    const user = await prisma.user.findUnique({ where: { email: session.user?.email || '' } })

    await prisma.revolut_transactions.create({
      data: {
        id: randomUUID(),
        order_id: order.id,
        checkout_url: order.checkout_url || null,
        amount: amt,
        status: 'PENDING',
        description: description || null,
        reference,
        citaId: citaId || null,
        facturaId: facturaId || null,
        localId: localId || null,
        creadoPorId: user?.id || null,
        creadoPorNombre: user?.name || session.user?.name || null,
      },
    })

    return NextResponse.json({ orderId: order.id, paymentUrl: order.checkout_url, status: 'PENDING' })
  } catch (error: any) {
    console.error('[Revolut] Error creando enlace de pago:', error)
    return NextResponse.json({ error: error?.message || 'Error creando el enlace de Revolut' }, { status: 500 })
  }
}
