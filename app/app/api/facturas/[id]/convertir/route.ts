
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext } from '@/lib/local-context'
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

    const localContext = await getLocalContext()
    const tenantId = localContext?.tenantId || null
    const tenantFilter = tenantId ? { tenantId } : {}

    const documentoActual = await prisma.factura.findUnique({
      where: { id: params.id },
      include: { factura_items: true, cliente: true }
    })

    if (!documentoActual) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    // Validación de pertenencia al tenant (Grupo C)
    if (tenantId && documentoActual.tenantId && documentoActual.tenantId !== tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (documentoActual.tipo !== 'TICKET') {
      return NextResponse.json({ error: 'Solo se pueden convertir tickets a facturas' }, { status: 400 })
    }

    const fechaOriginal = new Date(documentoActual.createdAt)
    const año = fechaOriginal.getFullYear()
    const prefijo = 'FAC'

    const facturasDelAño = await prisma.factura.findMany({
      where: {
        numero: { startsWith: `${prefijo}-${año}-` },
        ...tenantFilter
      },
      select: { numero: true }
    })

    let numeroSecuencia = 1
    if (facturasDelAño.length > 0) {
      const numeros = facturasDelAño.map((d: any) => {
        const partes = d.numero.split('-')
        return partes.length === 3 ? (parseInt(partes[2]) || 0) : 0
      })
      numeroSecuencia = Math.max(...numeros) + 1
    }

    const numeroFactura = `${prefijo}-${año}-${numeroSecuencia.toString().padStart(4, '0')}`
    const body = await request.json().catch(() => ({}))
    const { datosFacturacion } = body
    const fechaFactura = new Date()

    const facturaConvertida = await prisma.factura.update({
      where: { id: params.id },
      data: {
        tipo: 'FACTURA',
        numero: numeroFactura,
        datosFacturacion: datosFacturacion || documentoActual.datosFacturacion,
        fecha: fechaFactura,
        createdAt: fechaFactura,
      },
      include: { factura_items: true, cliente: true, citas: true }
    })

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
    console.error('Error en conversión:', error)
    return NextResponse.json(
      { error: 'Error al convertir ticket a factura', message: error.message },
      { status: 500 }
    )
  }
}
