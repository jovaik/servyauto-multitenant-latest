export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        local: true,
        cliente: { select: { id: true, nombre: true, apellido: true, telefono: true, email: true } },
      },
    })
    if (!presupuesto) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    return NextResponse.json(presupuesto)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { clienteNombre, clienteTelefono, clienteEmail, clienteId, vehiculoInfo, validoHasta, observaciones, items, estado } = body

    const updateData: any = {}
    if (clienteNombre !== undefined) updateData.clienteNombre = clienteNombre
    if (clienteTelefono !== undefined) updateData.clienteTelefono = clienteTelefono
    if (clienteEmail !== undefined) updateData.clienteEmail = clienteEmail
    if (clienteId !== undefined) updateData.clienteId = clienteId || null
    if (vehiculoInfo !== undefined) updateData.vehiculoInfo = vehiculoInfo
    if (validoHasta !== undefined) updateData.validoHasta = validoHasta ? new Date(validoHasta) : null
    if (observaciones !== undefined) updateData.observaciones = observaciones
    if (estado !== undefined) updateData.estado = estado

    // Recalculate if items changed
    if (items && Array.isArray(items)) {
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
      updateData.subtotal = subtotal
      updateData.iva = iva
      updateData.total = Math.round((subtotal + iva) * 100) / 100

      // Replace items
      await prisma.presupuestoItem.deleteMany({ where: { presupuestoId: params.id } })
      await prisma.presupuestoItem.createMany({
        data: itemsData.map((i: any) => ({ ...i, presupuestoId: params.id })),
      })
    }

    const presupuesto = await prisma.presupuesto.update({
      where: { id: params.id },
      data: updateData,
      include: { items: true, local: { select: { id: true, nombre: true } } },
    })

    return NextResponse.json(presupuesto)
  } catch (error: any) {
    console.error('Error actualizando presupuesto:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    await prisma.presupuesto.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
