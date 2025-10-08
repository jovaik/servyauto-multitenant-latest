
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

    const vehiculos = await prisma.vehiculo.findMany({
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            telefono: true,
          }
        },
      },
      orderBy: [
        { marca: 'asc' },
        { modelo: 'asc' },
      ],
    })

    return NextResponse.json(vehiculos || [])
  } catch (error) {
    console.error('Error fetching vehicles:', error)
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
    const { 
      marca, 
      modelo, 
      matricula, 
      anio, 
      color, 
      kilometraje, 
      motor, 
      combustible, 
      observaciones,
      clienteId 
    } = body

    // Validaciones básicas
    if (!marca || !modelo || !matricula || !clienteId) {
      return NextResponse.json(
        { error: 'Campos requeridos: marca, modelo, matricula, clienteId' },
        { status: 400 }
      )
    }

    // Verificar si el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId }
    })

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un vehículo con la misma matrícula
    const existingVehicle = await prisma.vehiculo.findFirst({
      where: { matricula: matricula.toUpperCase() }
    })

    if (existingVehicle) {
      return NextResponse.json(
        { error: 'Ya existe un vehículo con esta matrícula' },
        { status: 400 }
      )
    }

    const vehiculo = await prisma.vehiculo.create({
      data: {
        marca,
        modelo,
        matricula: matricula.toUpperCase(),
        anio: anio || new Date().getFullYear(),
        color: color || null,
        kilometraje: kilometraje || null,
        clienteId,
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            telefono: true,
          }
        },
      }
    })

    return NextResponse.json(vehiculo, { status: 201 })

  } catch (error) {
    console.error('Error creating vehicle:', error)
    return NextResponse.json(
      { error: 'Error al crear vehículo' },
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
    const { 
      id,
      marca, 
      modelo, 
      matricula, 
      anio, 
      color, 
      kilometraje, 
      motor, 
      combustible, 
      observaciones,
      clienteId 
    } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID de vehículo requerido' },
        { status: 400 }
      )
    }

    // Validaciones básicas
    if (!marca || !modelo || !matricula || !clienteId) {
      return NextResponse.json(
        { error: 'Campos requeridos: marca, modelo, matricula, clienteId' },
        { status: 400 }
      )
    }

    // Verificar si el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId }
    })

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un vehículo con la misma matrícula (excluyendo el vehículo actual)
    const existingVehicle = await prisma.vehiculo.findFirst({
      where: { 
        matricula: matricula.toUpperCase(),
        NOT: { id }
      }
    })

    if (existingVehicle) {
      return NextResponse.json(
        { error: 'Ya existe un vehículo con esta matrícula' },
        { status: 400 }
      )
    }

    const vehiculo = await prisma.vehiculo.update({
      where: { id },
      data: {
        marca,
        modelo,
        matricula: matricula.toUpperCase(),
        anio: anio || new Date().getFullYear(),
        color: color || null,
        kilometraje: kilometraje || null,
        clienteId,
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            telefono: true,
          }
        },
      }
    })

    return NextResponse.json(vehiculo)

  } catch (error) {
    console.error('Error updating vehicle:', error)
    return NextResponse.json(
      { error: 'Error al actualizar vehículo' },
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
        { error: 'ID de vehículo requerido' },
        { status: 400 }
      )
    }

    // Verificar si el vehículo tiene citas activas
    const citasActivas = await prisma.cita.findMany({
      where: {
        vehiculoId: id,
        estado: {
          in: ['PENDIENTE', 'PENDIENTE', 'EN_CURSO']
        }
      }
    })

    if (citasActivas.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar el vehículo porque tiene citas activas' },
        { status: 400 }
      )
    }

    await prisma.vehiculo.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Vehículo eliminado correctamente' })

  } catch (error) {
    console.error('Error deleting vehicle:', error)
    return NextResponse.json(
      { error: 'Error al eliminar vehículo' },
      { status: 500 }
    )
  }
}
