import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notificarModificacionGSControl, notificarEliminacionGSControl, mapearCategoriaGasto } from '@/lib/gscontrol-sync'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const servicio = await prisma.servicioTaller.findUnique({
      where: { id: params.id },
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
    console.log('Datos recibidos para actualizar servicio:', body)
    
    const { 
      concepto,
      fecha,
      tipoGasto,
      costeProducto,
      costeManoObra,
      precioProducto,
      precioManoObra,
      metodoPago,
      tipo,
      iva,
      numeroFactura,
      clienteCIF,
      clienteDireccion,
      clienteCodigoPostal,
      clienteCiudad,
      clienteProvincia
    } = body

    // Validar campos requeridos
    if (!concepto || !fecha || !tipoGasto || !metodoPago) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: concepto, fecha, tipoGasto, metodoPago' },
        { status: 400 }
      )
    }

    // Calcular totales
    const costoProductoNum = parseFloat(costeProducto) || 0
    const costoManoObraNum = parseFloat(costeManoObra) || 0
    const precioProductoNum = parseFloat(precioProducto) || 0
    const precioManoObraNum = parseFloat(precioManoObra) || 0
    
    const importeTotal = precioProductoNum + precioManoObraNum
    const margen = precioProductoNum - costoProductoNum

    // Si es FACTURA, validar campos fiscales adicionales
    if (tipo === 'FACTURA') {
      if (!numeroFactura || !clienteCIF || !clienteDireccion || 
          !clienteCodigoPostal || !clienteCiudad || !clienteProvincia) {
        return NextResponse.json(
          { error: 'Para facturas se requieren todos los datos fiscales del cliente' },
          { status: 400 }
        )
      }
    }

    const servicio = await prisma.servicioTaller.update({
      where: { id: params.id },
      data: {
        concepto,
        fecha: new Date(fecha),
        tipoGasto,
        costeProducto: costoProductoNum,
        costeManoObra: costoManoObraNum,
        precioProducto: precioProductoNum,
        precioManoObra: precioManoObraNum,
        importe: importeTotal,
        margen: margen,
        metodoPago: metodoPago as any,
        tipo: tipo || 'TICKET',
        iva: parseFloat(iva) || 21,
        numeroFactura: numeroFactura || null,
        clienteCIF: clienteCIF || null,
        clienteDireccion: clienteDireccion || null,
        clienteCodigoPostal: clienteCodigoPostal || null,
        clienteCiudad: clienteCiudad || null,
        clienteProvincia: clienteProvincia || null
      },
      include: {
        cliente: true,
        vehiculo: true
      }
    })

    console.log('Servicio actualizado exitosamente:', servicio.id)

    // 🔄 SINCRONIZAR MODIFICACIÓN CON GSCONTROL como INGRESO
    const descripcionServicio = `${servicio.concepto} - ${servicio.cliente.nombre} ${servicio.cliente.apellido || ''} (${servicio.vehiculo.matricula})`
    const categoriaGSControl = mapearCategoriaGasto(servicio.tipoGasto)
    
    await notificarModificacionGSControl({
      id: servicio.id,
      esIngreso: true, // ⭐ ESTO ES UN INGRESO
      fecha: servicio.fecha,
      importe: servicio.importe,
      descripcion: descripcionServicio,
      costCategory: categoriaGSControl
    })

    return NextResponse.json(servicio)
  } catch (error) {
    console.error('Error updating servicio:', error)
    return NextResponse.json(
      { error: 'Error al actualizar servicio: ' + (error as Error).message },
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

    // Obtener el servicio antes de eliminarlo (para sincronizar)
    const servicio = await prisma.servicioTaller.findUnique({
      where: { id: params.id },
      include: {
        factura: true
      }
    })

    if (!servicio) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })
    }

    // Si tiene factura asociada, eliminarla primero
    if (servicio.facturaId && servicio.factura) {
      await prisma.$executeRaw`DELETE FROM factura_items WHERE "facturaId" = ${servicio.facturaId}`
      await prisma.factura.delete({
        where: { id: servicio.facturaId }
      })
    }

    // 🔄 SINCRONIZAR ELIMINACIÓN CON GSCONTROL
    await notificarEliminacionGSControl(servicio.id)

    await prisma.servicioTaller.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Servicio eliminado' })
  } catch (error) {
    console.error('Error deleting servicio:', error)
    return NextResponse.json({ error: 'Error al eliminar servicio' }, { status: 500 })
  }
}
