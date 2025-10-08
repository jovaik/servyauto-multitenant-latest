
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
    const { nombre, apellido, email, telefono, direccion, documento } = body

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
        documento: documento || null,
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

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, nombre, apellido, email, telefono, direccion, documento } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID de cliente requerido' },
        { status: 400 }
      )
    }

    // Validaciones básicas
    if (!nombre || !apellido || !telefono) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, apellido, telefono' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un cliente con el mismo email (excluyendo el cliente actual)
    if (email) {
      const existingClient = await prisma.cliente.findFirst({
        where: { 
          email,
          NOT: { id }
        }
      })
      if (existingClient) {
        return NextResponse.json(
          { error: 'Ya existe un cliente con este email' },
          { status: 400 }
        )
      }
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        nombre,
        apellido,
        email: email || null,
        telefono,
        direccion: direccion || null,
        documento: documento || null,
      },
      include: {
        vehiculos: true,
      }
    })

    return NextResponse.json(cliente)

  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: 'Error al actualizar cliente' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de cliente requerido' },
        { status: 400 }
      )
    }

    // Verificar si el cliente tiene citas activas
    const citasActivas = await prisma.cita.findMany({
      where: {
        clienteId: id,
        estado: {
          in: ['PENDIENTE', 'COMPLETADA', 'EN_CURSO']
        }
      }
    })

    if (citasActivas.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar el cliente porque tiene citas activas' },
        { status: 400 }
      )
    }

    await prisma.cliente.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Cliente eliminado correctamente' })

  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: 'Error al eliminar cliente' },
      { status: 500 }
    )
  }
}
