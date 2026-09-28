import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext, buildLocalFilter } from '@/lib/local-context'

/**
 * Endpoint para buscar vehículos por matrícula parcial (autocomplete)
 * Devuelve lista de vehículos que coinciden con los datos del cliente
 */
export async function GET(request: NextRequest) {
  try {
    // Validar sesión
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.toUpperCase().trim() || ''

    if (!query || query.length < 2) {
      return NextResponse.json({ vehiculos: [] })
    }

    // Vehículos son compartidos entre todos los locales
    // Buscar por matrícula, nombre/apellido del cliente o teléfono
    console.log('🔍 Buscando vehículos/clientes por:', query)

    const vehiculos = await prisma.vehiculo.findMany({
      where: {
        OR: [
          { matricula: { contains: query, mode: 'insensitive' } },
          { marca: { contains: query, mode: 'insensitive' } },
          { cliente: { nombre: { contains: query, mode: 'insensitive' } } },
          { cliente: { apellido: { contains: query, mode: 'insensitive' } } },
          { cliente: { telefono: { contains: query } } },
        ],
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            telefono: true,
            clienteParking: true,
            clienteVIP: true,
            clienteEmpresa: true
          }
        }
      },
      take: 15,
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`✅ Encontrados ${vehiculos.length} vehículos`)

    // Formatear respuesta
    const resultados = vehiculos.map((v: any) => ({
      id: v.id,
      marca: v.marca,
      modelo: v.modelo,
      matricula: v.matricula,
      anio: v.anio,
      color: v.color || '',
      kilometraje: v.kilometraje || 0,
      motor: v.motor || '',
      combustible: v.combustible || '',
      observaciones: v.observaciones || '',
      cliente: {
        id: v.cliente.id,
        nombre: v.cliente.nombre,
        apellido: v.cliente.apellido || '',
        telefono: v.cliente.telefono
      }
    }))

    return NextResponse.json({ vehiculos: resultados })
  } catch (error) {
    console.error('Error buscando vehículos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
