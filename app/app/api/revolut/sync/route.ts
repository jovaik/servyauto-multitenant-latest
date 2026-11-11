export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { refreshAndReconcileRevolut, isRevolutConfigured } from '@/lib/revolut'

/**
 * POST /api/revolut/sync
 * Comprueba el estado de TODOS los pedidos Revolut pendientes de una cita (o factura).
 * Si alguno está pagado, lo concilia (marca método REVOLUT en la cita/factura).
 * Devuelve la lista actualizada de transacciones.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    if (!isRevolutConfigured()) {
      return NextResponse.json({ error: 'Revolut no está configurado' }, { status: 400 })
    }

    const { citaId, facturaId } = await request.json()
    if (!citaId && !facturaId) {
      return NextResponse.json({ error: 'citaId o facturaId requerido' }, { status: 400 })
    }

    // Buscar transacciones pendientes
    const pendientes = await prisma.revolut_transactions.findMany({
      where: {
        ...(citaId ? { citaId } : { facturaId }),
        status: 'PENDING',
      },
      orderBy: { created_at: 'desc' },
    })

    const resultados: Array<{ orderId: string; status: string; reconciled: boolean }> = []
    let alguno_pagado = false

    for (const txn of pendientes) {
      try {
        const { status } = await refreshAndReconcileRevolut(txn.order_id)
        resultados.push({ orderId: txn.order_id, status, reconciled: status === 'PAID' })
        if (status === 'PAID') alguno_pagado = true
      } catch (e: any) {
        console.warn(`[Revolut Sync] Error consultando ${txn.order_id}:`, e?.message)
        resultados.push({ orderId: txn.order_id, status: 'ERROR', reconciled: false })
      }
    }

    // También devolver todas las transacciones de la cita/factura (para contexto en la UI)
    const todas = await prisma.revolut_transactions.findMany({
      where: citaId ? { citaId } : { facturaId },
      orderBy: { created_at: 'desc' },
      select: {
        order_id: true, status: true, amount: true, checkout_url: true,
        reconciled: true, created_at: true, reference: true,
      },
    })

    return NextResponse.json({
      sincronizadas: resultados.length,
      alguno_pagado,
      resultados,
      transacciones: todas,
    })
  } catch (error: any) {
    console.error('[Revolut Sync] Error:', error)
    return NextResponse.json({ error: error?.message || 'Error sincronizando Revolut' }, { status: 500 })
  }
}
