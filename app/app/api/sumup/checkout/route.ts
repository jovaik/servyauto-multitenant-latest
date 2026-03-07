import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createCheckout, initiateReaderPayment, getCheckoutStatus } from '@/lib/sumup'

// POST - Crear checkout e iniciar cobro en lector
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { amount, description, reference, readerId } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'El importe debe ser mayor que 0' },
        { status: 400 }
      )
    }

    if (!readerId) {
      return NextResponse.json(
        { error: 'Se requiere seleccionar un lector' },
        { status: 400 }
      )
    }

    // 1. Crear checkout
    console.log(`Creando checkout SumUp: ${amount}€ - ${description}`)
    const checkout = await createCheckout(amount, description, reference)
    console.log('Checkout creado:', checkout.id)

    // 2. Enviar al lector
    console.log(`Enviando a lector ${readerId}`)
    await initiateReaderPayment(readerId, checkout.id)

    return NextResponse.json({
      checkoutId: checkout.id,
      status: 'PENDING',
      message: 'Cobro enviado al terminal. El cliente puede pagar con tarjeta.',
    })
  } catch (error: any) {
    console.error('Error creando checkout SumUp:', error)
    return NextResponse.json(
      { error: error.message || 'Error al procesar el cobro' },
      { status: 500 }
    )
  }
}
