
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notificarCreacionGSControl } from '@/lib/gscontrol-sync'
import { getLocalContext, buildLocalFilter, getLocalIdForCreate } from '@/lib/local-context'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener contexto de local para filtrado
    const localContext = await getLocalContext()
    
    // IMPORTANTE: Si no hay contexto, devolver array vacío por seguridad
    if (!localContext) {
      console.log('⚠️ Facturas API - Sin contexto de local, devolviendo vacío')
      return NextResponse.json([])
    }
    
    const localFilter = buildLocalFilter(localContext)

    // Obtener facturas y tickets (documentos reales)
    const facturas = await prisma.factura.findMany({
      where: localFilter,
      include: {
        cliente: {
          select: {
            nombre: true,
            apellido: true,
            email: true,
            telefono: true
          }
        },
        local: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(facturas)
  } catch (error) {
    console.error('Error fetching facturas:', error)
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
    console.log('Datos recibidos para crear factura:', body)

    const {
      clienteId,
      citaId,
      items,
      metodoPago,
      solicitaFactura,
      datosFacturacion
    } = body

    // Validar campos requeridos
    if (!clienteId) {
      return NextResponse.json(
        { error: 'Falta el campo requerido: clienteId' },
        { status: 400 }
      )
    }

    if (!metodoPago || metodoPago === '' || metodoPago === 'undefined') {
      return NextResponse.json(
        { error: 'Falta el campo requerido: metodoPago. Debe seleccionar un método de pago' },
        { status: 400 }
      )
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Debe incluir al menos un item en la factura' },
        { status: 400 }
      )
    }

    // Validar que los items tengan descripción y precio
    const itemsInvalidos = items.filter((item: any) => !item.descripcion || item.precio <= 0)
    if (itemsInvalidos.length > 0) {
      return NextResponse.json(
        { error: 'Todos los items deben tener descripción y precio mayor a 0' },
        { status: 400 }
      )
    }

    // Calcular totales
    // Los precios ya incluyen IVA, hay que desglosarlo
    const total = items.reduce((sum: number, item: any) => {
      return sum + (item.cantidad * item.precio)
    }, 0)
    const subtotal = total / 1.21  // Base imponible (desglosando IVA 21%)
    const iva = total - subtotal    // IVA desglosado

    // Determinar tipo de documento
    let tipo: 'TICKET' | 'FACTURA' = 'TICKET'
    if (solicitaFactura || metodoPago === 'TPV_UNICAJA') {
      tipo = 'FACTURA'
    }

    // Generar número de documento
    const año = new Date().getFullYear()
    const prefijo = tipo === 'FACTURA' ? 'FAC' : 'TKT'
    
    // Obtener contexto local y tenant (una sola vez)
    const localContext = await getLocalContext()
    const tenantIdFactura = localContext?.tenantId || null
    const localIdParaFactura = localContext ? getLocalIdForCreate(localContext) : null

    // Buscar el último documento del año con ese prefijo (por tenant)
    const ultimoDocumento = await prisma.factura.findFirst({
      where: { 
        numero: {
          startsWith: `${prefijo}-${año}-`
        },
        ...(tenantIdFactura ? { tenantId: tenantIdFactura } : {})
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

    // Preparar datos de facturación
    let datosFacturacionString = null
    if (tipo === 'FACTURA' && datosFacturacion) {
      datosFacturacionString = JSON.stringify(datosFacturacion)
    }

    // Crear factura con items
    const factura = await prisma.factura.create({
      data: {
        numero,
        tipo,
        subtotal,
        iva,
        total,
        metodoPago: metodoPago as any,
        datosFacturacion: datosFacturacionString,
        clienteId,
        citaId: citaId || null,
        estado: 'PAGADA', // Al crear se marca como pagada
        fechaPago: new Date(),
        localId: localIdParaFactura, // Asignar local
        ...(localContext?.tenantId ? { tenantId: localContext.tenantId } : {}),
        // Trazabilidad - quién creó este ingreso
        creadoPorId: (session.user as any)?.id || null,
        creadoPorNombre: session.user?.name || session.user?.email || 'Sistema',
        factura_items: {
          create: items.map((item: any, index: number) => ({
            id: `${numero}-${index + 1}`,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio: item.precio,
            total: item.cantidad * item.precio
          }))
        }
      },
      include: {
        cliente: true,
        factura_items: true,
        local: true
      }
    })

    console.log('Factura creada exitosamente:', factura.numero)

    // 🔄 SINCRONIZAR CON GSCONTROL - CÓDIGO ACTUALIZADO 31/10/2025
    const descripcionFactura = `${factura.tipo}: ${factura.numero} - ${factura.cliente.nombre} ${factura.cliente.apellido || ''}`
    const clienteNombreCompleto = `${factura.cliente.nombre} ${factura.cliente.apellido || ''}`.trim()
    
    await notificarCreacionGSControl({
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

    return NextResponse.json(factura, { status: 201 })
  } catch (error) {
    console.error('Error creating factura:', error)
    console.error('Error completo:', JSON.stringify(error, null, 2))
    
    // Mensaje de error más descriptivo
    let errorMessage = 'Error al crear la factura'
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
