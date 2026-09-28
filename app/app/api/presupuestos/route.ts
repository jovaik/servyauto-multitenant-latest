export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext, buildLocalFilter, getLocalIdForCreate } from '@/lib/local-context'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const localContext = await getLocalContext()
    const localFilter = localContext ? buildLocalFilter(localContext) : {}

    const presupuestos = await prisma.presupuesto.findMany({
      where: localFilter,
      include: {
        items: true,
        local: { select: { id: true, nombre: true } },
        cliente: { select: { id: true, nombre: true, apellido: true, telefono: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(presupuestos)
  } catch (error: any) {
    console.error('Error obteniendo presupuestos:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { clienteNombre, clienteTelefono, clienteEmail, clienteId, vehiculoInfo, validoHasta, observaciones, items } = body

    if (!clienteNombre || !items || items.length === 0) {
      return NextResponse.json({ error: 'Se requiere nombre del cliente y al menos un concepto' }, { status: 400 })
    }

    const localContext = await getLocalContext()
    const localId = localContext ? getLocalIdForCreate(localContext) : null

    const userEmail = session?.user?.email || ''
    const user = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true, name: true } })

    // Generate sequential number: PRES-YYYY-NNNN
    const year = new Date().getFullYear()
    const lastPres = await prisma.presupuesto.findFirst({
      where: { numero: { startsWith: `PRES-${year}-` } },
      orderBy: { numero: 'desc' },
    })
    let nextNum = 1
    if (lastPres) {
      const parts = lastPres.numero.split('-')
      nextNum = (parseInt(parts[2]) || 0) + 1
    }
    const numero = `PRES-${year}-${String(nextNum).padStart(4, '0')}`

    // Calculate totals
    let subtotal = 0
    const itemsData = items.map((item: any) => {
      const qty = item.cantidad || 1
      const price = parseFloat(item.precioUnitario) || 0
      const total = qty * price
      subtotal += total
      return {
        descripcion: item.descripcion,
        cantidad: qty,
        precioUnitario: price,
        total,
        servicioId: item.servicioId || null,
      }
    })
    const iva = Math.round(subtotal * 0.21 * 100) / 100
    const total = Math.round((subtotal + iva) * 100) / 100

    const presupuesto = await prisma.presupuesto.create({
      data: {
        numero,
        clienteNombre,
        clienteTelefono: clienteTelefono || null,
        clienteEmail: clienteEmail || null,
        clienteId: clienteId || null,
        vehiculoInfo: vehiculoInfo || null,
        validoHasta: validoHasta ? new Date(validoHasta) : null,
        observaciones: observaciones || null,
        subtotal,
        iva,
        total,
        localId,
        creadoPorId: user?.id || null,
        creadoPorNombre: user?.name || session?.user?.name || userEmail,
        items: { create: itemsData },
      },
      include: { items: true, local: { select: { id: true, nombre: true } } },
    })

    return NextResponse.json(presupuesto)
  } catch (error: any) {
    console.error('Error creando presupuesto:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
