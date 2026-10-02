import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getCheckoutStatus,
  getReaderTransactionStatus,
  cancelCheckout,
  terminateReaderTransaction,
  getLocalSumUpKeys,
} from '@/lib/sumup'
import { prisma } from '@/lib/db'
import { requireSuperAdminForDelete } from '@/lib/activity-logger'

// Concilia el pago: marca la cita y/o factura como pagadas con TPV_SUMUP.
async function reconcile({
  citaId,
  facturaId,
}: {
  citaId?: string | null
  facturaId?: string | null
}) {
  try {
    if (citaId) {
      await prisma.cita.update({
        where: { id: citaId },
        data: { metodoPago: 'TPV_SUMUP' },
      })
    }
  } catch (e) {
    console.error('Error conciliando cita SumUp:', e)
  }
  try {
    if (facturaId) {
      await prisma.factura.update({
        where: { id: facturaId },
        data: { metodoPago: 'TPV_SUMUP', estado: 'PAGADA' },
      })
    }
  } catch (e) {
    console.error('Error conciliando factura SumUp:', e)
  }
}

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

    // Buscar la transacción: necesitamos localId (para la API key),
    // client_transaction_id (para consultar el cobro de terminal) y los
    // vínculos cita/factura (para conciliar al pagar).
    const dbTxn = await prisma.sumUpTransaction.findFirst({
      where: { checkoutId: params.id },
      select: {
        localId: true,
        clientTransactionId: true,
        amount: true,
        citaId: true,
        facturaId: true,
      },
    })
    const localKeys = await getLocalSumUpKeys(dbTxn?.localId)

    // Los cobros iniciados en el terminal (Cloud API) NO se consultan por
    // /checkouts/{id} (devuelve NOT_FOUND). Hay que consultarlos por
    // client_transaction_id en /me/transactions.
    let checkout: any = null
    if (dbTxn?.clientTransactionId) {
      checkout = await getReaderTransactionStatus(
        dbTxn.clientTransactionId,
        localKeys.apiKey
      )
      // Aún no hay transacción registrada en SumUp (el cliente no ha pagado):
      // devolvemos PENDING sin error.
      if (!checkout) {
        return NextResponse.json({
          id: params.id,
          status: 'PENDING',
          amount: dbTxn?.amount ?? null,
          transactionCode: null,
          transactionId: null,
        })
      }
    } else {
      checkout = await getCheckoutStatus(params.id, localKeys.apiKey)
    }

    // Actualizar estado en nuestra BD
    if (
      checkout.status === 'PAID' ||
      checkout.status === 'FAILED' ||
      checkout.status === 'CANCELLED'
    ) {
      await prisma.sumUpTransaction.updateMany({
        where: { checkoutId: params.id },
        data: {
          status: checkout.status,
          transactionCode:
            checkout.transaction_code || checkout.transaction_id || null,
        },
      })

      // Al pagar, conciliar la cita/factura asociada.
      if (checkout.status === 'PAID') {
        await reconcile({ citaId: dbTxn?.citaId, facturaId: dbTxn?.facturaId })
      }
    }

    return NextResponse.json({
      id: checkout.id || params.id,
      status: checkout.status,
      amount: checkout.amount ?? dbTxn?.amount ?? null,
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

// DELETE - Cancelar checkout / cobro en terminal
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardResponse = await requireSuperAdminForDelete()
    if (guardResponse) return guardResponse

    // Buscar la transacción para saber qué API key usar y si es cobro de terminal
    const dbTxn = await prisma.sumUpTransaction.findFirst({
      where: { checkoutId: params.id },
      include: { reader: true },
    })
    const localKeys = await getLocalSumUpKeys(dbTxn?.localId)

    // Si es un cobro iniciado en el terminal, se aborta en el propio datáfono.
    if (dbTxn?.clientTransactionId && dbTxn.reader?.sumupReaderId) {
      await terminateReaderTransaction(
        dbTxn.reader.sumupReaderId,
        localKeys.apiKey
      )
    } else {
      await cancelCheckout(params.id, localKeys.apiKey)
    }

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
