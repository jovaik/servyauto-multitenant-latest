export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext, getAllowedLocalIds } from '@/lib/local-context'
import { logActivity } from '@/lib/activity-logger'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const ctx = await getLocalContext()
    const allowed = ctx ? getAllowedLocalIds(ctx) : null

    const where = allowed === null
      ? {}
      : { OR: [{ origenLocalId: { in: allowed } }, { destinoLocalId: { in: allowed } }] }

    const transferencias = await prisma.transferenciaCaja.findMany({
      where,
      include: {
        origenLocal: { select: { id: true, nombre: true } },
        destinoLocal: { select: { id: true, nombre: true } },
      },
      orderBy: { fecha: 'desc' },
    })

    return NextResponse.json(transferencias)
  } catch (error: any) {
    console.error('Error obteniendo transferencias:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { origenLocalId, destinoLocalId, importe, concepto, tipo, observaciones, fecha } = body

    if (!origenLocalId || !destinoLocalId) {
      return NextResponse.json({ error: 'Se requiere local de origen y destino' }, { status: 400 })
    }
    if (origenLocalId === destinoLocalId) {
      return NextResponse.json({ error: 'El origen y el destino deben ser locales distintos' }, { status: 400 })
    }
    const importeNum = parseFloat(importe)
    if (!importeNum || importeNum <= 0) {
      return NextResponse.json({ error: 'El importe debe ser mayor que 0' }, { status: 400 })
    }

    const userEmail = session?.user?.email || ''
    const user = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true, name: true } })
    const userName = user?.name || session?.user?.name || userEmail

    const transferencia = await prisma.transferenciaCaja.create({
      data: {
        origenLocalId,
        destinoLocalId,
        importe: Math.round(importeNum * 100) / 100,
        concepto: (concepto || 'TRANSFERENCIA DE CAJA').trim().toUpperCase(),
        tipo: tipo === 'APORTACION' ? 'APORTACION' : 'PRESTAMO',
        observaciones: observaciones ? String(observaciones).trim().toUpperCase() : null,
        fecha: fecha ? new Date(fecha) : new Date(),
        creadoPorId: user?.id || null,
        creadoPorNombre: userName,
      },
      include: {
        origenLocal: { select: { id: true, nombre: true } },
        destinoLocal: { select: { id: true, nombre: true } },
      },
    })

    await logActivity({
      action: 'CREATE',
      entity: 'TRANSFERENCIA_CAJA',
      entityId: transferencia.id,
      description: `Transferencia ${transferencia.tipo} de ${transferencia.origenLocal.nombre} a ${transferencia.destinoLocal.nombre}: ${transferencia.importe}€`,
    }).catch(() => {})

    return NextResponse.json(transferencia)
  } catch (error: any) {
    console.error('Error creando transferencia:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
