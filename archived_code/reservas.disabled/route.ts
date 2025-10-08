
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Solo para usuarios autenticados (dashboard interno)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const reservas = await prisma.reserva.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(reservas || [])
  } catch (error) {
    console.error('Error fetching reservations:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Público (para clientes externos)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      nombre,
      apellido,
      email,
      telefono,
      fecha,
      hora,
      vehiculo,
      servicio,
      mensaje
    } = body

    // Validar campos requeridos
    if (!nombre || !apellido || !email || !telefono || !fecha || !hora || !vehiculo || !servicio) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      )
    }

    // Validar fecha (no puede ser en el pasado)
    const fechaReserva = new Date(fecha)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    
    if (fechaReserva < hoy) {
      return NextResponse.json(
        { error: 'No se pueden hacer reservas para fechas pasadas' },
        { status: 400 }
      )
    }

    // Crear la reserva
    const reserva = await prisma.reserva.create({
      data: {
        nombre,
        apellido,
        email,
        telefono,
        fecha: fechaReserva,
        hora,
        vehiculo,
        servicio,
        mensaje: mensaje || null,
        estado: 'PENDIENTE',
      }
    })

    return NextResponse.json(
      { 
        message: 'Reserva creada exitosamente',
        id: reserva.id 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating reservation:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
