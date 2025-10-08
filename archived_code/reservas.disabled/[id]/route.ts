
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { estado } = body

    if (!estado || !['PENDIENTE', 'CONFIRMADA', 'CANCELADA'].includes(estado)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      )
    }

    // Verificar si la reserva existe
    const reservaExistente = await prisma.reserva.findUnique({
      where: { id: params.id },
    })

    if (!reservaExistente) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      )
    }

    // Actualizar el estado
    const reserva = await prisma.reserva.update({
      where: { id: params.id },
      data: {
        estado,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(reserva)
  } catch (error) {
    console.error('Error updating reservation:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar si la reserva existe
    const reservaExistente = await prisma.reserva.findUnique({
      where: { id: params.id },
    })

    if (!reservaExistente) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar la reserva
    await prisma.reserva.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Reserva eliminada correctamente' })
  } catch (error) {
    console.error('Error deleting reservation:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
