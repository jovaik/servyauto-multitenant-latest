export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notificarCreacionGSControl } from '@/lib/gscontrol-sync'
import { logActivity } from '@/lib/activity-logger'

// POST /api/presupuestos/[id]/convertir
// Body: { tipo: 'TICKET' | 'FACTURA', metodoPago?: string }
// Convierte un presupuesto en un documento (ticket o factura) a partir de sus conceptos
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const tipo: 'TICKET' | 'FACTURA' = body?.tipo === 'FACTURA' ? 'FACTURA' : 'TICKET'
    const metodoPago: string | null = body?.metodoPago || null

    // Buscar el presupuesto con sus items
    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id: params.id },
      include: { items: true, cliente: true },
    })

    if (!presupuesto) {
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
    }

    if (presupuesto.estado === 'CONVERTIDO') {
      return NextResponse.json({ error: 'Este presupuesto ya fue convertido' }, { status: 400 })
    }

    if (!presupuesto.items || presupuesto.items.length === 0) {
      return NextResponse.json({ error: 'El presupuesto no tiene conceptos' }, { status: 400 })
    }

    // ── Resolver cliente (Factura.clienteId es obligatorio) ──
    let clienteId = presupuesto.clienteId || null

    if (!clienteId) {
      const telefono = (presupuesto.clienteTelefono || '').trim()
      const nombreMayus = (presupuesto.clienteNombre || 'CLIENTE').trim().toUpperCase()

      // Intentar localizar un cliente existente por teléfono dentro del mismo local
      let clienteExistente = null
      if (telefono) {
        clienteExistente = await prisma.cliente.findFirst({
          where: {
            telefono,
            ...(presupuesto.localId ? { localId: presupuesto.localId } : {}),
          },
        })
      }

      if (clienteExistente) {
        clienteId = clienteExistente.id
      } else {
        const nuevoCliente = await prisma.cliente.create({
          data: {
            nombre: nombreMayus,
            telefono: telefono || 'SIN TELÉFONO',
            email: presupuesto.clienteEmail || null,
            localId: presupuesto.localId || null,
            creadoPorId: (session.user as any)?.id || null,
            creadoPorNombre: session.user?.name || session.user?.email || 'Sistema',
          },
        })
        clienteId = nuevoCliente.id
      }
    }

    // ── Generar número de documento (TKT-YYYY-NNNN o FAC-YYYY-NNNN) ──
    const año = new Date().getFullYear()
    const prefijo = tipo === 'FACTURA' ? 'FAC' : 'TKT'

    const documentosDelAño = await prisma.factura.findMany({
      where: { numero: { startsWith: `${prefijo}-${año}-` } },
      select: { numero: true },
    })

    let numeroSecuencia = 1
    if (documentosDelAño.length > 0) {
      const numeros = documentosDelAño.map((d: any) => {
        const partes = d.numero.split('-')
        return partes.length === 3 ? (parseInt(partes[2]) || 0) : 0
      })
      numeroSecuencia = Math.max(...numeros) + 1
    }

    const numero = `${prefijo}-${año}-${numeroSecuencia.toString().padStart(4, '0')}`

    // ── Totales: se toman directamente del presupuesto (ya calculados con IVA 21%) ──
    const subtotal = presupuesto.subtotal
    const iva = presupuesto.iva
    const total = presupuesto.total

    const pagado = !!metodoPago

    // ── Crear el documento con sus items ──
    const factura = await prisma.factura.create({
      data: {
        numero,
        tipo,
        subtotal,
        iva,
        total,
        metodoPago: metodoPago as any,
        estado: pagado ? 'PAGADA' : 'PENDIENTE',
        fechaPago: pagado ? new Date() : null,
        clienteId: clienteId as string,
        localId: presupuesto.localId || null,
        creadoPorId: (session.user as any)?.id || null,
        creadoPorNombre: session.user?.name || session.user?.email || 'Sistema',
        factura_items: {
          create: presupuesto.items.map((item: any, index: number) => ({
            id: `${numero}-${index + 1}`,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio: item.precioUnitario,
            total: item.total,
          })),
        },
      },
      include: {
        cliente: true,
        factura_items: true,
        local: true,
      },
    })

    // ── Marcar el presupuesto como CONVERTIDO ──
    await prisma.presupuesto.update({
      where: { id: params.id },
      data: { estado: 'CONVERTIDO' },
    })

    // ── Sincronizar con GSControl como INGRESO ──
    const clienteNombreCompleto = `${factura.cliente.nombre} ${factura.cliente.apellido || ''}`.trim()
    const descripcionFactura = `${factura.tipo}: ${factura.numero} - ${clienteNombreCompleto}`
    await notificarCreacionGSControl({
      id: factura.id,
      esIngreso: true,
      fecha: factura.createdAt,
      importe: factura.total,
      descripcion: descripcionFactura,
      documentType: factura.tipo,
      invoiceNumber: factura.tipo === 'FACTURA' ? factura.numero : undefined,
      clientName: clienteNombreCompleto || undefined,
      clientDni: factura.cliente.documento || undefined,
    })

    logActivity({
      action: 'CONVERT',
      entity: 'PRESUPUESTO',
      entityId: params.id,
      description: `Presupuesto ${presupuesto.numero} convertido a ${tipo} ${numero}`,
    }).catch(() => {})

    return NextResponse.json(factura, { status: 201 })
  } catch (error: any) {
    console.error('Error convirtiendo presupuesto:', error)
    return NextResponse.json(
      { error: 'Error al convertir presupuesto', message: error.message },
      { status: 500 }
    )
  }
}
