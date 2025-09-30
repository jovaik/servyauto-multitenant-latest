
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const portfolioItems = await prisma.portfolioTrabajo.findMany({
      where: { activo: true },
      orderBy: [
        { destacado: 'desc' },
        { fechaRealizado: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(portfolioItems)
  } catch (error) {
    console.error('Error fetching portfolio:', error)
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
    
    const newPortfolioItem = await prisma.portfolioTrabajo.create({
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        imagenes: data.imagenes,
        servicio: data.servicio,
        vehiculo: data.vehiculo,
        categoria: data.categoria,
        destacado: data.destacado || false,
        fechaRealizado: data.fechaRealizado ? new Date(data.fechaRealizado) : null,
      }
    })

    return NextResponse.json(newPortfolioItem)
  } catch (error) {
    console.error('Error creating portfolio item:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
