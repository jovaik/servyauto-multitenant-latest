
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logActivity, requireSuperAdminForDelete } from '@/lib/activity-logger'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const vehiculo = await prisma.vehiculo.findUnique({
      where: { id: params.id },
      include: {
        cliente: true,
        citas: {
          include: {
            cita_servicios: {
              include: {
                servicios: true
              }
            }
          }
        }
      }
    })

    if (!vehiculo) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(vehiculo)
  } catch (error) {
    console.error('Error fetching vehicle:', error)
    return NextResponse.json(
      { error: 'Error al obtener vehículo' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      observaciones 
    } = body

    // Validaciones básicas
    if (!marca || !modelo || !matricula) {
      return NextResponse.json(
        { error: 'Campos requeridos: marca, modelo, matricula' },
        { status: 400 }
      )
    }

    // Verificar si el vehículo existe
    const existingVehicle = await prisma.vehiculo.findUnique({
      where: { id: params.id }
    })

    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si la matrícula ya existe en otro vehículo
    const matriculaExists = await prisma.vehiculo.findFirst({
      where: { 
        matricula: matricula.toUpperCase(),
        id: { not: params.id }
      }
    })

    if (matriculaExists) {
      return NextResponse.json(
        { error: 'Ya existe otro vehículo con esta matrícula' },
        { status: 400 }
      )
    }

    const vehiculo = await prisma.vehiculo.update({
      where: { id: params.id },
      data: {
        marca: marca.trim().toUpperCase(),
        modelo: modelo.trim().toUpperCase(),
        matricula: matricula.trim().toUpperCase(),
        anio: anio || existingVehicle.anio,
        color: color || null,
        kilometraje: kilometraje || null,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardResponse = await requireSuperAdminForDelete()
    if (guardResponse) return guardResponse

    // Verificar si el vehículo existe
    const existingVehicle = await prisma.vehiculo.findUnique({
      where: { id: params.id },
      include: {
        cliente: true,
        citas: true
      }
    })

    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si tiene citas pendientes o confirmadas
    const citasActivas = await prisma.cita.findMany({
      where: {
        vehiculoId: params.id,
        estado: {
          in: ['PENDIENTE', 'EN_PROCESO']
        }
      }
    })

    if (citasActivas.length > 0) {
      return NextResponse.json(
        { 
          error: `No se puede eliminar el vehículo. Tiene ${citasActivas.length} citas activas pendientes.`,
          details: 'Cancela o completa todas las citas antes de eliminar el vehículo.'
        },
        { status: 400 }
      )
    }

    // Eliminar vehículo (las citas se eliminan automáticamente por cascade)
    await prisma.vehiculo.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ 
      message: 'Vehículo eliminado correctamente junto con sus citas relacionadas' 
    })

  } catch (error) {
    console.error('Error deleting vehicle:', error)
    return NextResponse.json(
      { error: 'Error al eliminar vehículo' },
      { status: 500 }
    )
  }
}
