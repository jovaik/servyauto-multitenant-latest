
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { concepto, fecha, proveedor, tipoGasto, importe, metodoPago, tipo, iva } = body

    const gasto = await prisma.gasto.update({
      where: { id: params.id },
      data: {
        concepto,
        fecha: new Date(fecha),
        proveedor: proveedor || null,
        tipoGasto,
        importe: parseFloat(importe),
        metodoPago: metodoPago || 'EFECTIVO',
        tipo: tipo || 'TICKET',
        iva: parseFloat(iva) || 21
      }
    })

    return NextResponse.json(gasto)
  } catch (error) {
    console.error('Error updating gasto:', error)
    return NextResponse.json({ error: 'Error al actualizar gasto' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await prisma.gasto.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Gasto eliminado' })
  } catch (error) {
    console.error('Error deleting gasto:', error)
    return NextResponse.json({ error: 'Error al eliminar gasto' }, { status: 500 })
  }
}
