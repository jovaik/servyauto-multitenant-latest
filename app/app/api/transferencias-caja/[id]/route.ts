export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logActivity, requireSuperAdminForDelete } from '@/lib/activity-logger'

// PATCH - marcar como devuelta / reabrir / editar
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { estado } = body

    const existente = await prisma.transferenciaCaja.findUnique({ where: { id: params.id } })
    if (!existente) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

    const userEmail = session?.user?.email || ''
    const user = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true, name: true } })
    const userName = user?.name || session?.user?.name || userEmail

    const data: any = {}
    if (estado === 'DEVUELTO') {
      data.estado = 'DEVUELTO'
      data.fechaDevolucion = new Date()
      data.devueltoPorNombre = userName
    } else if (estado === 'PENDIENTE') {
      data.estado = 'PENDIENTE'
      data.fechaDevolucion = null
      data.devueltoPorNombre = null
    }
    if (body.concepto !== undefined) data.concepto = String(body.concepto).trim().toUpperCase()
    if (body.observaciones !== undefined) data.observaciones = body.observaciones ? String(body.observaciones).trim().toUpperCase() : null

    const transferencia = await prisma.transferenciaCaja.update({
      where: { id: params.id },
      data,
      include: {
        origenLocal: { select: { id: true, nombre: true } },
        destinoLocal: { select: { id: true, nombre: true } },
      },
    })

    await logActivity({
      action: 'UPDATE',
      entity: 'TRANSFERENCIA_CAJA',
      entityId: transferencia.id,
      description: `Transferencia marcada ${transferencia.estado}`,
    }).catch(() => {})

    return NextResponse.json(transferencia)
  } catch (error: any) {
    console.error('Error actualizando transferencia:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guard = await requireSuperAdminForDelete()
    if (guard) return guard

    await prisma.transferenciaCaja.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Error eliminando transferencia:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
