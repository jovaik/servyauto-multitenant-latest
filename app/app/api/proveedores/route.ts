import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Listar todos los proveedores
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const proveedores = await prisma.proveedor.findMany({
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json(proveedores)
  } catch (error) {
    console.error('Error fetching proveedores:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo proveedor
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { nombre, cif, direccion, codigoPostal, ciudad, provincia, telefono, email } = body

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre del proveedor es obligatorio' },
        { status: 400 }
      )
    }

    // Buscar si ya existe un proveedor con ese nombre
    const existente = await prisma.proveedor.findFirst({
      where: { nombre: { equals: nombre, mode: 'insensitive' } }
    })

    if (existente) {
      // Si existe, actualizar con los nuevos datos si los hay
      const actualizado = await prisma.proveedor.update({
        where: { id: existente.id },
        data: {
          cif: cif || existente.cif,
          direccion: direccion || existente.direccion,
          codigoPostal: codigoPostal || existente.codigoPostal,
          ciudad: ciudad || existente.ciudad,
          provincia: provincia || existente.provincia,
          telefono: telefono || existente.telefono,
          email: email || existente.email,
        }
      })
      return NextResponse.json(actualizado)
    }

    // Crear nuevo proveedor
    const proveedor = await prisma.proveedor.create({
      data: {
        nombre,
        cif,
        direccion,
        codigoPostal,
        ciudad,
        provincia,
        telefono,
        email,
      }
    })

    return NextResponse.json(proveedor)
  } catch (error) {
    console.error('Error creating proveedor:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
