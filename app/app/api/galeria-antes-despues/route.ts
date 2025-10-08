
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const galeriaItems = await prisma.galeriaAntesDespues.findMany({
      where: { activo: true },
      orderBy: [
        { destacado: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(galeriaItems)
  } catch (error) {
    console.error('Error fetching galeria antes despues:', error)
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
    
    const newGaleriaItem = await prisma.galeriaAntesDespues.create({
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        imagenAntes: data.imagenAntes,
        imagenDespues: data.imagenDespues,
        servicio: data.servicio,
        vehiculo: data.vehiculo,
        categoria: data.categoria,
        destacado: data.destacado || false,
      }
    })

    return NextResponse.json(newGaleriaItem)
  } catch (error) {
    console.error('Error creating galeria item:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
