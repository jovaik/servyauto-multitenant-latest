
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext } from '@/lib/local-context'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const localContext = await getLocalContext()
    const tenantId = localContext?.tenantId || null

    const { searchParams } = new URL(req.url)
    const showAll = searchParams.get('showAll') === 'true'

    const whereClause: any = showAll ? {} : { activo: true }
    if (tenantId) {
      whereClause.tenantId = tenantId
    }

    const servicios = await prisma.servicio.findMany({
      where: whereClause,
      orderBy: [
        { ordenPreferencia: 'asc' },
        { nombre: 'asc' }
      ],
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

    const localContext = await getLocalContext()
    const tenantId = localContext?.tenantId || null

    const body = await req.json()
    const { nombre, descripcion, precio, duracion, activo = true, ordenPreferencia } = body

    if (!nombre || precio === undefined || precio < 0) {
      return NextResponse.json(
        { error: 'Nombre y precio son campos requeridos' },
        { status: 400 }
      )
    }

    const servicioExistente = await prisma.servicio.findFirst({
      where: {
        nombre: { equals: nombre.trim(), mode: 'insensitive' },
        ...(tenantId ? { tenantId } : {})
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
        activo: Boolean(activo),
        ordenPreferencia: ordenPreferencia !== undefined ? parseInt(ordenPreferencia) : 999,
        ...(tenantId ? { tenantId } : {})
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
