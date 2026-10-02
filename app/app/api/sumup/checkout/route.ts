import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { initiateReaderPayment, getLocalSumUpKeys } from '@/lib/sumup'
import { prisma } from '@/lib/db'
import { getLocalContext } from '@/lib/local-context'
import { randomUUID } from 'crypto'

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
      const user = await prisma.user.findUnique({
        where: { email: session.user?.email || '' },
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
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || '' },
    })

    // Obtener el reader de nuestra BD
    const dbReader = await prisma.sumUpReader.findUnique({
      where: { sumupReaderId: readerId },
    })

    // Obtener API keys del local (si tiene propias)
    const localKeys = await getLocalSumUpKeys(localId)

    // 1. Enviar el cobro DIRECTAMENTE al terminal (Cloud API).
    // La Cloud API inicia el cobro en el datáfono con el IMPORTE y DEVUELVE el
    // checkout_id real + client_transaction_id. Ya no se crea un checkout previo
    // aparte (eso provocaba el error "total_amount can't be blank" y un checkout
    // fantasma). Así el importe aparece en la pantalla del terminal al instante.
    console.log(`Enviando cobro al terminal ${readerId}: ${amount}€ - ${description} - Local: ${local?.nombre}`)
    const readerResult = await initiateReaderPayment(
      readerId,
      amount,
      description || 'Cobro ServyAuto',
      localKeys.apiKey
    )
    const realCheckoutId = readerResult.checkout_id || randomUUID()
    console.log('Cobro iniciado en terminal, checkout_id:', realCheckoutId)

    // 2. Registrar transacción en nuestra BD con el checkout_id REAL del terminal
    // y el client_transaction_id (necesario para consultar su estado después).
    const transaction = await prisma.sumUpTransaction.create({
      data: {
        checkoutId: realCheckoutId,
        clientTransactionId: readerResult.client_transaction_id || null,
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

    return NextResponse.json({
      checkoutId: realCheckoutId,
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
