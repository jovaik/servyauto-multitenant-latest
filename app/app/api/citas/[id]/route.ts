
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { enviarNotificacionVehiculoListo, enviarSolicitudResena } from '@/lib/notifications'
import { notificarCreacionGSControl } from '@/lib/gscontrol-sync'

export const dynamic = 'force-dynamic'

// GET - Obtener una cita por ID con sus servicios
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const cita = await prisma.cita.findUnique({
      where: { id: params.id },
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

    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    return NextResponse.json(cita)
  } catch (error: any) {
    console.error('Error al obtener cita:', error)
    return NextResponse.json({ error: 'Error al obtener cita', message: error.message }, { status: 500 })
  }
}

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
      ticketsUsados,
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
      
      precioFinal = serviciosData.reduce((sum: number, servicio: any) => sum + servicio.precio, 0)
      
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
    if (ticketsUsados !== undefined) updateData.ticketsUsados = parseInt(ticketsUsados) || 0
    
    // Manejar metodoPago: si es undefined se envía como null a Prisma
    if (metodoPago !== undefined) {
      updateData.metodoPago = metodoPago || null
    }
    
    if (precioFinal !== undefined) updateData.total = precioFinal

    // Trazabilidad: guardar quién completó la cita
    if (estado === 'COMPLETADA' || estado === 'LISTO_PARA_RECOGER') {
      const userEmail = session?.user?.email || ''
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true, name: true }
      })
      updateData.completadoPorId = user?.id || null
      updateData.completadoPorNombre = user?.name || session?.user?.name || userEmail
    }

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
    
    // Si hay servicios, actualizar cita_servicios
    if (servicios && servicios.length > 0) {
      console.log('Actualizando servicios de la cita...')
      
      // Eliminar servicios existentes
      await prisma.cita_servicios.deleteMany({
        where: { citaId: params.id }
      })
      
      // Crear nuevos servicios
      for (const svc of servicios) {
        const uniqueId = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
        await prisma.cita_servicios.create({
          data: {
            id: uniqueId,
            citaId: params.id,
            servicioId: svc.servicioId,
            precio: svc.precio
          }
        })
      }
      
      console.log(`Servicios actualizados: ${servicios.length} servicios`)
      
      // ✅ ACTUALIZAR TAMBIÉN LA FACTURA/TICKET SI EXISTE
      const facturaExistente = await prisma.factura.findFirst({
        where: { citaId: params.id }
      })
      
      if (facturaExistente) {
        console.log('=== ACTUALIZANDO FACTURA EXISTENTE CON NUEVOS SERVICIOS ===')
        
        // Obtener nombres de servicios
        const serviciosInfo = await prisma.servicio.findMany({
          where: { id: { in: servicios.map((s: any) => s.servicioId) } }
        })
        
        // Eliminar items existentes de la factura
        await prisma.factura_items.deleteMany({
          where: { facturaId: facturaExistente.id }
        })
        
        // Crear nuevos items
        for (let i = 0; i < servicios.length; i++) {
          const svc = servicios[i]
          const servicioInfo = serviciosInfo.find((s: any) => s.id === svc.servicioId)
          const itemId = `fi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
          await prisma.factura_items.create({
            data: {
              id: itemId,
              facturaId: facturaExistente.id,
              cantidad: 1,
              descripcion: servicioInfo?.nombre || 'Servicio',
              precio: svc.precio,
              total: svc.precio
            }
          })
        }
        
        // Calcular totales - PRECIOS YA INCLUYEN IVA
        const total = servicios.reduce((sum: number, s: any) => sum + s.precio, 0)
        const subtotal = total / 1.21  // Base imponible
        const iva = total - subtotal   // IVA incluido en el precio
        
        // Actualizar factura
        await prisma.factura.update({
          where: { id: facturaExistente.id },
          data: {
            subtotal,
            iva,
            total
          }
        })
        
        console.log(`Factura ${facturaExistente.numero} actualizada: Total ${total}€`)
      }
    } else if (servicios && servicios.length === 0) {
      // Si se envía un array vacío, eliminar todos los servicios
      console.log('Eliminando todos los servicios de la cita...')
      await prisma.cita_servicios.deleteMany({
        where: { citaId: params.id }
      })
      updateData.total = 0
      
      // También actualizar la factura si existe
      const facturaExistente = await prisma.factura.findFirst({
        where: { citaId: params.id }
      })
      
      if (facturaExistente) {
        await prisma.factura_items.deleteMany({
          where: { facturaId: facturaExistente.id }
        })
        await prisma.factura.update({
          where: { id: facturaExistente.id },
          data: { subtotal: 0, iva: 0, total: 0 }
        })
        console.log(`Factura ${facturaExistente.numero} vaciada`)
      }
    }
    
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
      // NOTA: La sincronización se hace automáticamente desde el endpoint de facturas
      console.log('✅ Factura actualizada. Sincronización con GSControl se hace automáticamente.')
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
      // La fecha de la factura es la fecha de la cita (servicio), no la fecha de entrega
      const factura = await prisma.factura.create({
        data: {
          numero: numeroDocumento,
          tipo: tipoDocumento,
          fecha: cita.fecha, // Usar la fecha del servicio, no la fecha actual
          estado: 'PAGADA', // Por defecto se marca como pagada al entregar el vehículo
          subtotal: Math.round(subtotal * 100) / 100,
          iva: Math.round(iva * 100) / 100,
          total: total,
          metodoPago: cita.metodoPago,
          clienteId: cita.clienteId,
          citaId: cita.id,
          localId: cita.localId, // ✅ Asignar el local de la cita a la factura
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
      
      // Obtener datos del cliente para la sincronización
      const clienteNombreCompleto = `${cita.cliente.nombre} ${cita.cliente.apellido || ''}`.trim()
      const descripcionFactura = `${tipoDocumento}: ${numeroDocumento} - ${clienteNombreCompleto}`
      
      try {
        await notificarCreacionGSControl({
          id: factura.id,
          esIngreso: true,
          fecha: factura.createdAt,
          importe: factura.total,
          descripcion: descripcionFactura,
          documentType: tipoDocumento as 'FACTURA' | 'TICKET',
          invoiceNumber: tipoDocumento === 'FACTURA' ? numeroDocumento : undefined,
          clientName: clienteNombreCompleto || undefined,
          clientDni: cita.cliente.documento || undefined
        })
        console.log('✅ Sincronización con GSControl completada')
      } catch (gsError) {
        console.error('❌ Error sincronizando con GSControl:', gsError)
        // No bloqueamos la operación si falla GSControl
      }
    }
    
    // ⭐ GENERAR ENLACES DE CONFIRMACIÓN DE DEPÓSITO cuando estado es PENDIENTE
    let depositoData = null;
    if (estado === 'PENDIENTE') {
      try {
        console.log('=== GENERANDO CONFIRMACIÓN DE DEPÓSITO (CITA ACTUALIZADA) ===')
        console.log('Cliente:', cita.cliente.nombre)
        console.log('Teléfono:', cita.cliente.telefono)
        console.log('Vehículo:', `${cita.vehiculo.marca} ${cita.vehiculo.modelo} - ${cita.vehiculo.matricula}`)
        
        const { generarEnlaceConfirmacionDeposito } = await import('@/lib/notifications')
        
        // Formatear fecha
        const fechaFormateada = new Date(cita.fecha).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }) + ' - ' + cita.horaInicio;
        
        // Obtener nombres de servicios
        const nombresServicios = cita.cita_servicios?.map((cs: any) => cs.servicios.nombre) || [];
        
        const resultado = generarEnlaceConfirmacionDeposito({
          clienteName: cita.cliente.nombre,
          telefono: cita.cliente.telefono,
          vehiculo: {
            marca: cita.vehiculo.marca,
            modelo: cita.vehiculo.modelo,
            matricula: cita.vehiculo.matricula
          },
          fecha: fechaFormateada,
          servicios: nombresServicios,
          box: cita.box
        });
        
        if (resultado.success) {
          depositoData = {
            clienteName: cita.cliente.nombre,
            telefono: resultado.numeroOriginal,
            whatsappUrl: resultado.whatsappUrl,
            smsUrl: resultado.smsUrl,
            mensaje: resultado.mensaje
          };
          console.log('✅ Enlaces de confirmación de depósito generados exitosamente');
        }
      } catch (depositoError) {
        console.error('❌ Error generando confirmación de depósito:', depositoError);
      }
    }
    
    // ⭐ GENERAR CONFIRMACIÓN CON ICS cuando estado es CONFIRMADA
    let confirmacionICSData = null;
    if (estado === 'CONFIRMADA') {
      try {
        console.log('=== GENERANDO CONFIRMACIÓN CON ICS (CITA CONFIRMADA) ===')
        console.log('Cliente:', cita.cliente.nombre)
        console.log('Teléfono:', cita.cliente.telefono)
        console.log('Vehículo:', `${cita.vehiculo.marca} ${cita.vehiculo.modelo} - ${cita.vehiculo.matricula}`)
        
        const { generarNotificacionConICS } = await import('@/lib/notifications')
        
        // Formatear fecha solo (sin hora)
        const fechaSoloFormateada = new Date(cita.fecha).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        
        // Obtener nombres de servicios
        const nombresServicios = cita.cita_servicios?.map((cs: any) => cs.servicios.nombre) || [];
        
        const resultadoICS = generarNotificacionConICS({
          citaId: cita.id,
          clienteName: `${cita.cliente.nombre} ${cita.cliente.apellido || ''}`.trim(),
          telefono: cita.cliente.telefono,
          vehiculo: {
            marca: cita.vehiculo.marca,
            modelo: cita.vehiculo.modelo,
            matricula: cita.vehiculo.matricula
          },
          fecha: fechaSoloFormateada,
          horaInicio: cita.horaInicio,
          horaFin: cita.horaFin,
          servicios: nombresServicios,
          box: cita.box,
          tipoDestinatario: 'CLIENTE'
        });
        
        if (resultadoICS.success) {
          confirmacionICSData = {
            clienteName: `${cita.cliente.nombre} ${cita.cliente.apellido || ''}`.trim(),
            telefono: resultadoICS.numeroOriginal,
            whatsappUrl: resultadoICS.whatsappUrl,
            smsUrl: resultadoICS.smsUrl,
            icsUrl: resultadoICS.icsUrl,
            mensaje: resultadoICS.mensaje
          };
          console.log('📅 Confirmación con ICS generada exitosamente');
        }
      } catch (icsError) {
        console.error('❌ Error generando confirmación con ICS:', icsError);
      }
    }
    
    // ⭐ GENERAR ENLACES DE NOTIFICACIÓN cuando estado es LISTO_PARA_RECOGER
    let listoData = null;
    if (estado === 'LISTO_PARA_RECOGER') {
      try {
        console.log('=== GENERANDO NOTIFICACIÓN DE VEHÍCULO LISTO (CITA ACTUALIZADA) ===')
        console.log('Cliente:', cita.cliente.nombre)
        console.log('Teléfono:', cita.cliente.telefono)
        console.log('Vehículo:', `${cita.vehiculo.marca} ${cita.vehiculo.modelo} - ${cita.vehiculo.matricula}`)
        
        const { generarEnlaceNotificacionListoParaRecoger } = await import('@/lib/notifications')
        
        const resultado = generarEnlaceNotificacionListoParaRecoger({
          clienteName: cita.cliente.nombre,
          telefono: cita.cliente.telefono,
          vehiculo: {
            marca: cita.vehiculo.marca,
            modelo: cita.vehiculo.modelo,
            matricula: cita.vehiculo.matricula
          },
          total: cita.total || undefined,
          metodoPago: cita.metodoPago || undefined
        });
        
        if (resultado.success) {
          listoData = {
            clienteName: cita.cliente.nombre,
            telefono: resultado.numeroOriginal,
            whatsappUrl: resultado.whatsappUrl,
            smsUrl: resultado.smsUrl,
            mensaje: resultado.mensaje
          };
          console.log('✅ Enlaces de notificación de vehículo listo generados exitosamente');
        }
      } catch (listoError) {
        console.error('❌ Error generando notificación de vehículo listo:', listoError);
      }
    }
    
    // ⭐ GENERAR ENLACE WHATSAPP cuando se marca como COMPLETADA
    // Completar servicio = cliente pagó, momento para pedir reseña
    let whatsappData = null;
    if (estado === 'COMPLETADA') {
      try {
        console.log('=== GENERANDO ENLACES WHATSAPP Y SMS (CITA COMPLETADA) ===')
        console.log('Cliente:', cita.cliente.nombre)
        console.log('Teléfono:', cita.cliente.telefono)
        console.log('Vehículo:', `${cita.vehiculo.marca} ${cita.vehiculo.modelo} - ${cita.vehiculo.matricula}`)
        console.log('Total:', cita.total)
        
        const { generarEnlaceWhatsAppResena, generarEnlaceSMSResena } = await import('@/lib/notifications')
        
        // Generar enlace WhatsApp
        const whatsappResult = generarEnlaceWhatsAppResena({
          clienteName: cita.cliente.nombre,
          telefono: cita.cliente.telefono
        })
        
        // Generar enlace SMS
        const smsResult = generarEnlaceSMSResena({
          clienteName: cita.cliente.nombre,
          telefono: cita.cliente.telefono
        })
        
        if (whatsappResult.success && smsResult.success) {
          whatsappData = {
            clienteName: cita.cliente.nombre,
            telefono: whatsappResult.telefono,
            whatsappUrl: whatsappResult.whatsappUrl,
            smsUrl: smsResult.smsUrl,
            mensaje: whatsappResult.mensaje
          }
          console.log('✅ Enlaces WhatsApp y SMS generados exitosamente')
          console.log('WhatsApp URL:', whatsappResult.whatsappUrl)
          console.log('SMS URL:', smsResult.smsUrl)
        }
      } catch (reviewError) {
        // No fallar la actualización si falla la generación del enlace
        console.error('❌ Error generando enlaces WhatsApp/SMS:', reviewError)
      }
    }
    
    return NextResponse.json({
      ...cita,
      depositoData: depositoData, // Incluir datos de confirmación de depósito si se generaron
      confirmacionICSData: confirmacionICSData, // Incluir datos de confirmación con ICS si se generaron
      listoData: listoData, // Incluir datos de notificación de vehículo listo si se generaron
      whatsappData: whatsappData // Incluir datos de WhatsApp y SMS si se generaron
    })
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
