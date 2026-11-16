export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notificarCreacionGSControl } from '@/lib/gscontrol-sync'
import { logActivity } from '@/lib/activity-logger'

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
    const body = await request.json().catch(() => ({}))
    const { datosFacturacion } = body

    // Emitir hoy, pero conservar el cobro del ticket y su trazabilidad original.
    const facturaConvertida = await prisma.$transaction(async (tx) => {
      const fechaFactura = new Date()
      const año = new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: 'Europe/Madrid' }).format(fechaFactura)
      const serie = `FAC-${año}-`
      // Mismo bloqueo de serie que la emisión agrupada.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${serie}))`
      await tx.$queryRaw`SELECT id FROM facturas WHERE id = ${params.id} FOR UPDATE`
      const original = await tx.factura.findUniqueOrThrow({ where: { id: params.id } })
      if (original.tipo !== 'TICKET') throw new Error('El ticket ya se ha convertido. Recarga el listado.')
      const documentos = await tx.factura.findMany({ where: { numero: { startsWith: serie } }, select: { numero: true } })
      const referencias = await tx.factura_items.findMany({ where: { id: { startsWith: serie } }, select: { id: true } })
      const siguiente = Math.max(0, ...documentos.map(d => parseInt(d.numero.split('-')[2]) || 0), ...referencias.map(r => parseInt(r.id.split('-')[2]) || 0)) + 1
      return tx.factura.update({
        where: { id: params.id },
        data: {
          tipo: 'FACTURA',
          numero: `${serie}${siguiente.toString().padStart(4, '0')}`,
          datosFacturacion: datosFacturacion || original.datosFacturacion,
          fecha: fechaFactura,
          // Tickets históricos sin fechaPago ya contabilizaban el cobro en fecha.
          fechaPago: original.fechaPago ?? (original.estado === 'PAGADA' ? original.fecha : null),
        },
        include: { factura_items: true, cliente: true, citas: true },
      })
    })

    console.log('=== CONVERSIÓN EXITOSA ===')
    console.log('De:', documentoActual.numero, '→ A:', facturaConvertida.numero)

    // 🔄 SINCRONIZAR CON GSCONTROL - CÓDIGO EXACTO DEL PDF
    const descripcionFactura = `${facturaConvertida.tipo}: ${facturaConvertida.numero} - ${facturaConvertida.cliente.nombre} ${facturaConvertida.cliente.apellido || ''}`
    await notificarCreacionGSControl({
      id: facturaConvertida.id,
      esIngreso: true,
      fecha: facturaConvertida.fechaPago || facturaConvertida.fecha,
      importe: facturaConvertida.total,
      descripcion: descripcionFactura
    })

    logActivity({ action: 'CONVERT', entity: 'FACTURA', entityId: params.id, description: `Ticket convertido a Factura` }).catch(() => {})

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
