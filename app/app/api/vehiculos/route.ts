
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
        motor: motor || null,
        combustible: combustible || null,
        observaciones: observaciones || null,
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
