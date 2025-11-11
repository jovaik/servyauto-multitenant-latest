
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET - Obtener todas las imágenes de galería
export async function GET() {
  try {
    const galeria = await prisma.galeriaAntesDespues.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(galeria)
  } catch (error) {
    console.error('Error fetching galeria:', error)
    return NextResponse.json(
      { error: 'Error al cargar galería' },
      { status: 500 }
    )
  }
}

// POST - Crear nueva imagen de galería
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const data = await request.json()
    
    const galeria = await prisma.galeriaAntesDespues.create({
      data: {
        titulo: data.titulo,
        servicio: data.servicio,
        vehiculo: data.vehiculo,
        imagenAntes: data.imagenAntes,
        imagenDespues: data.imagenDespues,
        descripcion: data.descripcion || ''
      }
    })

    return NextResponse.json(galeria)
  } catch (error) {
    console.error('Error creating galeria:', error)
    return NextResponse.json(
      { error: 'Error al crear entrada de galería' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar imagen de galería
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const data = await request.json()
    
    if (!data.id) {
      return NextResponse.json(
        { error: 'ID requerido' },
        { status: 400 }
      )
    }

    const galeria = await prisma.galeriaAntesDespues.update({
      where: { id: data.id },
      data: {
        titulo: data.titulo,
        servicio: data.servicio,
        vehiculo: data.vehiculo,
        imagenAntes: data.imagenAntes,
        imagenDespues: data.imagenDespues,
        descripcion: data.descripcion || ''
      }
    })

    return NextResponse.json(galeria)
  } catch (error) {
    console.error('Error updating galeria:', error)
    return NextResponse.json(
      { error: 'Error al actualizar entrada de galería' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar imagen de galería
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID requerido' },
        { status: 400 }
      )
    }

    await prisma.galeriaAntesDespues.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting galeria:', error)
    return NextResponse.json(
      { error: 'Error al eliminar entrada de galería' },
      { status: 500 }
    )
  }
}
