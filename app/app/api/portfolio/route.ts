
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { requireSuperAdminForDelete } from '@/lib/activity-logger'

// GET - Obtener todos los trabajos del portfolio
export async function GET() {
  try {
    const portfolio = await prisma.portfolio.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(portfolio)
  } catch (error) {
    console.error('Error fetching portfolio:', error)
    return NextResponse.json(
      { error: 'Error al cargar portfolio' },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo trabajo en portfolio
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
    
    const portfolio = await prisma.portfolio.create({
      data: {
        titulo: data.titulo,
        servicio: data.servicio,
        vehiculo: data.vehiculo || '',
        categoria: data.categoria || 'MEDIO',
        imagenes: data.imagenes || [],
        descripcion: data.descripcion || ''
      }
    })

    return NextResponse.json(portfolio)
  } catch (error) {
    console.error('Error creating portfolio:', error)
    return NextResponse.json(
      { error: 'Error al crear entrada de portfolio' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar trabajo de portfolio
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

    const portfolio = await prisma.portfolio.update({
      where: { id: data.id },
      data: {
        titulo: data.titulo,
        servicio: data.servicio,
        vehiculo: data.vehiculo || '',
        categoria: data.categoria || 'MEDIO',
        imagenes: data.imagenes || [],
        descripcion: data.descripcion || ''
      }
    })

    return NextResponse.json(portfolio)
  } catch (error) {
    console.error('Error updating portfolio:', error)
    return NextResponse.json(
      { error: 'Error al actualizar entrada de portfolio' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar trabajo de portfolio
export async function DELETE(request: Request) {
  try {
    const guardResponse = await requireSuperAdminForDelete()
    if (guardResponse) return guardResponse

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID requerido' },
        { status: 400 }
      )
    }

    await prisma.portfolio.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting portfolio:', error)
    return NextResponse.json(
      { error: 'Error al eliminar entrada de portfolio' },
      { status: 500 }
    )
  }
}
