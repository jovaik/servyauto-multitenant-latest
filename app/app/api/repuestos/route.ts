export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { syncProveedoresRepuesto, repuestoInclude } from '@/lib/repuesto-proveedores'

// Catálogo COMÚN de repuestos (no filtra por local: es compartido)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const soloActivos = searchParams.get('activos') === '1'
    const repuestos = await prisma.repuesto.findMany({
      where: soloActivos ? { activo: true } : {},
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
      include: repuestoInclude,
    })
    return NextResponse.json(repuestos)
  } catch (e: any) {
    console.error('Error GET repuestos:', e)
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await req.json()
    const { nombre, referencia, categoria, costeInterno, precioVenta, stock } = body
    if (!nombre || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }
    const repuesto = await prisma.repuesto.create({
      data: {
        nombre: nombre.trim(),
        referencia: referencia?.trim() || null,
        categoria: (categoria || 'OTROS').trim(),
        costeInterno: parseFloat(costeInterno) || 0,
        precioVenta: parseFloat(precioVenta) || 0,
        stock: stock === '' || stock === null || stock === undefined ? null : parseInt(stock),
      },
    })
    if (Array.isArray(body.proveedores) && body.proveedores.length) {
      await syncProveedoresRepuesto(repuesto.id, body.proveedores)
    }
    const conProveedores = await prisma.repuesto.findUnique({ where: { id: repuesto.id }, include: repuestoInclude })
    return NextResponse.json(conProveedores, { status: 201 })
  } catch (e: any) {
    console.error('Error POST repuestos:', e)
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 })
  }
}
