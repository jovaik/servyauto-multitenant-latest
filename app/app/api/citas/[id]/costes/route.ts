export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const TIPOS = ['SUBCONTRATA', 'RECAMBIO', 'OTRO']

// GET: listar costes internos de una cita + total
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const costes = await prisma.citaCosteInterno.findMany({
      where: { citaId: params.id },
      orderBy: { createdAt: 'asc' },
    })
    const totalCostes = costes.reduce((s: number, c: any) => s + (c.importe || 0), 0)

    return NextResponse.json({ costes, totalCostes: Math.round(totalCostes * 100) / 100 })
  } catch (error: any) {
    console.error('Error GET costes internos:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: registrar un coste interno (subcontrata / recambio / otro)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const cita = await prisma.cita.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!cita) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })

    const body = await req.json()
    const importe = parseFloat(body.importe)
    if (!importe || importe <= 0) {
      return NextResponse.json({ error: 'Importe inválido' }, { status: 400 })
    }
    const descripcion = (body.descripcion || '').trim().toUpperCase()
    if (!descripcion) {
      return NextResponse.json({ error: 'Descripción requerida' }, { status: 400 })
    }
    const tipo = TIPOS.includes(body.tipo) ? body.tipo : 'OTRO'
    const proveedor = (body.proveedor || '').trim().toUpperCase() || null

    const userEmail = session?.user?.email || ''
    const user = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true, name: true } })
    const userName = user?.name || session?.user?.name || userEmail

    const coste = await prisma.citaCosteInterno.create({
      data: {
        citaId: params.id,
        descripcion,
        importe,
        tipo,
        proveedor,
        creadoPorId: user?.id || null,
        creadoPorNombre: userName,
      },
    })

    const costes = await prisma.citaCosteInterno.findMany({ where: { citaId: params.id } })
    const totalCostes = costes.reduce((s: number, c: any) => s + (c.importe || 0), 0)

    return NextResponse.json({ coste, totalCostes: Math.round(totalCostes * 100) / 100 })
  } catch (error: any) {
    console.error('Error POST coste interno:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: eliminar un coste interno (por query param ?costeId=xxx)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const costeId = req.nextUrl.searchParams.get('costeId')
    if (!costeId) return NextResponse.json({ error: 'costeId requerido' }, { status: 400 })

    const coste = await prisma.citaCosteInterno.findUnique({ where: { id: costeId } })
    if (!coste || coste.citaId !== params.id) {
      return NextResponse.json({ error: 'Coste no encontrado' }, { status: 404 })
    }

    await prisma.citaCosteInterno.delete({ where: { id: costeId } })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Error DELETE coste interno:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
