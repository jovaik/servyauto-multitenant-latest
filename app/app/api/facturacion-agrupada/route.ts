export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notificarCreacionGSControl } from '@/lib/gscontrol-sync'
import { getLocalContext, buildLocalFilter, getLocalIdForCreate } from '@/lib/local-context'
import { logActivity } from '@/lib/activity-logger'

// Construye el texto de servicios de una cita (catálogo + líneas manuales)
function describirServicios(cita: any): string {
  const nombres: string[] = []
  for (const cs of cita.cita_servicios || []) {
    const n = cs?.servicios?.nombre
    if (n) nombres.push(n)
  }
  for (const lm of cita.lineasManuales || []) {
    if (lm?.descripcion) nombres.push(lm.descripcion)
  }
  return nombres.length > 0 ? nombres.join(', ') : 'Servicio'
}

// GET: dos modos
//  - sin clienteId  -> lista de clientes con servicios pendientes de agrupar
//  - con clienteId  -> citas facturables del cliente en el rango
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const localContext = await getLocalContext()
    if (!localContext) {
      return NextResponse.json({ clientes: [], citas: [] })
    }
    const localFilter = buildLocalFilter(localContext)

    const { searchParams } = new URL(req.url)
    const clienteId = searchParams.get('clienteId')
    const desdeStr = searchParams.get('desde')
    const hastaStr = searchParams.get('hasta')

    const fechaFilter: any = {}
    if (desdeStr) fechaFilter.gte = new Date(`${desdeStr}T00:00:00`)
    if (hastaStr) fechaFilter.lte = new Date(`${hastaStr}T23:59:59`)

    // Filtro base de citas facturables (trabajo hecho, sin factura individual ni ya agrupada)
    const baseWhere: any = {
      ...localFilter,
      estado: { notIn: ['CANCELADA', 'NO_SHOW'] },
      total: { gt: 0 },
      facturas: { is: null },
      facturaAgrupadaId: null,
    }
    if (Object.keys(fechaFilter).length > 0) baseWhere.fecha = fechaFilter

    // ---- MODO LISTA PLANA (pendientes de facturar, una fila por venta) ----
    if (searchParams.get('flat')) {
      const citas = await prisma.cita.findMany({
        where: baseWhere,
        include: {
          cliente: {
            select: {
              id: true, nombre: true, apellido: true, telefono: true,
              documento: true, direccion: true, email: true, clienteEmpresa: true,
            },
          },
          vehiculo: { select: { matricula: true, marca: true, modelo: true } },
          cita_servicios: { include: { servicios: { select: { nombre: true } } } },
          lineasManuales: true,
          local: { select: { nombre: true } },
        },
        orderBy: { fecha: 'desc' },
      })
      const out = citas.map((c: any) => ({
        id: c.id,
        fecha: c.fecha,
        estado: c.estado,
        total: c.total || 0,
        servicios: describirServicios(c),
        vehiculo: c.vehiculo
          ? { matricula: c.vehiculo.matricula, marca: c.vehiculo.marca, modelo: c.vehiculo.modelo }
          : null,
        local: c.local ? { nombre: c.local.nombre } : null,
        cliente: c.cliente,
      }))
      return NextResponse.json({ citas: out })
    }

    // ---- MODO CLIENTES ----
    if (!clienteId) {
      const citas = await prisma.cita.findMany({
        where: baseWhere,
        select: { clienteId: true, total: true },
      })
      const resumen = new Map<string, { count: number; total: number }>()
      for (const c of citas) {
        const r = resumen.get(c.clienteId) || { count: 0, total: 0 }
        r.count += 1
        r.total += c.total || 0
        resumen.set(c.clienteId, r)
      }
      const ids = Array.from(resumen.keys())
      const clientes = ids.length > 0
        ? await prisma.cliente.findMany({
            where: { id: { in: ids } },
            select: {
              id: true, nombre: true, apellido: true, telefono: true,
              documento: true, direccion: true, email: true, clienteEmpresa: true,
            },
          })
        : []
      const result = clientes.map((cl: any) => ({
        ...cl,
        numCitas: resumen.get(cl.id)?.count || 0,
        totalPendiente: resumen.get(cl.id)?.total || 0,
      }))
      // Empresas/profesionales primero, luego por nº de citas pendientes
      result.sort((a: any, b: any) => {
        if (a.clienteEmpresa !== b.clienteEmpresa) return a.clienteEmpresa ? -1 : 1
        return b.numCitas - a.numCitas
      })
      return NextResponse.json({ clientes: result })
    }

    // ---- MODO CITAS DE UN CLIENTE ----
    const citas = await prisma.cita.findMany({
      where: { ...baseWhere, clienteId },
      include: {
        vehiculo: { select: { matricula: true, marca: true, modelo: true } },
        cita_servicios: { include: { servicios: { select: { nombre: true } } } },
        lineasManuales: true,
      },
      orderBy: { fecha: 'asc' },
    })

    const citasOut = citas.map((c: any) => ({
      id: c.id,
      fecha: c.fecha,
      matricula: c.vehiculo?.matricula || '',
      marca: c.vehiculo?.marca || '',
      modelo: c.vehiculo?.modelo || '',
      servicios: describirServicios(c),
      total: c.total || 0,
    }))

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: {
        id: true, nombre: true, apellido: true, telefono: true,
        documento: true, direccion: true, email: true, clienteEmpresa: true,
      },
    })

    return NextResponse.json({ cliente, citas: citasOut })
  } catch (error: any) {
    console.error('Error en facturacion-agrupada GET:', error)
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 })
  }
}

// POST: crea UN ticket o factura agrupada con una línea por cita y bloquea esas citas
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { clienteId, citaIds, metodoPago, datosFacturacion, tipo = 'FACTURA', tpvUserId, tpvNombre } = body

    if (tipo !== 'TICKET' && tipo !== 'FACTURA') {
      return NextResponse.json({ error: 'Selecciona Ticket o Factura' }, { status: 400 })
    }
    const nombreDocumento = tipo === 'TICKET' ? 'Ticket agrupado' : 'Factura agrupada'

    if (!clienteId || !Array.isArray(citaIds) || citaIds.length === 0) {
      return NextResponse.json({ error: 'Faltan clienteId o citaIds' }, { status: 400 })
    }

    const localContext = await getLocalContext()
    const localFilter = localContext ? buildLocalFilter(localContext) : {}
    const localIdParaFactura = localContext ? getLocalIdForCreate(localContext) : null

    // Cargar las citas seleccionadas (verificando que son facturables y del cliente)
    const citas = await prisma.cita.findMany({
      where: {
        id: { in: citaIds },
        clienteId,
        ...localFilter,
        facturas: { is: null },
        facturaAgrupadaId: null,
      },
      include: {
        vehiculo: { select: { matricula: true, marca: true, modelo: true } },
        cita_servicios: { include: { servicios: { select: { nombre: true } } } },
        lineasManuales: true,
      },
      orderBy: { fecha: 'asc' },
    })

    if (citas.length !== new Set(citaIds).size || citas.length === 0) {
      return NextResponse.json({ error: 'No hay citas facturables en la selección' }, { status: 400 })
    }

    if (new Set(citas.map(c => c.localId)).size !== 1) {
      return NextResponse.json({ error: 'Agrupa únicamente servicios del mismo local' }, { status: 400 })
    }
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } })
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Construir items (una línea por cita). Los precios incluyen IVA.
    const fmtFecha = (d: Date) => {
      const dd = String(new Date(d).getDate()).padStart(2, '0')
      const mm = String(new Date(d).getMonth() + 1).padStart(2, '0')
      const yy = new Date(d).getFullYear()
      return `${dd}/${mm}/${yy}`
    }
    const items = citas.map((c: any) => {
      const veh = [c.vehiculo?.matricula, c.vehiculo?.marca, c.vehiculo?.modelo].filter(Boolean).join(' ')
      const desc = `${fmtFecha(c.fecha)} · ${veh || 'VEHÍCULO'} · ${describirServicios(c)}`.toUpperCase()
      const precio = c.total || 0
      return { descripcion: desc, cantidad: 1, precio, total: precio }
    })

    const total = items.reduce((s, it) => s + it.total, 0)
    const subtotal = total / 1.21
    const iva = total - subtotal

    // Conservar las series existentes: TICK para tickets y FAC para facturas.
    const anio = new Date().getFullYear()
    const prefijo = tipo === 'TICKET' ? 'TICK' : 'FAC'
    const ultimo = await prisma.factura.findFirst({
      where: { numero: { startsWith: `${prefijo}-${anio}-` } },
      orderBy: { createdAt: 'desc' },
    })
    let secuencia = 1
    if (ultimo) {
      const partes = ultimo.numero.split('-')
      if (partes.length === 3 && partes[0] === prefijo) secuencia = (parseInt(partes[2]) || 0) + 1
    }
    const numero = `${prefijo}-${anio}-${secuencia.toString().padStart(4, '0')}`

    // Datos fiscales del cliente para la factura
    const datos = datosFacturacion && Object.keys(datosFacturacion).length > 0
      ? datosFacturacion
      : {
          nombreFiscal: `${cliente.nombre} ${cliente.apellido || ''}`.trim().toUpperCase(),
          nif: cliente.documento || '',
          direccion: cliente.direccion || '',
          telefono: cliente.telefono || '',
        }

    // ¿Cobrada ya o pendiente de cobro (a mes vencido)?
    const metodoValido = ['EFECTIVO', 'TPV_SUMUP', 'TPV_UNICAJA', 'REVOLUT'].includes(metodoPago)
    const estado = metodoValido ? 'PAGADA' : 'PENDIENTE'

    const factura = await prisma.$transaction(async (tx) => {
      // Bloquear filas antes de emitir: una selección concurrente nunca crea otro documento.
      const bloqueadas = await tx.cita.updateMany({
        where: { id: { in: citas.map(c => c.id) }, facturaAgrupadaId: null, facturas: { is: null }, ...localFilter },
        data: { estado: 'COMPLETADA' },
      })
      if (bloqueadas.count !== citas.length) throw new Error('Algún servicio ya ha sido facturado. Recarga la selección.')
      const documento = await tx.factura.create({
      data: {
        numero,
        tipo,
        subtotal,
        iva,
        total,
        estado: estado as any,
        metodoPago: metodoValido ? (metodoPago as any) : null,
        fechaPago: metodoValido ? new Date() : null,
        datosFacturacion: JSON.stringify(datos),
        clienteId,
        citaId: null,
        localId: citas[0].localId || localIdParaFactura,
        tpvUserId: metodoValido && metodoPago !== 'EFECTIVO' ? tpvUserId || null : null,
        tpvNombre: metodoValido && metodoPago !== 'EFECTIVO' ? tpvNombre || null : null,
        creadoPorId: (session.user as any)?.id || null,
        creadoPorNombre: session.user?.name || session.user?.email || 'Sistema',
        factura_items: {
          create: items.map((item, index) => ({
            id: `${numero}-${index + 1}`,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio: item.precio,
            total: item.total,
          })),
        },
      },
      include: { cliente: true, factura_items: true, local: true },
    })

      // Finalizar el trabajo NO implica cobrar: manda el estado del documento.
      await tx.cita.updateMany({
        where: { id: { in: citas.map(c => c.id) } },
        data: {
          facturaAgrupadaId: documento.id,
          estado: 'COMPLETADA',
          cobroDiferido: !metodoValido,
          metodoPago: metodoValido ? metodoPago : null,
          completadoPorId: (session.user as any)?.id || null,
          completadoPorNombre: session.user?.name || session.user?.email || 'Sistema',
        },
      })
      return documento
    })

    // Solo notificar a GSControl como ingreso si realmente se ha cobrado
    if (metodoValido) {
      const clienteNombreCompleto = `${factura.cliente.nombre} ${factura.cliente.apellido || ''}`.trim()
      await notificarCreacionGSControl({
        id: factura.id,
        esIngreso: true,
        fecha: factura.createdAt,
        importe: factura.total,
        descripcion: `${nombreDocumento.toUpperCase()}: ${factura.numero} - ${clienteNombreCompleto}`,
        documentType: tipo,
        invoiceNumber: tipo === 'FACTURA' ? factura.numero : undefined,
        clientName: clienteNombreCompleto || undefined,
        clientDni: factura.cliente.documento || undefined,
      }).catch(() => {})
    }

    logActivity({
      action: 'CREATE',
      entity: 'FACTURA',
      entityId: factura.id,
      description: `${nombreDocumento} ${factura.numero} - ${citas.length} servicios - Total: ${factura.total.toFixed(2)}€`,
    }).catch(() => {})

    return NextResponse.json({
      ok: true,
      facturaId: factura.id,
      numero: factura.numero,
      tipo: factura.tipo,
      total: factura.total,
      numServicios: citas.length,
      estado,
    })
  } catch (error: any) {
    console.error('Error en facturacion-agrupada POST:', error)
    return NextResponse.json({ error: error.message || 'Error al crear el documento agrupado' }, { status: 500 })
  }
}
