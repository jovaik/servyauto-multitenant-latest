import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext } from '@/lib/local-context'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const localContext = await getLocalContext()
    const tenantId = localContext?.tenantId || null
    const tenantFilter = tenantId ? { tenantId } : {}

    let config = await prisma.sumUpConfig.findFirst({ where: tenantFilter })

    if (!config) {
      config = await prisma.sumUpConfig.create({
        data: {
          modoAsignacion: 'COMPARTIDO',
          trackingPorLocal: true,
          ...(tenantId ? { tenantId } : {})
        },
      })
    }

    return NextResponse.json({ config })
  } catch (error: any) {
    console.error('Error obteniendo config SumUp:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener configuración' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const localContext = await getLocalContext()
    const tenantId = localContext?.tenantId || null
    const tenantFilter = tenantId ? { tenantId } : {}

    const user = await prisma.user.findFirst({
      where: { email: session.user?.email || '', ...(tenantId ? { tenantId } : {}) },
    })

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Solo el Super Admin puede modificar esta configuración' },
        { status: 403 }
      )
    }

    const { modoAsignacion, trackingPorLocal } = await request.json()

    let config = await prisma.sumUpConfig.findFirst({ where: tenantFilter })

    if (config) {
      config = await prisma.sumUpConfig.update({
        where: { id: config.id },
        data: {
          modoAsignacion: modoAsignacion || config.modoAsignacion,
          trackingPorLocal: trackingPorLocal !== undefined ? trackingPorLocal : config.trackingPorLocal,
        },
      })
    } else {
      config = await prisma.sumUpConfig.create({
        data: {
          modoAsignacion: modoAsignacion || 'COMPARTIDO',
          trackingPorLocal: trackingPorLocal !== undefined ? trackingPorLocal : true,
          ...(tenantId ? { tenantId } : {})
        },
      })
    }

    return NextResponse.json({ config })
  } catch (error: any) {
    console.error('Error actualizando config SumUp:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar configuración' },
      { status: 500 }
    )
  }
}
