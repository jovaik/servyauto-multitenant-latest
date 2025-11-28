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

    const servicio = await prisma.servicioRapido.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            telefono: true,
            email: true
          }
        },
        vehiculo: {
          select: {
            id: true,
            marca: true,
            modelo: true,
            matricula: true
          }
        },
        factura: {
          select: {
            id: true,
            numero: true,
            tipo: true,
            total: true,
            estado: true,
            metodoPago: true
          }
        }
      }
    })

    if (!servicio) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(servicio)
  } catch (error) {
    console.error('Error fetching servicio:', error)
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
    console.log('Actualizando servicio:', params.id, body)

    const {
      concepto,
      costeProducto,
      precioProducto,
      precioManoObra
    } = body

    // Validar campos requeridos
    if (!concepto || concepto.trim() === '') {
      return NextResponse.json(
        { error: 'El concepto es requerido' },
        { status: 400 }
      )
    }

    // Calcular totales
    const total = parseFloat(precioProducto) + parseFloat(precioManoObra)
    const margen = parseFloat(precioProducto) - parseFloat(costeProducto)
    const totalConIva = total * 1.21  // IVA 21%

    // Actualizar servicio
    const servicio = await prisma.servicioRapido.update({
      where: { id: parseInt(params.id) },
      data: {
        concepto,
        costeProducto: parseFloat(costeProducto),
        precioProducto: parseFloat(precioProducto),
        precioManoObra: parseFloat(precioManoObra),
        total,
        margen,
        totalConIva
      },
      include: {
        cliente: true,
        vehiculo: true,
        factura: true
      }
    })

    // Si ya tiene factura asociada, actualizar los items de la factura
    if (servicio.facturaId) {
      // Primero eliminar items existentes
      await prisma.$executeRaw`DELETE FROM factura_items WHERE "facturaId" = ${servicio.facturaId}`

      // Calcular totales de factura
      const subtotal = total / 1.21
      const iva = total - subtotal

      // Actualizar factura
      await prisma.factura.update({
        where: { id: servicio.facturaId },
        data: {
          subtotal,
          iva,
          total: totalConIva,
          factura_items: {
            create: [
              {
                id: `${servicio.factura?.numero}-1`,
                descripcion: concepto,
                cantidad: 1,
                precio: parseFloat(precioProducto),
                total: parseFloat(precioProducto)
              },
              ...(parseFloat(precioManoObra) > 0 ? [{
                id: `${servicio.factura?.numero}-2`,
                descripcion: 'Mano de obra',
                cantidad: 1,
                precio: parseFloat(precioManoObra),
                total: parseFloat(precioManoObra)
              }] : [])
            ]
          }
        }
      })
    }

    console.log('Servicio actualizado exitosamente:', servicio.id)

    return NextResponse.json(servicio)
  } catch (error: any) {
    console.error('Error updating servicio:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el servicio', details: error.message },
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

    console.log('Eliminando servicio:', params.id)

    // Buscar el servicio
    const servicio = await prisma.servicioRapido.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        factura: true
      }
    })

    if (!servicio) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      )
    }

    // Si tiene factura asociada, eliminar la factura primero
    if (servicio.facturaId) {
      // Eliminar items de factura
      await prisma.$executeRaw`DELETE FROM factura_items WHERE "facturaId" = ${servicio.facturaId}`
      
      // Eliminar factura
      await prisma.factura.delete({
        where: { id: servicio.facturaId }
      })
    }

    // Eliminar el servicio
    await prisma.servicioRapido.delete({
      where: { id: parseInt(params.id) }
    })

    console.log('Servicio eliminado exitosamente:', params.id)

    return NextResponse.json({ 
      success: true, 
      message: 'Servicio eliminado correctamente' 
    })
  } catch (error: any) {
    console.error('Error deleting servicio:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el servicio', details: error.message },
      { status: 500 }
    )
  }
}
