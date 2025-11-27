import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notificarCreacionGSControl } from '@/lib/gscontrol-sync'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const servicios = await prisma.servicioRapido.findMany({
      include: {
        cliente: {
          select: {
            nombre: true,
            apellido: true,
            telefono: true,
            email: true
          }
        },
        vehiculo: {
          select: {
            marca: true,
            modelo: true,
            matricula: true
          }
        },
        factura: {
          select: {
            numero: true,
            tipo: true,
            total: true,
            estado: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(servicios)
  } catch (error) {
    console.error('Error fetching servicios taller:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Datos recibidos para crear servicio taller:', body)

    const {
      clienteId,
      vehiculoId,
      concepto,
      costeProducto = 0,
      precioProducto,
      precioManoObra,
      metodoPago,
      solicitaFactura = false
    } = body

    // Validar campos requeridos
    if (!clienteId) {
      return NextResponse.json(
        { error: 'Falta el campo requerido: clienteId' },
        { status: 400 }
      )
    }

    if (!vehiculoId) {
      return NextResponse.json(
        { error: 'Falta el campo requerido: vehiculoId' },
        { status: 400 }
      )
    }

    if (!concepto || concepto.trim() === '') {
      return NextResponse.json(
        { error: 'Falta el campo requerido: concepto' },
        { status: 400 }
      )
    }

    if (precioProducto === undefined || precioProducto < 0) {
      return NextResponse.json(
        { error: 'El precio del producto debe ser mayor o igual a 0' },
        { status: 400 }
      )
    }

    if (precioManoObra === undefined || precioManoObra < 0) {
      return NextResponse.json(
        { error: 'El precio de mano de obra debe ser mayor o igual a 0' },
        { status: 400 }
      )
    }

    if (!metodoPago || metodoPago === '' || metodoPago === 'undefined') {
      return NextResponse.json(
        { error: 'Falta el campo requerido: metodoPago' },
        { status: 400 }
      )
    }

    // Calcular totales
    const total = parseFloat(precioProducto) + parseFloat(precioManoObra)
    const margen = parseFloat(precioProducto) - parseFloat(costeProducto)
    const subtotal = total / 1.21  // Base imponible (desglosando IVA 21%)
    const iva = total - subtotal    // IVA desglosado
    const totalConIva = total  // Total con IVA

    // Determinar tipo de documento basado en método de pago
    let tipo: 'TICKET' | 'FACTURA' = 'TICKET'
    if (solicitaFactura || metodoPago === 'TPV_UNICAJA') {
      tipo = 'FACTURA'
    }

    // Generar número de documento
    const año = new Date().getFullYear()
    const prefijo = tipo === 'FACTURA' ? 'FAC' : 'TKT'
    
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

    const numero = `${prefijo}-${año}-${numeroSecuencia.toString().padStart(4, '0')}`

    // Crear factura primero
    const factura = await prisma.factura.create({
      data: {
        numero,
        tipo,
        subtotal,
        iva,
        total: totalConIva,
        metodoPago: metodoPago as any,
        clienteId,
        estado: 'PAGADA', // Al crear se marca como pagada
        factura_items: {
          create: [
            // Item 1: Producto/Pieza
            {
              id: `${numero}-1`,
              descripcion: concepto,
              cantidad: 1,
              precio: parseFloat(precioProducto),
              total: parseFloat(precioProducto)
            },
            // Item 2: Mano de obra (solo si > 0)
            ...(parseFloat(precioManoObra) > 0 ? [{
              id: `${numero}-2`,
              descripcion: 'Mano de obra',
              cantidad: 1,
              precio: parseFloat(precioManoObra),
              total: parseFloat(precioManoObra)
            }] : [])
          ]
        }
      },
      include: {
        cliente: true,
        factura_items: true
      }
    })

    console.log('Factura creada exitosamente:', factura.numero)

    // Crear servicio taller vinculado a la factura
    const servicio = await prisma.servicioRapido.create({
      data: {
        clienteId,
        vehiculoId,
        concepto,
        costeProducto: parseFloat(costeProducto),
        precioProducto: parseFloat(precioProducto),
        precioManoObra: parseFloat(precioManoObra),
        total,
        margen,
        iva: 21,
        totalConIva,
        metodoPago: metodoPago as any,
        pagado: true,
        estado: 'FACTURADO',
        facturaId: factura.id
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            apellido: true,
            telefono: true,
            email: true
          }
        },
        vehiculo: {
          select: {
            marca: true,
            modelo: true,
            matricula: true
          }
        },
        factura: {
          select: {
            numero: true,
            tipo: true,
            total: true,
            estado: true
          }
        }
      }
    })

    console.log('Servicio taller creado exitosamente con ID:', servicio.id)

    // Sincronizar con GSControl
    const descripcionFactura = `${factura.tipo}: ${factura.numero} - ${concepto}`
    const clienteNombreCompleto = `${factura.cliente.nombre} ${factura.cliente.apellido || ''}`.trim()
    
    await notificarCreacionGSControl({
      id: factura.id,
      esIngreso: true,
      fecha: factura.createdAt,
      importe: factura.total,
      descripcion: descripcionFactura,
      documentType: factura.tipo,
      invoiceNumber: factura.tipo === 'FACTURA' ? factura.numero : undefined,
      clientName: clienteNombreCompleto || undefined,
      clientDni: factura.cliente.documento || undefined
    })

    return NextResponse.json({ servicio, factura }, { status: 201 })
  } catch (error) {
    console.error('Error creating servicio taller:', error)
    console.error('Error completo:', JSON.stringify(error, null, 2))
    
    let errorMessage = 'Error al crear el servicio de taller'
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`
      console.error('Stack trace:', error.stack)
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
