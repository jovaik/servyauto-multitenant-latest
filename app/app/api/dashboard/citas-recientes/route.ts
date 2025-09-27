
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const citas = await prisma.cita.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        cliente: true,
        vehiculo: true,
      },
    })

    const citasFormateadas = citas?.map((cita) => ({
      id: cita.id,
      cliente: `${cita?.cliente?.nombre} ${cita?.cliente?.apellido}`,
      vehiculo: `${cita?.vehiculo?.marca} ${cita?.vehiculo?.modelo} - ${cita?.vehiculo?.matricula}`,
      hora: cita.horaInicio,
      estado: cita.estado,
    })) || []

    return NextResponse.json(citasFormateadas)
  } catch (error) {
    console.error('Error fetching recent appointments:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
