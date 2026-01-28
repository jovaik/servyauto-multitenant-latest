import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const proveedor = await prisma.proveedor.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { gastos: true } }
      }
    })

    if (!proveedor) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
    }

    return NextResponse.json(proveedor)
  } catch (error) {
    console.error('Error fetching proveedor:', error)
    return NextResponse.json({ error: 'Error al obtener proveedor' }, { status: 500 })
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

    const data = await request.json()
    const { nombre, cif, direccion, codigoPostal, ciudad, provincia, telefono, email } = data

    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    // Verificar que no exista otro proveedor con el mismo nombre
    const existente = await prisma.proveedor.findFirst({
      where: {
        nombre: { equals: nombre.trim(), mode: 'insensitive' },
        id: { not: params.id }
      }
    })

    if (existente) {
      return NextResponse.json({ error: 'Ya existe un proveedor con ese nombre' }, { status: 400 })
    }

    const proveedor = await prisma.proveedor.update({
      where: { id: params.id },
      data: {
        nombre: nombre.trim(),
        cif: cif?.trim() || null,
        direccion: direccion?.trim() || null,
        codigoPostal: codigoPostal?.trim() || null,
        ciudad: ciudad?.trim() || null,
        provincia: provincia?.trim() || null,
        telefono: telefono?.trim() || null,
        email: email?.trim() || null
      }
    })

    return NextResponse.json(proveedor)
  } catch (error) {
    console.error('Error updating proveedor:', error)
    return NextResponse.json({ error: 'Error al actualizar proveedor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar si tiene gastos asociados
    const proveedor = await prisma.proveedor.findUnique({
      where: { id: params.id },
      include: { _count: { select: { gastos: true } } }
    })

    if (!proveedor) {
      return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 })
    }

    if (proveedor._count.gastos > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar: tiene ${proveedor._count.gastos} gastos asociados` },
        { status: 400 }
      )
    }

    await prisma.proveedor.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting proveedor:', error)
    return NextResponse.json({ error: 'Error al eliminar proveedor' }, { status: 500 })
  }
}
