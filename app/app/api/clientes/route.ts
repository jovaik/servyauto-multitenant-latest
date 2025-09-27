
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

    const clientes = await prisma.cliente.findMany({
      include: {
        vehiculos: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    })

    return NextResponse.json(clientes || [])
  } catch (error) {
    console.error('Error fetching clients:', error)
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

    const body = await request.json()
    const { nombre, apellido, email, telefono, direccion, dni } = body

    // Validaciones básicas
    if (!nombre || !apellido || !telefono) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, apellido, telefono' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un cliente con el mismo email o teléfono
    if (email) {
      const existingClient = await prisma.cliente.findFirst({
        where: { email }
      })
      if (existingClient) {
        return NextResponse.json(
          { error: 'Ya existe un cliente con este email' },
          { status: 400 }
        )
      }
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre,
        apellido,
        email: email || null,
        telefono,
        direccion: direccion || null,
        dni: dni || null,
      },
      include: {
        vehiculos: true,
      }
    })

    return NextResponse.json(cliente, { status: 201 })

  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { error: 'Error al crear cliente' },
      { status: 500 }
    )
  }
}
