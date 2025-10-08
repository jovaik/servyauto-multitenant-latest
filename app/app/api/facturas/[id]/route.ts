
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
        cita: {
          include: {
            vehiculo: true,
            servicios: {
              include: {
                servicio: true
              }
            }
          }
        },
        
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
    const { estado, metodoPago, datosFacturacion, items } = body

    // Si se están actualizando los items, recalcular totales
    let updateData: any = {
      estado,
      metodoPago,
      datosFacturacion: datosFacturacion ? JSON.stringify(datosFacturacion) : undefined
    }

    if (items && Array.isArray(items)) {
      // Calcular nuevos totales
      const subtotal = items.reduce((sum: number, item: any) => sum + (item.cantidad * item.precio), 0)
      const iva = subtotal * 0.21
      const total = subtotal + iva

      updateData = {
        ...updateData,
        subtotal,
        iva,
        total
      }
    }

    // Usar transacción para actualizar factura e items si es necesario
    const factura = await prisma.$transaction(async (tx) => {
      // Actualizar factura
      const facturaActualizada = await tx.factura.update({
        where: { id: params.id },
        data: updateData,
        include: {
          cliente: true,
          
        }
      })

      // Si se están actualizando los items
      if (items && Array.isArray(items)) {
        // Eliminar items existentes
        await tx.facturaItem.deleteMany({
          where: { facturaId: params.id }
        })

        // Crear nuevos items
        await tx.facturaItem.createMany({
          data: items.map((item: any) => ({
            facturaId: params.id,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio: item.precio,
            total: item.cantidad * item.precio
          }))
        })

        // Obtener factura con items actualizados
        return await tx.factura.findUnique({
          where: { id: params.id },
          include: {
            cliente: true,
            
          }
        })
      }

      return facturaActualizada
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
