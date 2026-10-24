export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await req.json()
    const data: any = {}
    if (body.nombre !== undefined) data.nombre = String(body.nombre).trim()
    if (body.categoria !== undefined) data.categoria = (body.categoria || 'OTROS').trim()
    if (body.activo !== undefined) data.activo = !!body.activo
    const tipo = await prisma.tipoServicio.update({ where: { id: parseInt(params.id) }, data })
    return NextResponse.json(tipo)
  } catch (e: any) {
    console.error('Error PUT tipo-servicio:', e)
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    await prisma.tipoServicio.delete({ where: { id: parseInt(params.id) } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Error DELETE tipo-servicio:', e)
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 })
  }
}
