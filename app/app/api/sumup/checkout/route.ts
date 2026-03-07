import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createCheckout, initiateReaderPayment } from '@/lib/sumup'
import { prisma } from '@/lib/db'
import { getLocalContext } from '@/lib/local-context'

// POST - Crear checkout e iniciar cobro en lector
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { amount, description, reference, readerId, citaId, facturaId } = await request.json()

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

    // Obtener contexto del local
    const localContext = await getLocalContext()
    const localId = localContext?.selectedLocalId

    if (!localId) {
      return NextResponse.json(
        { error: 'No se pudo determinar el local' },
        { status: 400 }
      )
    }

    // Obtener nombre del local para la referencia
    const local = await prisma.local.findUnique({ where: { id: localId } })
    const localPrefix = local?.nombre?.substring(0, 10).replace(/\s+/g, '').toUpperCase() || 'SERVY'

    // Crear referencia con local
    const fullReference = reference || `${localPrefix}-${Date.now()}`

    // Obtener usuario
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || '' },
    })

    // Obtener el reader de nuestra BD
    const dbReader = await prisma.sumUpReader.findUnique({
      where: { sumupReaderId: readerId },
    })

    // 1. Crear checkout en SumUp
    console.log(`Creando checkout SumUp: ${amount}€ - ${description} - Local: ${local?.nombre}`)
    const checkout = await createCheckout(amount, description, fullReference)
    console.log('Checkout creado:', checkout.id)

    // 2. Registrar transacción en nuestra BD (para tracking)
    const transaction = await prisma.sumUpTransaction.create({
      data: {
        checkoutId: checkout.id,
        readerId: dbReader?.id || '', // Si no existe en BD, string vacío temporal
        localId: localId,
        amount: amount,
        status: 'PENDING',
        description: description,
        reference: fullReference,
        facturaId: facturaId || null,
        citaId: citaId || null,
        creadoPorId: user?.id || null,
        creadoPorNombre: user?.name || session.user?.name || null,
      },
    })

    // 3. Enviar al lector
    console.log(`Enviando a lector ${readerId}`)
    await initiateReaderPayment(readerId, checkout.id)

    return NextResponse.json({
      checkoutId: checkout.id,
      transactionId: transaction.id,
      status: 'PENDING',
      localNombre: local?.nombre,
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
