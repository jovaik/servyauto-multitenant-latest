export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { syncProveedoresRepuesto, repuestoInclude } from '@/lib/repuesto-proveedores'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await req.json()
    const data: any = {}
    if (body.nombre !== undefined) data.nombre = String(body.nombre).trim()
    if (body.referencia !== undefined) data.referencia = body.referencia?.trim() || null
    if (body.categoria !== undefined) data.categoria = (body.categoria || 'OTROS').trim()
    if (body.costeInterno !== undefined) data.costeInterno = parseFloat(body.costeInterno) || 0
    if (body.precioVenta !== undefined) data.precioVenta = parseFloat(body.precioVenta) || 0
    if (body.stock !== undefined) data.stock = body.stock === '' || body.stock === null ? null : parseInt(body.stock)
    if (body.activo !== undefined) data.activo = !!body.activo
    await prisma.repuesto.update({ where: { id: params.id }, data })
    if (Array.isArray(body.proveedores)) {
      await syncProveedoresRepuesto(params.id, body.proveedores)
    }
    const repuesto = await prisma.repuesto.findUnique({ where: { id: params.id }, include: repuestoInclude })
    return NextResponse.json(repuesto)
  } catch (e: any) {
    console.error('Error PUT repuesto:', e)
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    await prisma.repuesto.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Error DELETE repuesto:', e)
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 })
  }
}
