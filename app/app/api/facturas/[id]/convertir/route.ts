
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // TODO: Funcionalidad de conversión de tickets a facturas pendiente de implementación
    return NextResponse.json(
      { error: 'Funcionalidad no disponible' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error converting ticket to factura:', error)
    return NextResponse.json(
      { error: 'Error al convertir ticket a factura' },
      { status: 500 }
    )
  }
}
