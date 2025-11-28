import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
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
      tipoGasto, // Categoria del servicio
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
      clienteProvincia,
      adjunto
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

    // Preparar datos para crear el servicio
    const servicioData = {
      concepto: concepto.trim(),
      fecha: fecha ? new Date(fecha) : new Date(),
      clienteId: clienteId,
      vehiculoId: vehiculoId,
      tipoGasto: tipoGasto.trim(),
      costeProducto: costoProductoNum,
      costeManoObra: costoManoObraNum,
      precioProducto: precioProductoNum,
      precioManoObra: precioManoObraNum,
      importe: importeTotal,
      margen: margen,
      metodoPago: metodoPago,
      tipo: tipo || 'TICKET',
      iva: parseFloat(iva) || 21,
      adjunto: adjunto || false,
      numeroFactura: numeroFactura && numeroFactura.trim() ? numeroFactura.trim() : null,
      clienteCIF: clienteCIF && clienteCIF.trim() ? clienteCIF.trim() : null,
      clienteDireccion: clienteDireccion && clienteDireccion.trim() ? clienteDireccion.trim() : null,
      clienteCodigoPostal: clienteCodigoPostal && clienteCodigoPostal.trim() ? clienteCodigoPostal.trim() : null,
      clienteCiudad: clienteCiudad && clienteCiudad.trim() ? clienteCiudad.trim() : null,
      clienteProvincia: clienteProvincia && clienteProvincia.trim() ? clienteProvincia.trim() : null
    }

    console.log('Datos preparados para Prisma:', JSON.stringify(servicioData, null, 2))

    const servicio = await prisma.servicioTaller.create({
      data: servicioData,
      include: {
        cliente: true,
        vehiculo: true
      }
    })

    console.log('Servicio creado exitosamente:', servicio.id)

    // 📄 GENERAR FACTURA O TICKET AUTOMÁTICAMENTE
    const solicitaFactura = metodoPago === 'TPV_UNICAJA'
    const tipoDocumento = solicitaFactura ? 'FACTURA' : 'TICKET'

    // Crear items de la factura
    const items = []
    
    // Item 1: Producto/Pieza
    if (precioProductoNum > 0) {
      items.push({
        descripcion: `${servicio.concepto} - Pieza/Producto`,
        cantidad: 1,
        precioUnitario: precioProductoNum
      })
    }
    
    // Item 2: Mano de obra
    if (precioManoObraNum > 0) {
      items.push({
        descripcion: `${servicio.concepto} - Mano de Obra`,
        cantidad: 1,
        precioUnitario: precioManoObraNum
      })
    }

    // Crear factura/ticket
    const facturaResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/facturas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        clienteId: servicio.clienteId,
        vehiculoId: servicio.vehiculoId,
        citaId: null, // No viene de una cita
        items: items,
        metodoPago: metodoPago,
        solicitaFactura: solicitaFactura,
        estado: 'PAGADA' // Ya está pagada al momento de crear el servicio
      })
    })

    let factura = null
    if (facturaResponse.ok) {
      factura = await facturaResponse.json()
      console.log('✅ Factura/Ticket generado:', factura.numero)
      
      // Asociar factura al servicio
      await prisma.servicioTaller.update({
        where: { id: servicio.id },
        data: { facturaId: factura.id }
      })
    } else {
      console.error('❌ Error al generar factura/ticket:', await facturaResponse.text())
    }

    // 🔄 SINCRONIZAR CON GSCONTROL como INGRESO
    const descripcionServicio = `${servicio.concepto} - ${servicio.cliente.nombre} ${servicio.cliente.apellido || ''} (${servicio.vehiculo.matricula})`
    const categoriaGSControl = mapearCategoriaGasto(servicio.tipoGasto)
    
    await notificarCreacionGSControl({
      id: servicio.id,
      esIngreso: true, // ⭐ ESTO ES UN INGRESO, NO UN GASTO
      fecha: servicio.fecha,
      importe: servicio.importe,
      descripcion: descripcionServicio,
      costCategory: categoriaGSControl
    })

    // Recargar servicio con factura incluida
    const servicioConFactura = await prisma.servicioTaller.findUnique({
      where: { id: servicio.id },
      include: {
        cliente: true,
        vehiculo: true,
        factura: true
      }
    })

    return NextResponse.json(servicioConFactura, { status: 201 })
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
