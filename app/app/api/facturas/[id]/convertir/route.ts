
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notificarCreacionGSControl } from '@/lib/gscontrol-sync'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    console.log('=== CONVERSIÓN DE TICKET A FACTURA ===')
    console.log('ID del documento:', params.id)

    // Buscar el documento actual
    const documentoActual = await prisma.factura.findUnique({
      where: { id: params.id },
      include: {
        factura_items: true,
        cliente: true,
      }
    })

    if (!documentoActual) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      )
    }

    console.log('Documento encontrado:', documentoActual.numero, '- Tipo:', documentoActual.tipo)

    // Verificar que sea un TICKET
    if (documentoActual.tipo !== 'TICKET') {
      return NextResponse.json(
        { error: 'Solo se pueden convertir tickets a facturas' },
        { status: 400 }
      )
    }

    // Generar nuevo número de factura usando el año del documento original
    const fechaOriginal = new Date(documentoActual.createdAt)
    const año = fechaOriginal.getFullYear()
    const prefijo = 'FAC'
    
    console.log('Fecha original del ticket:', fechaOriginal.toISOString())
    console.log('Año para la factura:', año)
    
    const ultimaFactura = await prisma.factura.findFirst({
      where: { 
        numero: {
          startsWith: `${prefijo}-${año}-`
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    let numeroSecuencia = 1
    if (ultimaFactura) {
      const partes = ultimaFactura.numero.split('-')
      if (partes.length === 3 && partes[0] === prefijo) {
        const ultimoNumero = parseInt(partes[2]) || 0
        numeroSecuencia = ultimoNumero + 1
      }
    }

    const numeroFactura = `${prefijo}-${año}-${numeroSecuencia.toString().padStart(4, '0')}`
    
    console.log('Nuevo número de factura:', numeroFactura)

    // Obtener datos de facturación del request (si se proporcionan)
    const body = await request.json().catch(() => ({}))
    const { datosFacturacion } = body

    // Determinar la fecha de la factura
    // Buscar si hay facturas con fecha posterior al ticket en el mismo año
    const fechaTicket = new Date(documentoActual.createdAt)
    
    const facturasPosteriores = await prisma.factura.findMany({
      where: {
        tipo: 'FACTURA',
        createdAt: {
          gt: fechaTicket // Facturas con fecha posterior al ticket
        },
        numero: {
          startsWith: `FAC-${año}-` // Del mismo ejercicio
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 1
    })

    let fechaFactura: Date
    
    if (facturasPosteriores.length === 0) {
      // No hay facturas posteriores, usar la fecha original del ticket
      fechaFactura = fechaTicket
      console.log('No hay facturas posteriores, usando fecha del ticket:', fechaFactura.toISOString())
    } else {
      // Hay facturas posteriores, la nueva debe ir justo después de la última factura del ejercicio
      const ultimaFacturaDelAño = await prisma.factura.findFirst({
        where: {
          tipo: 'FACTURA',
          numero: { startsWith: `FAC-${año}-` }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      if (ultimaFacturaDelAño) {
        // Poner fecha 1 segundo después de la última factura
        fechaFactura = new Date(ultimaFacturaDelAño.createdAt)
        fechaFactura.setSeconds(fechaFactura.getSeconds() + 1)
        console.log('Hay facturas posteriores, usando fecha después de la última:', fechaFactura.toISOString())
      } else {
        fechaFactura = fechaTicket
      }
    }

    // Actualizar el documento a FACTURA
    const facturaConvertida = await prisma.factura.update({
      where: { id: params.id },
      data: {
        tipo: 'FACTURA',
        numero: numeroFactura,
        datosFacturacion: datosFacturacion || documentoActual.datosFacturacion,
        createdAt: fechaFactura,
      },
      include: {
        factura_items: true,
        cliente: true,
        citas: true,
      }
    })

    console.log('=== CONVERSIÓN EXITOSA ===')
    console.log('De:', documentoActual.numero, '→ A:', numeroFactura)

    // 🔄 SINCRONIZAR CON GSCONTROL - CÓDIGO EXACTO DEL PDF
    const descripcionFactura = `${facturaConvertida.tipo}: ${facturaConvertida.numero} - ${facturaConvertida.cliente.nombre} ${facturaConvertida.cliente.apellido || ''}`
    await notificarCreacionGSControl({
      id: facturaConvertida.id,
      esIngreso: true,
      fecha: facturaConvertida.createdAt,
      importe: facturaConvertida.total,
      descripcion: descripcionFactura
    })

    return NextResponse.json(facturaConvertida)
  } catch (error: any) {
    console.error('=== ERROR EN CONVERSIÓN ===')
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error al convertir ticket a factura', message: error.message },
      { status: 500 }
    )
  }
}
