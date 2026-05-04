
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext } from '@/lib/local-context'

export async function GET(request: NextRequest) {
  try {
    const localContext = await getLocalContext()
    const tenantId = localContext?.tenantId || null
    const tenantFilter = tenantId ? { tenantId } : {}

    const galeria = await prisma.galeriaAntesDespues.findMany({
      where: tenantFilter,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(galeria)
  } catch (error) {
    console.error('Error fetching galeria:', error)
    return NextResponse.json({ error: 'Error al cargar galería' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const localContext = await getLocalContext()
    const tenantId = localContext?.tenantId || null

    const data = await request.json()

    const galeria = await prisma.galeriaAntesDespues.create({
      data: {
        titulo: data.titulo,
        servicio: data.servicio,
        vehiculo: data.vehiculo,
        imagenAntes: data.imagenAntes,
        imagenDespues: data.imagenDespues,
        descripcion: data.descripcion || '',
        ...(tenantId ? { tenantId } : {})
      }
    })

    return NextResponse.json(galeria)
  } catch (error) {
    console.error('Error creating galeria:', error)
    return NextResponse.json({ error: 'Error al crear entrada de galería' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const localContext = await getLocalContext()
    const tenantId = localContext?.tenantId || null

    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const existing = await prisma.galeriaAntesDespues.findUnique({ where: { id: data.id } })
    if (!existing) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    // Validación de pertenencia al tenant (Grupo C)
    if (tenantId && existing.tenantId && existing.tenantId !== tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
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
    return NextResponse.json({ error: 'Error al actualizar entrada de galería' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const localContext = await getLocalContext()
    const tenantId = localContext?.tenantId || null

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const existing = await prisma.galeriaAntesDespues.findUnique({ where: { id: parseInt(id) } })
    if (!existing) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    // Validación de pertenencia al tenant (Grupo C)
    if (tenantId && existing.tenantId && existing.tenantId !== tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    await prisma.galeriaAntesDespues.delete({ where: { id: parseInt(id) } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting galeria:', error)
    return NextResponse.json({ error: 'Error al eliminar entrada de galería' }, { status: 500 })
  }
}
