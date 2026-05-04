import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext } from '@/lib/local-context'

/**
 * Endpoint para buscar un vehículo por matrícula
 * Devuelve el vehículo y los datos del cliente asociado
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { matricula: string } }
) {
  try {
    // Validar sesión
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const matricula = params.matricula.toUpperCase().trim()

    console.log('🔍 Buscando vehículo por matrícula:', matricula)

    // Buscar vehículo dentro del tenant del usuario
    const localCtxSearch = await getLocalContext()
    const tenantIdSearch = localCtxSearch?.tenantId || null
    const vehiculo = await prisma.vehiculo.findFirst({
      where: {
        matricula: {
          equals: matricula,
          mode: 'insensitive'
        },
        ...(tenantIdSearch ? { tenantId: tenantIdSearch } : {})
      },
      include: {
        cliente: true
      }
    })

    if (!vehiculo) {
      console.log('❌ Vehículo no encontrado:', matricula)
      return NextResponse.json(
        { found: false, message: 'Vehículo no encontrado' },
        { status: 404 }
      )
    }

    console.log('✅ Vehículo encontrado:', vehiculo.id)
    console.log('Cliente asociado:', vehiculo.cliente.nombre, vehiculo.cliente.apellido)

    return NextResponse.json({
      found: true,
      vehiculo: {
        id: vehiculo.id,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        anio: vehiculo.anio,
        color: vehiculo.color || '',
        matricula: vehiculo.matricula,
        kilometraje: vehiculo.kilometraje || 0,
        motor: vehiculo.motor || '',
        combustible: vehiculo.combustible || '',
        observaciones: vehiculo.observaciones || ''
      },
      cliente: {
        id: vehiculo.cliente.id,
        nombre: vehiculo.cliente.nombre,
        apellido: vehiculo.cliente.apellido || '',
        email: vehiculo.cliente.email || '',
        telefono: vehiculo.cliente.telefono,
        direccion: vehiculo.cliente.direccion || '',
        documento: vehiculo.cliente.documento || ''
      }
    })
  } catch (error) {
    console.error('Error buscando vehículo por matrícula:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
