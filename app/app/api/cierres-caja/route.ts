
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const cierres = await prisma.cierreCaja.findMany({
      orderBy: {
        fechaFin: 'desc'
      }
    })

    return NextResponse.json(cierres)
  } catch (error) {
    console.error('Error fetching cierres:', error)
    return NextResponse.json({ error: 'Error al obtener cierres' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = (session.user as any).id
    
    if (!userId) {
      return NextResponse.json({ error: 'Usuario inválido. Por favor, cierra sesión y vuelve a iniciar sesión.' }, { status: 401 })
    }

    const body = await request.json()
    const { fechaInicio, fechaFin, observaciones } = body

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json(
        { error: 'Fechas de inicio y fin son requeridas' },
        { status: 400 }
      )
    }

    // Calcular totales de ventas (facturas pagadas)
    const facturas = await prisma.factura.findMany({
      where: {
        fecha: {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin)
        },
        estado: 'PAGADA'
      }
    })

    const totalEfectivo = facturas
      .filter(f => f.metodoPago === 'EFECTIVO')
      .reduce((sum, f) => sum + f.total, 0)

    const totalTPVSumup = facturas
      .filter(f => f.metodoPago === 'TPV_SUMUP')
      .reduce((sum, f) => sum + f.total, 0)

    const totalTPVUnicaja = facturas
      .filter(f => f.metodoPago === 'TPV_UNICAJA')
      .reduce((sum, f) => sum + f.total, 0)

    // Calcular totales de gastos
    const gastos = await prisma.gasto.findMany({
      where: {
        fecha: {
          gte: new Date(fechaInicio),
          lte: new Date(fechaFin)
        }
      }
    })

    const gastosEfectivo = gastos
      .filter(g => g.metodoPago === 'EFECTIVO')
      .reduce((sum, g) => sum + g.importe, 0)

    const gastosTarjeta = gastos
      .filter(g => g.metodoPago === 'TPV_SUMUP' || g.metodoPago === 'TPV_UNICAJA')
      .reduce((sum, g) => sum + g.importe, 0)

    const efectivoFinal = totalEfectivo - gastosEfectivo

    // Crear el cierre de caja
    const cierre = await prisma.cierreCaja.create({
      data: {
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        totalEfectivo,
        totalTPVSumup,
        totalTPVUnicaja,
        gastosEfectivo,
        gastosTarjeta,
        efectivoFinal,
        observaciones: observaciones || null,
        usuarioId: userId
      }
    })

    return NextResponse.json(cierre, { status: 201 })
  } catch (error) {
    console.error('Error creating cierre:', error)
    return NextResponse.json(
      { error: 'Error al crear cierre: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
