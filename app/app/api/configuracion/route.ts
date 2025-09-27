
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const configuraciones = await prisma.configuracion.findMany({
      orderBy: [
        { categoria: 'asc' },
        { clave: 'asc' }
      ]
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

    const configuraciones = await request.json()

    if (!Array.isArray(configuraciones)) {
      return NextResponse.json(
        { error: 'Se esperaba un array de configuraciones' },
        { status: 400 }
      )
    }

    // Actualizar configuraciones usando upsert (crear o actualizar)
    const results = await Promise.all(
      configuraciones.map(async (config: any) => {
        const { clave, valor, tipo, categoria, descripcion } = config
        
        return await prisma.configuracion.upsert({
          where: { clave },
          update: {
            valor,
            tipo,
            categoria,
            descripcion
          },
          create: {
            clave,
            valor,
            tipo,
            categoria,
            descripcion
          }
        })
      })
    )

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error saving configuraciones:', error)
    return NextResponse.json(
      { error: 'Error al guardar configuraciones' },
      { status: 500 }
    )
  }
}
