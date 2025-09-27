
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que existe y es un TICKET
    const factura = await prisma.factura.findUnique({
      where: { id: params.id },
      include: {
        cliente: true
      }
    })

    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      )
    }

    if (factura.tipo !== 'TICKET') {
      return NextResponse.json(
        { error: 'Solo se pueden convertir tickets a facturas' },
        { status: 400 }
      )
    }

    // Generar nuevo número de factura
    const ultimaFactura = await prisma.factura.findFirst({
      where: { tipo: 'FACTURA' },
      orderBy: { numero: 'desc' }
    })

    let numeroSecuencia = 1
    if (ultimaFactura) {
      const ultimoNumero = parseInt(ultimaFactura.numero.split('-')[1]) || 0
      numeroSecuencia = ultimoNumero + 1
    }

    const nuevoNumero = `FAC-${numeroSecuencia.toString().padStart(6, '0')}`

    // Obtener datos de facturación del request body
    const body = await request.json()
    const { datosFacturacion } = body

    if (!datosFacturacion) {
      return NextResponse.json(
        { error: 'Se requieren los datos de facturación' },
        { status: 400 }
      )
    }

    // Convertir ticket a factura
    const facturaConvertida = await prisma.factura.update({
      where: { id: params.id },
      data: {
        tipo: 'FACTURA',
        numero: nuevoNumero,
        datosFacturacion: JSON.stringify(datosFacturacion),
        pdfPath: null // Reset PDF path para regenerar
      },
      include: {
        cliente: true,
        items: true,
        cita: true
      }
    })

    return NextResponse.json(facturaConvertida)
  } catch (error) {
    console.error('Error converting ticket to factura:', error)
    return NextResponse.json(
      { error: 'Error al convertir ticket a factura' },
      { status: 500 }
    )
  }
}
