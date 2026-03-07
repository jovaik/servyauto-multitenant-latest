import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createPaymentLink, getCheckoutStatus } from '@/lib/sumup'
import { prisma } from '@/lib/db'
import { getLocalContext } from '@/lib/local-context'

// POST - Crear payment link
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { amount, description, citaId, facturaId, returnUrl } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'El importe debe ser mayor que 0' },
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

    // Crear referencia con local y timestamp
    const reference = `${localPrefix}-${Date.now()}`

    // Obtener usuario
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || '' },
    })

    console.log(`Creando payment link: ${amount}€ - ${description} - Local: ${local?.nombre}`)
    
    // Crear payment link en SumUp
    const paymentLink = await createPaymentLink(
      amount,
      description || `Pago ServyAuto - ${local?.nombre}`,
      reference,
      returnUrl
    )

    console.log('Payment link creado:', paymentLink.id, paymentLink.payment_url)

    // Registrar transacción en nuestra BD
    // Nota: No tenemos reader para payment links, usamos un registro especial
    let readerRecord = await prisma.sumUpReader.findFirst({
      where: { sumupReaderId: 'PAYMENT_LINK' },
    })

    if (!readerRecord) {
      readerRecord = await prisma.sumUpReader.create({
        data: {
          sumupReaderId: 'PAYMENT_LINK',
          nombre: 'Payment Links (Sin terminal)',
          localId: null, // Compartido
          activo: true,
        },
      })
    }

    const transaction = await prisma.sumUpTransaction.create({
      data: {
        checkoutId: paymentLink.id,
        readerId: readerRecord.id,
        localId: localId,
        amount: amount,
        status: 'PENDING',
        description: description,
        reference: reference,
        facturaId: facturaId || null,
        citaId: citaId || null,
        creadoPorId: user?.id || null,
        creadoPorNombre: user?.name || session.user?.name || null,
      },
    })

    return NextResponse.json({
      checkoutId: paymentLink.id,
      transactionId: transaction.id,
      paymentUrl: paymentLink.payment_url,
      status: 'PENDING',
      localNombre: local?.nombre,
      message: 'Link de pago generado. El cliente puede pagar escaneando el QR o abriendo el link.',
    })
  } catch (error: any) {
    console.error('Error creando payment link:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear el link de pago' },
      { status: 500 }
    )
  }
}
