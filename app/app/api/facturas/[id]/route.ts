
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notificarModificacionGSControl, notificarEliminacionGSControl } from '@/lib/gscontrol-sync'
import { enviarSolicitudResena } from '@/lib/notifications'

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
        factura_items: true,
      }
    })

    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      )
    }

    // Transformar los datos para el frontend
    const facturaConItems = {
      ...factura,
      items: factura.factura_items || []
    }

    return NextResponse.json(facturaConItems)
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
    const { estado, metodoPago, pagada, observaciones, subtotal, iva, total, items, clienteId } = body

    console.log('=== ACTUALIZANDO FACTURA ===')
    console.log('Factura ID:', params.id)
    console.log('Body completo:', JSON.stringify(body, null, 2))

    // Preparar datos de actualización
    const updateData: any = {}
    
    if (estado !== undefined) updateData.estado = estado
    if (metodoPago !== undefined) updateData.metodoPago = metodoPago
    if (pagada !== undefined) updateData.pagada = pagada
    if (observaciones !== undefined) updateData.observaciones = observaciones
    if (subtotal !== undefined) updateData.subtotal = subtotal
    if (iva !== undefined) updateData.iva = iva
    if (total !== undefined) updateData.total = total
    
    // Cambio de cliente (para facturar a terceros/empresas)
    if (clienteId !== undefined) {
      console.log('=== CAMBIANDO CLIENTE ===')
      console.log('Nuevo clienteId:', clienteId)
      updateData.clienteId = clienteId
    }

    // Si hay items, actualizar los items de la factura
    if (items && Array.isArray(items) && items.length > 0) {
      console.log('=== ACTUALIZANDO ITEMS ===')
      console.log('Cantidad de items:', items.length)

      // Primero eliminar todos los items existentes
      await prisma.factura_items.deleteMany({
        where: { facturaId: params.id }
      })

      // Crear los nuevos items
      const itemsData = items.map((item: any, index: number) => ({
        id: `${params.id}_item_${index}`,
        facturaId: params.id,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio: item.precio,
        total: item.cantidad * item.precio,
      }))

      await prisma.factura_items.createMany({
        data: itemsData
      })

      // Recalcular totales basándose en los items
      // Los precios ya incluyen IVA, hay que desglosarlo
      const nuevoTotal = itemsData.reduce((sum: number, item: any) => sum + item.total, 0)
      const nuevoSubtotal = nuevoTotal / 1.21  // Base imponible (desglosando IVA 21%)
      const nuevoIva = nuevoTotal - nuevoSubtotal  // IVA desglosado

      updateData.subtotal = Math.round(nuevoSubtotal * 100) / 100
      updateData.iva = Math.round(nuevoIva * 100) / 100
      updateData.total = Math.round(nuevoTotal * 100) / 100

      console.log('Nuevos totales calculados:', {
        subtotal: updateData.subtotal,
        iva: updateData.iva,
        total: updateData.total
      })
    }

    // Actualizar factura
    const factura = await prisma.factura.update({
      where: { id: params.id },
      data: updateData,
      include: {
        cliente: true,
        factura_items: true,
      }
    })

    console.log('=== FACTURA ACTUALIZADA ===')

    // ℹ️ NOTA: La solicitud de reseña se envía desde las CITAS cuando se marcan como COMPLETADA
    // (porque completar = el cliente ya pagó y recogió su vehículo)

    // 🔄 SINCRONIZAR MODIFICACIÓN CON GSCONTROL - CÓDIGO ACTUALIZADO 31/10/2025
    const descripcionFactura = `${factura.tipo}: ${factura.numero} - ${factura.cliente.nombre} ${factura.cliente.apellido || ''}`
    const clienteNombreCompleto = `${factura.cliente.nombre} ${factura.cliente.apellido || ''}`.trim()
    
    await notificarModificacionGSControl({
      id: factura.id,
      esIngreso: true,
      fecha: factura.createdAt,
      importe: factura.total,
      descripcion: descripcionFactura,
      // Nuevos campos según PDF
      documentType: factura.tipo, // "FACTURA" o "TICKET"
      invoiceNumber: factura.tipo === 'FACTURA' ? factura.numero : undefined,
      clientName: clienteNombreCompleto || undefined,
      clientDni: factura.cliente.documento || undefined
    })

    // Transformar los datos para el frontend
    const facturaConItems = {
      ...factura,
      items: factura.factura_items || []
    }

    return NextResponse.json(facturaConItems)
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

    // 🔄 SINCRONIZAR ELIMINACIÓN CON GSCONTROL - CÓDIGO EXACTO DEL PDF
    await notificarEliminacionGSControl(factura.id)

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
