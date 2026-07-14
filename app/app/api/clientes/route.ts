
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logActivity, requireSuperAdminForDelete } from '@/lib/activity-logger'
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
    
    // Si no hay contexto, devolver vacío por seguridad
    if (!localContext) {
      return NextResponse.json([])
    }
    
    const localFilter = buildLocalFilter(localContext)

    const clientes = await prisma.cliente.findMany({
      where: localFilter,
      include: {
        vehiculos: true,
        local: true,
        _count: {
          select: {
            citas: {
              where: {
                estado: 'COMPLETADA'
              }
            }
          }
        }
      },
      orderBy: {
        nombre: 'asc',
      },
    })

    // Mapear para agregar el conteo de visitas
    const clientesConVisitas = clientes.map((cliente: any) => ({
      ...cliente,
      totalVisitas: cliente._count.citas
    }))

    return NextResponse.json(clientesConVisitas || [])
  } catch (error) {
    console.error('Error fetching clients:', error)
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
    console.log('Datos recibidos para crear cliente:', body)
    
    const { nombre, apellido, email, telefono, direccion, documento, clienteParking, clienteVIP, clienteEmpresa } = body

    // Validaciones básicas (apellido ahora es opcional)
    if (!nombre || !telefono) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre y telefono' },
        { status: 400 }
      )
    }

    // Obtener contexto de local
    const localContext = await getLocalContext()
    const localIdParaCliente = localContext ? getLocalIdForCreate(localContext) : null
    
    console.log('👤 Creando cliente - Nombre:', nombre, apellido || '')
    console.log('   LocalContext:', localContext?.userRole, '| LocalId para cliente:', localIdParaCliente)

    // Si es GRUPO_ADMIN con múltiples locales y no ha seleccionado uno, requerir selección
    if (localContext?.userRole === 'GRUPO_ADMIN' && 
        localContext.allowedLocalIds && 
        localContext.allowedLocalIds.length > 1 && 
        !localContext.selectedLocalId) {
      console.log('   ⚠️ GRUPO_ADMIN sin local seleccionado, rechazando')
      return NextResponse.json(
        { error: 'Por favor seleccione un local antes de crear el cliente' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un cliente con el mismo email (solo si tiene email)
    if (email) {
      const existingClient = await prisma.cliente.findFirst({
        where: { email }
      })
      if (existingClient) {
        console.log('   ❌ Cliente con email duplicado encontrado:', existingClient.id)
        return NextResponse.json(
          { error: 'Ya existe un cliente con este email' },
          { status: 400 }
        )
      }
    }
    
    console.log('   ✅ Validaciones OK, procediendo a crear cliente')

    const cliente = await prisma.cliente.create({
      data: {
        nombre,
        apellido,
        email: email || null,
        telefono,
        direccion: direccion || null,
        documento: documento || null,
        clienteParking: clienteParking || false,
        clienteVIP: clienteVIP || false,
        clienteEmpresa: clienteEmpresa || false,
        localId: localIdParaCliente,
        // Trazabilidad - quién creó este cliente
        creadoPorId: (session.user as any)?.id || null,
        creadoPorNombre: session.user?.name || session.user?.email || 'Sistema',
      },
      include: {
        vehiculos: true,
        local: true,
      }
    })

    console.log('Cliente creado exitosamente:', cliente.id)
    return NextResponse.json(cliente, { status: 201 })

  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { error: 'Error al crear cliente: ' + (error as Error).message },
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
    const { id, nombre, apellido, email, telefono, direccion, documento, clienteParking } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID de cliente requerido' },
        { status: 400 }
      )
    }

    // Validaciones básicas (apellido ahora es opcional)
    if (!nombre || !telefono) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre y telefono' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un cliente con el mismo email (excluyendo el cliente actual)
    if (email) {
      const existingClient = await prisma.cliente.findFirst({
        where: { 
          email,
          NOT: { id }
        }
      })
      if (existingClient) {
        return NextResponse.json(
          { error: 'Ya existe un cliente con este email' },
          { status: 400 }
        )
      }
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        nombre,
        apellido,
        email: email || null,
        telefono,
        direccion: direccion || null,
        documento: documento || null,
        clienteParking: clienteParking !== undefined ? clienteParking : false,
      },
      include: {
        vehiculos: true,
      }
    })

    return NextResponse.json(cliente)

  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: 'Error al actualizar cliente' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const guardResponse = await requireSuperAdminForDelete()
    if (guardResponse) return guardResponse

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID de cliente requerido' },
        { status: 400 }
      )
    }

    // Verificar si el cliente tiene citas activas
    const citasActivas = await prisma.cita.findMany({
      where: {
        clienteId: id,
        estado: {
          in: ['PENDIENTE', 'COMPLETADA', 'EN_PROCESO']
        }
      }
    })

    if (citasActivas.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar el cliente porque tiene citas activas' },
        { status: 400 }
      )
    }

    await prisma.cliente.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Cliente eliminado correctamente' })

  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: 'Error al eliminar cliente' },
      { status: 500 }
    )
  }
}
