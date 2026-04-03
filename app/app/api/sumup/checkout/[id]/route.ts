import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCheckoutStatus, cancelCheckout, getLocalSumUpKeys } from '@/lib/sumup'
import { prisma } from '@/lib/db'

// GET - Consultar estado del checkout
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Buscar la transacción para saber qué local (y qué API key) usar
    const txn = await prisma.sumUpTransaction.findFirst({
      where: { checkoutId: params.id },
      select: { localId: true },
    })
    const localKeys = await getLocalSumUpKeys(txn?.localId)
    
    const checkout = await getCheckoutStatus(params.id, localKeys.apiKey)
    
    // Actualizar estado en nuestra BD
    if (checkout.status === 'PAID' || checkout.status === 'FAILED' || checkout.status === 'CANCELLED') {
      await prisma.sumUpTransaction.updateMany({
        where: { checkoutId: params.id },
        data: {
          status: checkout.status,
          transactionCode: checkout.transaction_code || checkout.transaction_id || null,
        },
      })
    }

    return NextResponse.json({
      id: checkout.id,
      status: checkout.status,
      amount: checkout.amount,
      transactionCode: checkout.transaction_code,
      transactionId: checkout.transaction_id,
    })
  } catch (error: any) {
    console.error('Error consultando checkout SumUp:', error)
    return NextResponse.json(
      { error: error.message || 'Error al consultar estado' },
      { status: 500 }
    )
  }
}

// DELETE - Cancelar checkout
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Buscar la transacción para saber qué API key usar
    const txnCancel = await prisma.sumUpTransaction.findFirst({
      where: { checkoutId: params.id },
      select: { localId: true },
    })
    const localKeysCancel = await getLocalSumUpKeys(txnCancel?.localId)
    
    await cancelCheckout(params.id, localKeysCancel.apiKey)
    
    // Actualizar estado en nuestra BD
    await prisma.sumUpTransaction.updateMany({
      where: { checkoutId: params.id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error cancelando checkout SumUp:', error)
    return NextResponse.json(
      { error: error.message || 'Error al cancelar cobro' },
      { status: 500 }
    )
  }
}
