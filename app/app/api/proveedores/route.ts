import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext, buildLocalFilter } from '@/lib/local-context'

// GET - Listar todos los proveedores del tenant
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const localContext = await getLocalContext()
    const tenantId = localContext?.tenantId || null

    const proveedores = await prisma.proveedor.findMany({
      where: tenantId ? { tenantId } : {},
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

    const localContext = await getLocalContext()
    const tenantId = localContext?.tenantId || null

    // Buscar si ya existe un proveedor con ese nombre en el tenant
    const existente = await prisma.proveedor.findFirst({
      where: { nombre: { equals: nombre, mode: 'insensitive' }, ...(tenantId ? { tenantId } : {}) }
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
        ...(tenantId ? { tenantId } : {})
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
