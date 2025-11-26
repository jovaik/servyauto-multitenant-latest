
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const fecha = searchParams.get('fecha')

    let whereClause: any = {}

    if (fecha) {
      const fechaInicio = new Date(fecha)
      const fechaFin = new Date(fecha)
      fechaFin.setHours(23, 59, 59, 999)

      whereClause.fecha = {
        gte: fechaInicio,
        lte: fechaFin,
      }
    }

    const citas = await prisma.cita.findMany({
      where: whereClause,
      include: {
        cliente: true,
        vehiculo: true,
        cita_servicios: {
          include: {
            servicios: true
          }
        }
      },
      orderBy: {
        horaInicio: 'asc',
      },
    })

    return NextResponse.json(citas || [])
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
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
      clienteId,
      vehiculoId,
      servicios,
      box,
      ticketsUsados,
      observaciones,
      metodoPago,
    } = body

    // Validar campos requeridos
    if (!fecha || !horaInicio || !horaFin || !clienteId || !vehiculoId || !box) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Validar disponibilidad de tickets si se solicitan
    const ticketsASolicitar = parseInt(ticketsUsados) || 0
    if (ticketsASolicitar > 0) {
      const ultimoMovimiento = await prisma.inventarioTickets.findFirst({
        orderBy: {
          createdAt: 'desc'
        }
      })

      const saldoActual = ultimoMovimiento?.saldoActual || 0
      
      if (saldoActual < ticketsASolicitar) {
        return NextResponse.json(
          { error: `No hay suficientes tickets disponibles. Saldo actual: ${saldoActual}` },
          { status: 400 }
        )
      }
    }

    // Verificar disponibilidad del slot
    const fechaCita = new Date(fecha)
    const citaExistente = await prisma.cita.findFirst({
      where: {
        fecha: {
          gte: new Date(fechaCita.getFullYear(), fechaCita.getMonth(), fechaCita.getDate()),
          lt: new Date(fechaCita.getFullYear(), fechaCita.getMonth(), fechaCita.getDate() + 1),
        },
        horaInicio,
        box,
      },
    })

    if (citaExistente) {
      return NextResponse.json(
        { error: 'Ya existe una cita en este horario y box' },
        { status: 400 }
      )
    }

    // Calcular precio total de los servicios
    let precioTotal = 0
    const serviciosData = []
    
    if (servicios && Array.isArray(servicios) && servicios.length > 0) {
      for (const svc of servicios) {
        const servicioId = svc.servicioId || svc
        const servicio = await prisma.servicio.findUnique({
          where: { id: servicioId },
        })
        
        if (servicio) {
          const precio = svc.precio || servicio.precio
          precioTotal += precio
          
          // Generar un ID único usando timestamp + random para evitar colisiones
          const uniqueId = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
          
          serviciosData.push({
            id: uniqueId,
            servicioId: servicioId,
            precio: precio
          })
        }
      }
    }

    // Aplicar descuento de parking si el cliente es abonado
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
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
          precioTotal = Math.max(0, precioTotal - valorDescuento)
        } else {
          // Descuento porcentual
          const descuento = (precioTotal * valorDescuento) / 100
          precioTotal = Math.max(0, precioTotal - descuento)
        }
        
        console.log(`Descuento de parking aplicado: ${tipoDescuento === 'FIJO' ? valorDescuento + '€' : valorDescuento + '%'} - Total final: €${precioTotal}`)
      }
    }

    // Crear la cita con sus servicios asociados
    const cita = await prisma.cita.create({
      data: {
        fecha: fechaCita,
        horaInicio,
        horaFin,
        clienteId,
        vehiculoId,
        box,
        estado: 'PENDIENTE',
        ticketsUsados: ticketsASolicitar,
        observaciones,
        metodoPago,
        total: precioTotal,
        cita_servicios: serviciosData.length > 0 ? {
          create: serviciosData
        } : undefined
      },
      include: {
        cliente: true,
        vehiculo: true,
        cita_servicios: {
          include: {
            servicios: true
          }
        }
      },
    })

    // Registrar el consumo de tickets en el inventario
    if (ticketsASolicitar > 0) {
      const ultimoMovimiento = await prisma.inventarioTickets.findFirst({
        orderBy: {
          createdAt: 'desc'
        }
      })

      const saldoAnterior = ultimoMovimiento?.saldoActual || 0
      const saldoNuevo = saldoAnterior - ticketsASolicitar

      await prisma.inventarioTickets.create({
        data: {
          tipo: 'CONSUMO',
          cantidad: -ticketsASolicitar,
          saldoAnterior,
          saldoActual: saldoNuevo,
          concepto: `Tickets entregados en cita #${cita.id.substring(0, 8)}`,
          usuarioId: (session.user as any).id || null,
          citaId: cita.id
        }
      })
    }

    // ⭐ GENERAR ENLACES DE CONFIRMACIÓN DE DEPÓSITO (cita nueva)
    let depositoData = null;
    try {
      console.log('=== GENERANDO CONFIRMACIÓN DE DEPÓSITO (CITA NUEVA) ===')
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

    // Generar confirmación con archivo ICS para el cliente
    let confirmacionICSData = null;
    try {
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

    return NextResponse.json({
      ...cita,
      depositoData: depositoData, // Incluir datos de confirmación de depósito si se generaron
      confirmacionICSData: confirmacionICSData // Incluir datos de confirmación con ICS si se generaron
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
