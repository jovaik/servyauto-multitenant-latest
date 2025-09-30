
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const imagenesCategorias = await prisma.imagenCategoria.findMany({
      where: { activo: true },
      orderBy: { categoria: 'asc' }
    })

    return NextResponse.json(imagenesCategorias)
  } catch (error) {
    console.error('Error fetching imagenes categorias:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const data = await request.json()
    
    const newImagenCategoria = await prisma.imagenCategoria.upsert({
      where: { categoria: data.categoria },
      update: {
        imagen: data.imagen,
        descripcion: data.descripcion,
      },
      create: {
        categoria: data.categoria,
        imagen: data.imagen,
        descripcion: data.descripcion,
      }
    })

    return NextResponse.json(newImagenCategoria)
  } catch (error) {
    console.error('Error creating/updating imagen categoria:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
