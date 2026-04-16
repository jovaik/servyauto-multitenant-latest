
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
    
    // Buscar el número más alto por el propio número (NO por createdAt)
    // para garantizar secuencia correcta según normativa fiscal española
    const facturasDelAño = await prisma.factura.findMany({
      where: { 
        numero: {
          startsWith: `${prefijo}-${año}-`
        }
      },
      select: { numero: true }
    })

    let numeroSecuencia = 1
    if (facturasDelAño.length > 0) {
      const numeros = facturasDelAño.map((d: any) => {
        const partes = d.numero.split('-')
        return partes.length === 3 ? (parseInt(partes[2]) || 0) : 0
      })
      const maxNumero = Math.max(...numeros)
      numeroSecuencia = maxNumero + 1
    }

    const numeroFactura = `${prefijo}-${año}-${numeroSecuencia.toString().padStart(4, '0')}`
    
    console.log('Nuevo número de factura:', numeroFactura)

    // Obtener datos de facturación del request (si se proporcionan)
    const body = await request.json().catch(() => ({}))
    const { datosFacturacion } = body

    // La fecha de la factura convertida es HOY (fecha de emisión real)
    // La normativa fiscal española exige que la fecha sea la de emisión,
    // y el número debe ser correlativo con la fecha
    const fechaFactura = new Date()
    console.log('Fecha de la factura (hoy):', fechaFactura.toISOString())

    // Actualizar el documento a FACTURA
    const facturaConvertida = await prisma.factura.update({
      where: { id: params.id },
      data: {
        tipo: 'FACTURA',
        numero: numeroFactura,
        datosFacturacion: datosFacturacion || documentoActual.datosFacturacion,
        fecha: fechaFactura,
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
