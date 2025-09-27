
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: params.id },
      include: {
        vehiculos: true,
        citas: {
          include: {
            vehiculo: true,
            servicios: {
              include: {
                servicio: true
              }
            }
          }
        }
      }
    })

    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(cliente)
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { error: 'Error al obtener cliente' },
      { status: 500 }
    )
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

    const body = await request.json()
    const { nombre, apellido, email, telefono, direccion, dni } = body

    // Validaciones básicas
    if (!nombre || !apellido || !telefono) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, apellido, telefono' },
        { status: 400 }
      )
    }

    // Verificar si el cliente existe
    const existingClient = await prisma.cliente.findUnique({
      where: { id: params.id }
    })

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si el email ya existe en otro cliente
    if (email) {
      const emailExists = await prisma.cliente.findFirst({
        where: { 
          email,
          id: { not: params.id }
        }
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'Ya existe otro cliente con este email' },
          { status: 400 }
        )
      }
    }

    const cliente = await prisma.cliente.update({
      where: { id: params.id },
      data: {
        nombre,
        apellido,
        email: email || null,
        telefono,
        direccion: direccion || null,
        dni: dni || null,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar si el cliente existe
    const existingClient = await prisma.cliente.findUnique({
      where: { id: params.id },
      include: {
        vehiculos: true,
        citas: true
      }
    })

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si tiene citas pendientes o confirmadas
    const citasActivas = await prisma.cita.findMany({
      where: {
        clienteId: params.id,
        estado: {
          in: ['PENDIENTE', 'CONFIRMADA', 'EN_PROCESO']
        }
      }
    })

    if (citasActivas.length > 0) {
      return NextResponse.json(
        { 
          error: `No se puede eliminar el cliente. Tiene ${citasActivas.length} citas activas pendientes.`,
          details: 'Cancela o completa todas las citas antes de eliminar el cliente.'
        },
        { status: 400 }
      )
    }

    // Usar transacción para eliminar cliente y todos sus datos relacionados
    await prisma.$transaction(async (tx) => {
      // Eliminar servicios de citas del cliente
      await tx.citaServicio.deleteMany({
        where: {
          cita: {
            clienteId: params.id
          }
        }
      })

      // Eliminar facturas del cliente
      await tx.facturaItem.deleteMany({
        where: {
          factura: {
            clienteId: params.id
          }
        }
      })

      await tx.factura.deleteMany({
        where: { clienteId: params.id }
      })

      // Eliminar citas del cliente
      await tx.cita.deleteMany({
        where: { clienteId: params.id }
      })

      // Eliminar vehículos del cliente
      await tx.vehiculo.deleteMany({
        where: { clienteId: params.id }
      })

      // Eliminar cliente
      await tx.cliente.delete({
        where: { id: params.id }
      })
    })

    return NextResponse.json({ 
      message: 'Cliente eliminado correctamente junto con todos sus datos relacionados' 
    })

  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: 'Error al eliminar cliente' },
      { status: 500 }
    )
  }
}
