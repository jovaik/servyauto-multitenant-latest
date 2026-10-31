export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext, buildLocalFilter } from '@/lib/local-context'

// GET: todos los pagos parciales (para diario de caja)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const context = await getLocalContext()
    if (!context) return NextResponse.json([])
    const pagos = await prisma.pagoParcial.findMany({
      where: { cita: buildLocalFilter(context) },
      include: {
        cita: {
          select: {
            id: true,
            total: true,
            localId: true,
            facturaAgrupadaId: true,
            cliente: { select: { nombre: true } },
          },
        },
      },
      orderBy: { fecha: 'desc' },
    })

    const result = pagos.map((p: any) => ({
      id: p.id,
      citaId: p.citaId,
      facturaAgrupadaId: p.cita?.facturaAgrupadaId || null,
      importe: p.importe,
      metodoPago: p.metodoPago,
      tpvNombre: p.tpvNombre || null,
      fecha: p.fecha,
      concepto: p.concepto,
      creadoPorNombre: p.creadoPorNombre,
      createdAt: p.createdAt,
      clienteNombre: p.cita?.cliente?.nombre || 'CLIENTE',
      localId: p.cita?.localId || null,
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error GET pagos-parciales:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
