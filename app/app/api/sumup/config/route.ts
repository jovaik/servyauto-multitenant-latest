import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET - Obtener configuración de SumUp
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Buscar o crear configuración por defecto
    let config = await prisma.sumUpConfig.findFirst()
    
    if (!config) {
      config = await prisma.sumUpConfig.create({
        data: {
          modoAsignacion: 'COMPARTIDO',
          trackingPorLocal: true,
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

// PUT - Actualizar configuración (solo SUPER_ADMIN)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo SUPER_ADMIN puede cambiar la configuración
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || '' },
    })

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Solo el Super Admin puede modificar esta configuración' },
        { status: 403 }
      )
    }

    const { modoAsignacion, trackingPorLocal } = await request.json()

    // Buscar config existente
    let config = await prisma.sumUpConfig.findFirst()

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
