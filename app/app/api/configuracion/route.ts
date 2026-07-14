import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const configuraciones = await prisma.configuracion.findMany({
      orderBy: {
        categoria: 'asc'
      }
    })

    return NextResponse.json(configuraciones)
  } catch (error) {
    console.error('Error fetching configuraciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const configData = await request.json()

    // Validar que configData sea un array
    if (!Array.isArray(configData)) {
      return NextResponse.json(
        { error: 'Formato de datos inválido' },
        { status: 400 }
      )
    }

    // Guardar o actualizar cada configuración usando upsert
    const results = await Promise.all(
      configData.map((config) =>
        prisma.configuracion.upsert({
          where: { clave: config.clave },
          update: {
            valor: config.valor,
            tipo: config.tipo,
            categoria: config.categoria,
            descripcion: config.descripcion
          },
          create: {
            clave: config.clave,
            valor: config.valor,
            tipo: config.tipo,
            categoria: config.categoria,
            descripcion: config.descripcion
          }
        })
      )
    )

    const claves = configData.map((c: any) => c.clave).join(', ')
    logActivity({ action: 'CONFIG', entity: 'CONFIGURACION', description: `Configuración actualizada: ${claves}` }).catch(() => {})

    return NextResponse.json({ 
      success: true, 
      message: 'Configuración guardada correctamente',
      count: results.length
    })
  } catch (error) {
    console.error('Error saving configuraciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
