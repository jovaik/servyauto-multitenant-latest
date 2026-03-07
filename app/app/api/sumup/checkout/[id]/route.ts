import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCheckoutStatus, cancelCheckout } from '@/lib/sumup'

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

    const checkout = await getCheckoutStatus(params.id)
    
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

    await cancelCheckout(params.id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error cancelando checkout SumUp:', error)
    return NextResponse.json(
      { error: error.message || 'Error al cancelar cobro' },
      { status: 500 }
    )
  }
}
