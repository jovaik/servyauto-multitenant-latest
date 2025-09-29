
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

    const { searchParams } = new URL(req.url)
    const showAll = searchParams.get('showAll') === 'true'

    const servicios = await prisma.servicio.findMany({
      where: showAll ? {} : {
        activo: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    })

    return NextResponse.json(servicios || [])
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { nombre, descripcion, precio, duracion, activo = true } = body

    // Validar campos requeridos
    if (!nombre || precio === undefined || precio < 0) {
      return NextResponse.json(
        { error: 'Nombre y precio son campos requeridos' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un servicio con el mismo nombre
    const servicioExistente = await prisma.servicio.findFirst({
      where: {
        nombre: {
          equals: nombre.trim(),
          mode: 'insensitive'
        }
      }
    })

    if (servicioExistente) {
      return NextResponse.json(
        { error: 'Ya existe un servicio con este nombre' },
        { status: 400 }
      )
    }

    const servicio = await prisma.servicio.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        precio: parseFloat(precio),
        duracion: parseInt(duracion) || 60,
        activo: Boolean(activo)
      }
    })

    return NextResponse.json(servicio, { status: 201 })
  } catch (error) {
    console.error('Error creating service:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
