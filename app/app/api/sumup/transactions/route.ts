import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext } from '@/lib/local-context'

// GET - Listar transacciones (filtradas por local)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const localId = searchParams.get('localId')
    const status = searchParams.get('status')

    // Construir filtro de fechas
    const dateFilter: any = {}
    if (desde) {
      dateFilter.gte = new Date(desde)
    }
    if (hasta) {
      const hastaDate = new Date(hasta)
      hastaDate.setHours(23, 59, 59, 999)
      dateFilter.lte = hastaDate
    }

    // Obtener contexto local
    const localContext = await getLocalContext()

    // Construir where
    const where: any = {}
    
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter
    }
    
    if (status) {
      where.status = status
    }

    // Si se especifica un localId específico, usarlo. Si no, usar el filtro del contexto
    if (localId) {
      where.localId = localId
    } else if (localContext?.selectedLocalId) {
      where.localId = localContext.selectedLocalId
    }

    const transactions = await prisma.sumUpTransaction.findMany({
      where,
      include: {
        local: true,
        reader: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Últimas 100 transacciones
    })

    // Calcular totales
    const totales = {
      total: 0,
      pagadas: 0,
      pendientes: 0,
      fallidas: 0,
      canceladas: 0,
    }

    transactions.forEach((t) => {
      if (t.status === 'PAID') {
        totales.pagadas += t.amount
        totales.total += t.amount
      } else if (t.status === 'PENDING') {
        totales.pendientes += t.amount
      } else if (t.status === 'FAILED') {
        totales.fallidas += t.amount
      } else if (t.status === 'CANCELLED') {
        totales.canceladas += t.amount
      }
    })

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        checkoutId: t.checkoutId,
        amount: t.amount,
        status: t.status,
        transactionCode: t.transactionCode,
        description: t.description,
        reference: t.reference,
        localNombre: t.local?.nombre,
        readerNombre: t.reader?.nombre,
        creadoPorNombre: t.creadoPorNombre,
        createdAt: t.createdAt,
      })),
      totales,
    })
  } catch (error: any) {
    console.error('Error listando transacciones SumUp:', error)
    return NextResponse.json(
      { error: error.message || 'Error al listar transacciones' },
      { status: 500 }
    )
  }
}
