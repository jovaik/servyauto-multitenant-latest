
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { enviarNotificacionVehiculoListo } from '@/lib/notifications'
import { syncFactura, syncTicket } from '@/lib/gscontrol-sync'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const {
      fecha,
      horaInicio,
      horaFin,
      box,
      estado,
      observaciones,
      metodoPago,
      servicios,
    } = body

    console.log('=== INICIO ACTUALIZACIÓN CITA ===')
    console.log('Cita ID:', params.id)
    console.log('Body completo:', JSON.stringify(body, null, 2))
    console.log('metodoPago:', metodoPago, 'tipo:', typeof metodoPago, 'es null:', metodoPago === null, 'es undefined:', metodoPago === undefined)

    // Verificar si la cita existe
    const citaExistente = await prisma.cita.findUnique({
      where: { id: params.id },
    })

    if (!citaExistente) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      )
    }

    // Calcular nuevo precio final si hay servicios
    let precioFinal = citaExistente.total
    if (servicios && servicios.length > 0) {
      const serviciosData = await prisma.servicio.findMany({
        where: {
          id: { in: servicios.map((s: any) => s.servicioId) },
        },
      })
      
      precioFinal = serviciosData.reduce((sum, servicio) => sum + servicio.precio, 0)
      
      // Aplicar descuento de parking si el cliente es abonado
      const cliente = await prisma.cliente.findUnique({
        where: { id: citaExistente.clienteId },
        select: { clienteParking: true }
      })

      if (cliente?.clienteParking) {
        // Obtener el descuento configurado
        const descuentoConfig = await prisma.configuracion.findUnique({
          where: { clave: 'precios.descuentoParking' }
        })
        
        const tipoDescuentoConfig = await prisma.configuracion.findUnique({
          where: { clave: 'precios.descuentoParkingTipo' }
        })

        if (descuentoConfig) {
          const valorDescuento = parseFloat(descuentoConfig.valor) || 0
          const tipoDescuento = tipoDescuentoConfig?.valor || 'FIJO'

          if (tipoDescuento === 'FIJO') {
            // Descuento fijo en euros
            precioFinal = Math.max(0, precioFinal - valorDescuento)
          } else {
            // Descuento porcentual
            const descuento = (precioFinal * valorDescuento) / 100
            precioFinal = Math.max(0, precioFinal - descuento)
          }
          
          console.log(`Descuento de parking aplicado en actualización: ${tipoDescuento === 'FIJO' ? valorDescuento + '€' : valorDescuento + '%'} - Total final: €${precioFinal}`)
        }
      }
    }

    // Preparar datos de actualización
    const updateData: any = {}
    
    if (fecha) updateData.fecha = new Date(fecha)
    if (horaInicio) updateData.horaInicio = horaInicio
    if (horaFin) updateData.horaFin = horaFin
    if (box) updateData.box = box
    if (estado) updateData.estado = estado
    if (observaciones !== undefined) updateData.observaciones = observaciones
    
    // Manejar metodoPago: si es undefined se envía como null a Prisma
    if (metodoPago !== undefined) {
      updateData.metodoPago = metodoPago || null
    }
    
    if (precioFinal !== undefined) updateData.total = precioFinal

    console.log('=== DATOS PREPARADOS PARA PRISMA ===')
    console.log('Update data:', JSON.stringify(updateData, null, 2))
    console.log('Cantidad de campos:', Object.keys(updateData).length)

    // Verificar que hay datos para actualizar
    if (Object.keys(updateData).length === 0) {
      console.log('ERROR: No hay datos para actualizar')
      return NextResponse.json(
        { error: 'No hay datos para actualizar' },
        { status: 400 }
      )
    }

    console.log('=== EJECUTANDO PRISMA UPDATE ===')
    // Actualizar la cita
    const cita = await prisma.cita.update({
      where: { id: params.id },
      data: updateData,
      include: {
        cliente: true,
        vehiculo: true,
        cita_servicios: {
          include: {
            servicios: true
          }
        },
        facturas: true,
      },
    })

    console.log('=== ACTUALIZACIÓN EXITOSA ===')
    console.log('Cita actualizada:', cita.id)
    
    // Si la cita se marca como COMPLETADA y ya tiene una factura asociada, marcarla como PAGADA
    // IMPORTANTE: Por defecto las facturas se marcan como pagadas cuando se entrega el vehículo
    if (estado === 'COMPLETADA' && cita.facturas) {
      console.log('=== MARCANDO FACTURA COMO PAGADA (por defecto al entregar vehículo) ===')
      console.log('Factura ID:', cita.facturas.id)
      
      const facturaUpdateData: any = { 
        estado: 'PAGADA'
      }
      
      // Actualizar también el método de pago si está especificado
      if (metodoPago) {
        facturaUpdateData.metodoPago = metodoPago
      }
      
      const facturaActualizada = await prisma.factura.update({
        where: { id: cita.facturas.id },
        data: facturaUpdateData,
        include: {
          cliente: true
        }
      })
      
      console.log('=== FACTURA MARCADA COMO PAGADA ===')
      
      // 🔄 SINCRONIZAR CON GSCONTROL cuando se paga la factura
      console.log('📤 Iniciando sincronización de factura pagada con GSControl...')
      console.log(`Factura: ${facturaActualizada.numero}, Total: ${facturaActualizada.total}`)
      
      syncFactura({
        id: facturaActualizada.id,
        numeroFactura: facturaActualizada.numero,
        fecha: facturaActualizada.createdAt || new Date(),
        total: facturaActualizada.total,
        iva: 21,
        cliente: facturaActualizada.cliente,
        servicios: cita.cita_servicios?.map((cs: any) => ({
          nombre: cs.servicios.nombre,
          precio: cs.servicios.precio
        }))
      }).then(result => {
        if (result.success) {
          console.log('✅ Factura pagada sincronizada con GSControl exitosamente');
        } else {
          console.error('⚠️ Error en sincronización de factura pagada:', result.message, result.error);
        }
      }).catch(err => {
        console.error('Error sincronizando factura pagada:', err)
      })
    }
    
    // Si la cita se marca como COMPLETADA y no tiene factura, crear una automáticamente
    if (estado === 'COMPLETADA' && !cita.facturas) {
      console.log('=== CREANDO FACTURA/TICKET AUTOMÁTICA ===')
      console.log('Método de pago:', cita.metodoPago)
      
      // Determinar tipo según método de pago
      // EFECTIVO o TPV_SUMUP → TICKET
      // TPV_UNICAJA → FACTURA
      const esTicket = cita.metodoPago === 'EFECTIVO' || cita.metodoPago === 'TPV_SUMUP'
      const tipoDocumento = esTicket ? 'TICKET' : 'FACTURA'
      const prefijo = esTicket ? 'TICK' : 'FAC'
      
      console.log('Tipo de documento:', tipoDocumento, '- Prefijo:', prefijo)
      
      // Generar número de documento
      const año = new Date().getFullYear()
      
      const ultimoDocumento = await prisma.factura.findFirst({
        where: { 
          numero: {
            startsWith: `${prefijo}-${año}-`
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      let numeroSecuencia = 1
      if (ultimoDocumento) {
        const partes = ultimoDocumento.numero.split('-')
        if (partes.length === 3 && partes[0] === prefijo) {
          const ultimoNumero = parseInt(partes[2]) || 0
          numeroSecuencia = ultimoNumero + 1
        }
      }

      const numeroDocumento = `${prefijo}-${año}-${numeroSecuencia.toString().padStart(4, '0')}`
      
      console.log('Número de documento generado:', numeroDocumento)
      
      // Calcular subtotal e IVA
      const total = cita.total || 0
      const subtotal = total / 1.21  // Asumiendo 21% de IVA
      const iva = total - subtotal
      
      // Crear el documento (factura o ticket)
      // IMPORTANTE: Al crear la factura cuando se entrega el vehículo, se marca como PAGADA por defecto
      const factura = await prisma.factura.create({
        data: {
          numero: numeroDocumento,
          tipo: tipoDocumento,
          estado: 'PAGADA', // Por defecto se marca como pagada al entregar el vehículo
          subtotal: Math.round(subtotal * 100) / 100,
          iva: Math.round(iva * 100) / 100,
          total: total,
          metodoPago: cita.metodoPago,
          clienteId: cita.clienteId,
          citaId: cita.id,
        }
      })
      
      // Crear los items de la factura basados en los servicios de la cita
      if (cita.cita_servicios && cita.cita_servicios.length > 0) {
        const facturaItems = cita.cita_servicios.map((cs: any, index: number) => ({
          id: `${factura.id}_item_${index}`,
          facturaId: factura.id,
          descripcion: cs.servicios.nombre,
          cantidad: 1,
          precio: cs.servicios.precio,
          total: cs.servicios.precio,
        }))
        
        await prisma.factura_items.createMany({
          data: facturaItems
        })
      }
      
      console.log('=== DOCUMENTO CREADO ===')
      console.log('Tipo:', tipoDocumento)
      console.log('Número:', numeroDocumento)
      console.log('Total:', total)
      
      // 🔄 SINCRONIZAR CON GSCONTROL (factura o ticket desde cita completada)
      console.log('📤 Iniciando sincronización con GSControl...')
      console.log(`Tipo: ${tipoDocumento}, Total: ${total}`)
      
      if (tipoDocumento === 'FACTURA') {
        syncFactura({
          id: factura.id,
          numeroFactura: numeroDocumento,
          fecha: factura.createdAt || new Date(),
          total: total,
          iva: 21,
          cliente: cita.cliente,
          servicios: cita.cita_servicios?.map((cs: any) => ({
            nombre: cs.servicios.nombre,
            precio: cs.servicios.precio
          }))
        }).then(result => {
          if (result.success) {
            console.log('✅ Factura de cita sincronizada con GSControl exitosamente');
          } else {
            console.error('⚠️ Error en sincronización de factura:', result.message, result.error);
          }
        }).catch(err => {
          console.error('❌ Error crítico sincronizando factura:', err)
        })
      } else {
        syncTicket({
          id: factura.id,
          fecha: factura.createdAt || new Date(),
          total: total,
          estado: 'COBRADO',
          servicios: cita.cita_servicios?.map((cs: any) => ({
            nombre: cs.servicios.nombre,
            precio: cs.servicios.precio
          }))
        }).then(result => {
          if (result.success) {
            console.log('✅ Ticket de cita sincronizado con GSControl exitosamente');
          } else {
            console.error('⚠️ Error en sincronización de ticket:', result.message, result.error);
          }
        }).catch(err => {
          console.error('❌ Error crítico sincronizando ticket:', err)
        })
      }
    }
    
    // Enviar notificación automática cuando se marca como COMPLETADA
    if (estado === 'COMPLETADA') {
      try {
        console.log('=== ENVIANDO NOTIFICACIÓN AUTOMÁTICA ===')
        console.log('Cliente:', cita.cliente.nombre)
        console.log('Teléfono:', cita.cliente.telefono)
        console.log('Vehículo:', `${cita.vehiculo.marca} ${cita.vehiculo.modelo} - ${cita.vehiculo.matricula}`)
        console.log('Total:', cita.total)
        
        const notificationResult = await enviarNotificacionVehiculoListo({
          clienteName: cita.cliente.nombre,
          vehiculo: `${cita.vehiculo.marca} ${cita.vehiculo.modelo} - ${cita.vehiculo.matricula}`,
          total: cita.total || 0,
          telefono: cita.cliente.telefono
        })
        
        if (notificationResult.success) {
          if (notificationResult.whatsappSent) {
            console.log('✅ Notificación enviada por WhatsApp exitosamente')
          } else if (notificationResult.smsSent) {
            console.log('✅ Notificación enviada por SMS exitosamente')
          }
        } else {
          console.warn('⚠️ No se pudo enviar la notificación:', notificationResult.error)
        }
      } catch (notificationError) {
        // No fallar la actualización si falla la notificación
        console.error('❌ Error enviando notificación:', notificationError)
      }
    }
    
    return NextResponse.json(cita)
  } catch (error: any) {
    console.error('=== ERROR EN ACTUALIZACIÓN ===')
    console.error('Error completo:', error)
    console.error('Error message:', error.message)
    console.error('Error code:', error.code)
    console.error('Error meta:', error.meta)
    console.error('Error name:', error.name)
    
    // Si es un error de Prisma, mostrar más detalles
    if (error.code) {
      console.error('Es un error de Prisma con código:', error.code)
    }
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error.message,
        code: error.code,
        details: error.meta
      },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar si la cita existe
    const citaExistente = await prisma.cita.findUnique({
      where: { id: params.id },
    })

    if (!citaExistente) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar la cita y sus servicios relacionados
    await prisma.cita.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Cita eliminada correctamente' })
  } catch (error) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
