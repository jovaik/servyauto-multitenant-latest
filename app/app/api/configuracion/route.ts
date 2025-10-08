import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // TODO: Funcionalidad de configuración pendiente de implementación
    return NextResponse.json({ configuraciones: [] })
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

    // TODO: Funcionalidad de configuración pendiente de implementación
    return NextResponse.json(
      { error: 'Funcionalidad no disponible' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error saving configuraciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
