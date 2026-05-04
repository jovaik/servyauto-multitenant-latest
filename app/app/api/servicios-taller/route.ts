import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext, buildLocalFilter, getLocalIdForCreate } from '@/lib/local-context'
import { notificarCreacionGSControl, mapearCategoriaGasto } from '@/lib/gscontrol-sync'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const servicios = await prisma.servicioTaller.findMany({
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
            total: true
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      }
    })

    return NextResponse.json(servicios)
  } catch (error) {
    console.error('Error fetching servicios taller:', error)
    return NextResponse.json({ error: 'Error al obtener servicios' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Datos recibidos para crear servicio:', JSON.stringify(body, null, 2))
    
    const { 
      concepto,
      fecha,
      clienteId,
      vehiculoId,
      tipoGasto,
      costeProducto,
      precioProducto,
      precioManoObra,
      metodoPago,
      solicitaFactura
    } = body

    // Validar campos requeridos
    if (!concepto || !clienteId || !vehiculoId || !tipoGasto || !metodoPago) {
      console.error('Faltan campos requeridos', { concepto, clienteId, vehiculoId, tipoGasto, metodoPago })
      return NextResponse.json(
        { error: 'Faltan campos requeridos: concepto, clienteId, vehiculoId, tipoGasto, metodoPago' },
        { status: 400 }
      )
    }

    // Validar que metodoPago sea uno de los valores válidos del enum
    const metodosValidos = ['EFECTIVO', 'TPV_SUMUP', 'TPV_UNICAJA']
    if (!metodosValidos.includes(metodoPago)) {
      console.error('Método de pago inválido:', metodoPago)
      return NextResponse.json(
        { error: `Método de pago inválido. Debe ser uno de: ${metodosValidos.join(', ')}` },
        { status: 400 }
      )
    }

    // Calcular totales
    const costoProductoNum = parseFloat(costeProducto) || 0
    const precioProductoNum = parseFloat(precioProducto) || 0
    const precioManoObraNum = parseFloat(precioManoObra) || 0
    
    const importeTotal = precioProductoNum + precioManoObraNum
    const margen = precioProductoNum - costoProductoNum
    
    // ⭐ CORREGIR REGLA DE FACTURA/TICKET:
    // Efectivo o TPV_SUMUP → TICKET
    // TPV_UNICAJA → FACTURA
    const esFactura = metodoPago === 'TPV_UNICAJA'
    const tipoDocumento = esFactura ? 'FACTURA' : 'TICKET'

    // 🗓️ OBTENER BOX CONFIGURADO (primer box disponible)
    let boxAsignado = 'Box 1' // Default
    const localCtxTaller = await getLocalContext()
    const tenantIdTaller = localCtxTaller?.tenantId || null
    try {
      const configBoxes = await prisma.configuracion.findFirst({
        where: { clave: 'boxes.nombres', ...(tenantIdTaller ? { tenantId: tenantIdTaller } : {}) }
      })
      if (configBoxes?.valor) {
        const boxes = JSON.parse(configBoxes.valor)
        if (boxes.length > 0) {
          boxAsignado = boxes[0]
        }
      }
    } catch (err) {
      console.log('Usando box por defecto:', boxAsignado)
    }

    // Preparar fecha y hora para la cita
    const fechaCita = fecha ? new Date(fecha) : new Date()
    const horaInicio = fechaCita.toTimeString().substring(0, 5) // formato HH:MM
    const horaFin = horaInicio // Mismo horario ya que el servicio está completado

    console.log('Creando cita en agenda con:', {
      fecha: fechaCita,
      horaInicio,
      box: boxAsignado
    })

    // 🔧 CREAR SERVICIO PARA LA CITA (debe existir en catálogo)
    // Buscar o crear un servicio genérico "Servicio de Taller" (dentro del tenant)
    let servicioGenerico = await prisma.servicio.findFirst({
      where: { nombre: 'Servicio de Taller', ...(tenantIdTaller ? { tenantId: tenantIdTaller } : {}) }
    })

    if (!servicioGenerico) {
      servicioGenerico = await prisma.servicio.create({
        data: {
          nombre: 'Servicio de Taller',
          descripcion: 'Servicios rápidos de taller (baterías, frenos, etc.)',
          precio: 0,
          duracion: 60,
          activo: true,
          ...(tenantIdTaller ? { tenantId: tenantIdTaller } : {})
        }
      })
      console.log('✅ Servicio genérico creado:', servicioGenerico.id)
    }

    // 📅 CREAR CITA EN LA AGENDA (estado COMPLETADA porque ya se realizó)
    const cita = await prisma.cita.create({
      data: {
        fecha: fechaCita,
        horaInicio,
        horaFin,
        clienteId,
        vehiculoId,
        box: boxAsignado,
        estado: 'COMPLETADA', // ⭐ El servicio ya está hecho
        ticketsUsados: 0,
        observaciones: `Servicio de taller: ${concepto}`,
        metodoPago: metodoPago,
        total: importeTotal,
        ...(tenantIdTaller ? { tenantId: tenantIdTaller } : {}),
        cita_servicios: {
          create: [{
            id: `cs_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            servicioId: servicioGenerico.id,
            precio: importeTotal
          }]
        }
      },
      include: {
        cliente: true,
        vehiculo: true,
        cita_servicios: {
          include: {
            servicios: true
          }
        }
      }
    })

    console.log('✅ Cita creada en agenda:', cita.id)

    // 📝 CREAR REGISTRO EN SERVICIOTALLER (para tracking interno)
    const servicioData: any = {
      concepto: concepto.trim(),
      fecha: fechaCita,
      clienteId: clienteId,
      vehiculoId: vehiculoId,
      tipoGasto: tipoGasto.trim(),
      costeProducto: costoProductoNum,
      costeManoObra: 0,
      precioProducto: precioProductoNum,
      precioManoObra: precioManoObraNum,
      importe: importeTotal,
      margen: margen,
      metodoPago: metodoPago,
      tipo: tipoDocumento,
      iva: 21,
      adjunto: false,
      citaId: cita.id // ⭐ Vincular con la cita
    }
    if (tenantIdTaller) servicioData.tenantId = tenantIdTaller

    const servicio = await prisma.servicioTaller.create({
      data: servicioData
    })

    console.log('✅ Servicio de taller registrado:', servicio.id)

    // 📄 GENERAR FACTURA O TICKET AUTOMÁTICAMENTE
    const items = []
    
    if (precioProductoNum > 0) {
      items.push({
        descripcion: `${concepto} - Pieza/Producto`,
        cantidad: 1,
        precioUnitario: precioProductoNum
      })
    }
    
    if (precioManoObraNum > 0) {
      items.push({
        descripcion: `${concepto} - Mano de Obra`,
        cantidad: 1,
        precioUnitario: precioManoObraNum
      })
    }

    // Crear factura/ticket vinculada a la CITA
    const facturaResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/facturas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        clienteId: clienteId,
        vehiculoId: vehiculoId,
        citaId: cita.id, // ⭐ Asociada a la cita
        items: items,
        metodoPago: metodoPago,
        solicitaFactura: esFactura, // true para TPV_UNICAJA, false para el resto
        estado: 'PAGADA' // Ya está pagada
      })
    })

    let factura = null
    if (facturaResponse.ok) {
      factura = await facturaResponse.json()
      console.log(`✅ ${factura.tipo} generado:`, factura.numero)
      
      // Asociar factura al servicio de taller
      await prisma.servicioTaller.update({
        where: { id: servicio.id },
        data: { facturaId: factura.id }
      })
    } else {
      const errorText = await facturaResponse.text()
      console.error('❌ Error al generar factura/ticket:', errorText)
      throw new Error(`Error al generar documento: ${errorText}`)
    }

    // 🔄 SINCRONIZAR CON GSCONTROL como INGRESO
    const descripcionServicio = `${concepto} - ${cita.cliente.nombre} ${cita.cliente.apellido || ''} (${cita.vehiculo.matricula})`
    const categoriaGSControl = mapearCategoriaGasto(tipoGasto)
    
    await notificarCreacionGSControl({
      id: servicio.id,
      esIngreso: true, // ⭐ INGRESO
      fecha: fechaCita,
      importe: importeTotal,
      descripcion: descripcionServicio,
      costCategory: categoriaGSControl
    })

    // Recargar servicio con todas las relaciones
    const servicioCompleto = await prisma.servicioTaller.findUnique({
      where: { id: servicio.id },
      include: {
        cliente: true,
        vehiculo: true,
        factura: true,
        cita: {
          include: {
            cita_servicios: {
              include: {
                servicios: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(servicioCompleto, { status: 201 })
  } catch (error: any) {
    console.error('Error creating servicio taller:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { error: 'Error al crear servicio: ' + (error.message || 'Error desconocido') },
      { status: 500 }
    )
  }
}
