

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const servicioId = params.id
    const body = await req.json()
    const { nombre, descripcion, precio, duracion, activo } = body

    // Validar campos requeridos
    if (!nombre || precio === undefined || precio < 0) {
      return NextResponse.json(
        { error: 'Nombre y precio son campos requeridos' },
        { status: 400 }
      )
    }

    // Verificar si el servicio existe
    const servicioExistente = await prisma.servicio.findUnique({
      where: { id: servicioId }
    })

    if (!servicioExistente) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si ya existe otro servicio con el mismo nombre
    const nombreDuplicado = await prisma.servicio.findFirst({
      where: {
        id: { not: servicioId },
        nombre: {
          equals: nombre.trim(),
          mode: 'insensitive'
        }
      }
    })

    if (nombreDuplicado) {
      return NextResponse.json(
        { error: 'Ya existe otro servicio con este nombre' },
        { status: 400 }
      )
    }

    const servicioActualizado = await prisma.servicio.update({
      where: { id: servicioId },
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        precio: parseFloat(precio),
        duracion: parseInt(duracion) || 60,
        activo: Boolean(activo)
      }
    })

    return NextResponse.json(servicioActualizado)
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const servicioId = params.id

    // Verificar si el servicio existe
    const servicio = await prisma.servicio.findUnique({
      where: { id: servicioId }
    })

    if (!servicio) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si hay citas que usen este servicio
    const citasConServicio = await prisma.cita.findFirst({
      where: { servicioId }
    })

    if (citasConServicio) {
      return NextResponse.json(
        { 
          error: 'No se puede eliminar el servicio porque está asociado a citas existentes. Puede desactivarlo en su lugar.' 
        },
        { status: 400 }
      )
    }

    // Eliminar el servicio
    await prisma.servicio.delete({
      where: { id: servicioId }
    })

    return NextResponse.json({ message: 'Servicio eliminado correctamente' })
  } catch (error) {
    console.error('Error deleting service:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const servicioId = params.id

    const servicio = await prisma.servicio.findUnique({
      where: { id: servicioId }
    })

    if (!servicio) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(servicio)
  } catch (error) {
    console.error('Error fetching service:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

