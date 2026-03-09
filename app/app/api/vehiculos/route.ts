
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext, buildLocalFilter, getLocalIdForCreate } from '@/lib/local-context'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener contexto de local para filtrado
    const localContext = await getLocalContext()
    
    if (!localContext) {
      return NextResponse.json([])
    }
    
    const localFilter = buildLocalFilter(localContext)

    const vehiculos = await prisma.vehiculo.findMany({
      where: localFilter,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            telefono: true,
          }
        },
        local: true,
      },
      orderBy: [
        { marca: 'asc' },
        { modelo: 'asc' },
      ],
    })

    return NextResponse.json(vehiculos || [])
  } catch (error) {
    console.error('Error fetching vehicles:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Datos recibidos para crear vehículo:', body)
    
    const { 
      marca, 
      modelo, 
      matricula, 
      anio, 
      color, 
      kilometraje, 
      motor, 
      combustible, 
      observaciones,
      clienteId 
    } = body

    // Validaciones básicas
    if (!marca || !modelo || !matricula || !clienteId) {
      return NextResponse.json(
        { error: 'Campos requeridos: marca, modelo, matricula, clienteId' },
        { status: 400 }
      )
    }

    // Verificar si el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId }
    })

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 400 }
      )
    }

    // Obtener localId para asignar al nuevo vehículo
    const localContext = await getLocalContext()
    const localIdParaVehiculo = localContext ? getLocalIdForCreate(localContext) : null
    
    console.log('🚗 Creando vehículo - Matrícula:', matricula.toUpperCase())
    console.log('   LocalContext:', localContext?.userRole, '| LocalId para vehículo:', localIdParaVehiculo)

    // Si es GRUPO_ADMIN con múltiples locales y no ha seleccionado uno, requerir selección
    if (localContext?.userRole === 'GRUPO_ADMIN' && 
        localContext.allowedLocalIds && 
        localContext.allowedLocalIds.length > 1 && 
        !localContext.selectedLocalId) {
      return NextResponse.json(
        { error: 'Por favor seleccione un local antes de crear el vehículo' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un vehículo con la misma matrícula
    // Buscar en TODOS los locales del usuario, no solo en el seleccionado (evitar duplicados globales)
    let whereFilter: any = { matricula: matricula.toUpperCase() }
    
    // Si tiene locales asignados, buscar solo en esos locales
    if (localContext?.allowedLocalIds && localContext.allowedLocalIds.length > 0) {
      whereFilter.localId = { in: localContext.allowedLocalIds }
    } else if (localIdParaVehiculo) {
      whereFilter.localId = localIdParaVehiculo
    }
    // Si es SUPER_ADMIN sin local seleccionado, buscar en todos (sin filtro de localId)
    
    console.log('   Buscando duplicados con filtro:', JSON.stringify(whereFilter))
    
    const existingVehicle = await prisma.vehiculo.findFirst({
      where: whereFilter
    })

    if (existingVehicle) {
      console.log('   ❌ Vehículo duplicado encontrado:', existingVehicle.id, '| LocalId:', existingVehicle.localId)
      return NextResponse.json(
        { error: 'Ya existe un vehículo con esta matrícula' },
        { status: 400 }
      )
    }
    
    console.log('   ✅ No hay duplicados, procediendo a crear')

    const vehiculo = await prisma.vehiculo.create({
      data: {
        marca,
        modelo,
        matricula: matricula.toUpperCase(),
        anio: anio || new Date().getFullYear(),
        color: color || null,
        kilometraje: kilometraje || null,
        clienteId,
        localId: localIdParaVehiculo,
        // Trazabilidad - quién creó este vehículo
        creadoPorId: (session.user as any)?.id || null,
        creadoPorNombre: session.user?.name || session.user?.email || 'Sistema',
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            telefono: true,
          }
        },
        local: true,
      }
    })

    console.log('Vehículo creado exitosamente:', vehiculo.id)
    return NextResponse.json(vehiculo, { status: 201 })

  } catch (error) {
    console.error('Error creating vehicle:', error)
    return NextResponse.json(
      { error: 'Error al crear vehículo: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      id,
      marca, 
      modelo, 
      matricula, 
      anio, 
      color, 
      kilometraje, 
      motor, 
      combustible, 
      observaciones,
      clienteId 
    } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID de vehículo requerido' },
        { status: 400 }
      )
    }

    // Validaciones básicas
    if (!marca || !modelo || !matricula || !clienteId) {
      return NextResponse.json(
        { error: 'Campos requeridos: marca, modelo, matricula, clienteId' },
        { status: 400 }
      )
    }

    // Verificar si el cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId }
    })

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un vehículo con la misma matrícula (excluyendo el vehículo actual)
    const existingVehicle = await prisma.vehiculo.findFirst({
      where: { 
        matricula: matricula.toUpperCase(),
        NOT: { id }
      }
    })

    if (existingVehicle) {
      return NextResponse.json(
        { error: 'Ya existe un vehículo con esta matrícula' },
        { status: 400 }
      )
    }

    const vehiculo = await prisma.vehiculo.update({
      where: { id },
      data: {
        marca,
        modelo,
        matricula: matricula.toUpperCase(),
        anio: anio || new Date().getFullYear(),
        color: color || null,
        kilometraje: kilometraje || null,
        clienteId,
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            telefono: true,
          }
        },
      }
    })

    return NextResponse.json(vehiculo)

  } catch (error) {
    console.error('Error updating vehicle:', error)
    return NextResponse.json(
      { error: 'Error al actualizar vehículo' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de vehículo requerido' },
        { status: 400 }
      )
    }

    // Verificar si el vehículo tiene citas activas
    const citasActivas = await prisma.cita.findMany({
      where: {
        vehiculoId: id,
        estado: {
          in: ['PENDIENTE', 'CONFIRMADA', 'EN_PROCESO']
        }
      }
    })

    if (citasActivas.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar el vehículo porque tiene citas activas' },
        { status: 400 }
      )
    }

    await prisma.vehiculo.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Vehículo eliminado correctamente' })

  } catch (error) {
    console.error('Error deleting vehicle:', error)
    return NextResponse.json(
      { error: 'Error al eliminar vehículo' },
      { status: 500 }
    )
  }
}
