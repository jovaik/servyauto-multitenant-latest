import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createCheckout, initiateReaderPayment, getLocalSumUpKeys } from '@/lib/sumup'
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

    // Determinar localId: primero de la cita, luego del contexto
    let localId: string | null = null
    
    // Si hay citaId, obtener el localId de la cita
    if (citaId) {
      const cita = await prisma.cita.findUnique({
        where: { id: citaId },
        select: { localId: true }
      })
      localId = cita?.localId || null
    }
    
    // Si hay facturaId, obtener el localId de la factura
    if (!localId && facturaId) {
      const factura = await prisma.factura.findUnique({
        where: { id: facturaId },
        select: { localId: true }
      })
      localId = factura?.localId || null
    }
    
    // Si no se encontró, usar el contexto del usuario
    if (!localId) {
      const localContext = await getLocalContext()
      localId = localContext?.selectedLocalId || null
    }
    
    // Si aún no hay localId, usar el local del usuario
    if (!localId) {
      const localCtxCheckout = await getLocalContext()
      const tenantIdCheckout = localCtxCheckout?.tenantId || null
      const user = await prisma.user.findFirst({
        where: { email: session.user?.email || '', ...(tenantIdCheckout ? { tenantId: tenantIdCheckout } : {}) },
        select: { localId: true }
      })
      localId = user?.localId || null
    }

    if (!localId) {
      return NextResponse.json(
        { error: 'No se pudo determinar el local. Contacte al administrador.' },
        { status: 400 }
      )
    }

    // Obtener nombre del local para la referencia
    const local = await prisma.local.findUnique({ where: { id: localId } })
    const localPrefix = local?.nombre?.substring(0, 10).replace(/\s+/g, '').toUpperCase() || 'SERVY'

    // Crear referencia con local
    const fullReference = reference || `${localPrefix}-${Date.now()}`

    // Obtener usuario
    const localCtxUser = await getLocalContext()
    const tenantIdUser = localCtxUser?.tenantId || null
    const user = await prisma.user.findFirst({
      where: { email: session.user?.email || '', ...(tenantIdUser ? { tenantId: tenantIdUser } : {}) },
    })

    // Obtener el reader de nuestra BD
    const dbReader = await prisma.sumUpReader.findUnique({
      where: { sumupReaderId: readerId },
    })

    // Obtener API keys del local (si tiene propias)
    const localKeys = await getLocalSumUpKeys(localId)

    // 1. Crear checkout en SumUp
    console.log(`Creando checkout SumUp: ${amount}€ - ${description} - Local: ${local?.nombre}`)
    const checkout = await createCheckout(amount, description, fullReference, localKeys.apiKey, localKeys.affiliateKey)
    console.log('Checkout creado:', checkout.id)

    // 2. Registrar transacción en nuestra BD (para tracking)
    const transaction = await prisma.sumUpTransaction.create({
      data: {
        checkoutId: checkout.id,
        readerId: dbReader?.id || '',
        localId: localId,
        amount: amount,
        status: 'PENDING',
        description: description,
        reference: fullReference,
        facturaId: facturaId || null,
        citaId: citaId || null,
        creadoPorId: user?.id || null,
        creadoPorNombre: user?.name || session.user?.name || null,
        ...(tenantIdUser ? { tenantId: tenantIdUser } : {}),
      },
    })

    // 3. Enviar al lector
    console.log(`Enviando a lector ${readerId}`)
    await initiateReaderPayment(readerId, checkout.id, localKeys.apiKey)

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
