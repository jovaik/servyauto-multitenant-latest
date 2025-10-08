
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const factura = await prisma.factura.findUnique({
      where: { id: params.id },
      include: {
        cliente: true,
      }
    })

    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(factura)
  } catch (error) {
    console.error('Error fetching factura:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

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
    const { metodoPago, pagada, observaciones, subtotal, iva, total } = body

    // Preparar datos de actualización
    const updateData: any = {}
    
    if (metodoPago !== undefined) updateData.metodoPago = metodoPago
    if (pagada !== undefined) updateData.pagada = pagada
    if (observaciones !== undefined) updateData.observaciones = observaciones
    if (subtotal !== undefined) updateData.subtotal = subtotal
    if (iva !== undefined) updateData.iva = iva
    if (total !== undefined) updateData.total = total

    // Actualizar factura
    const factura = await prisma.factura.update({
      where: { id: params.id },
      data: updateData,
      include: {
        cliente: true,
      }
    })

    return NextResponse.json(factura)
  } catch (error) {
    console.error('Error updating factura:', error)
    return NextResponse.json(
      { error: 'Error al actualizar la factura' },
      { status: 500 }
    )
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

    // Verificar que la factura existe
    const factura = await prisma.factura.findUnique({
      where: { id: params.id }
    })

    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar factura (los items se eliminan automáticamente por CASCADE)
    await prisma.factura.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Factura eliminada correctamente' })
  } catch (error) {
    console.error('Error deleting factura:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la factura' },
      { status: 500 }
    )
  }
}
