
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const {
      fecha,
      horaInicio,
      horaFin,
      box,
      estado,
      observaciones,
      metodoPago: rawMetodoPago,
      servicios,
    } = body

    // Validar metodoPago - no permitir strings vacíos
    const metodoPago = rawMetodoPago && rawMetodoPago.trim() !== '' ? rawMetodoPago : undefined

    // Verificar si la cita existe
    const citaExistente = await prisma.cita.findUnique({
      where: { id: params.id },
    })

    if (!citaExistente) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      )
    }

    // Calcular nuevo precio final si hay servicios
    let precioFinal = citaExistente.total
    if (servicios && servicios.length > 0) {
      const serviciosData = await prisma.servicio.findMany({
        where: {
          id: { in: servicios.map((s: any) => s.servicioId) },
        },
      })
      
      precioFinal = serviciosData.reduce((sum, servicio) => sum + servicio.precio, 0)
    }

    // Preparar datos de actualización
    const updateData: any = {}
    
    if (fecha) updateData.fecha = new Date(fecha)
    if (horaInicio) updateData.horaInicio = horaInicio
    if (horaFin) updateData.horaFin = horaFin
    if (box) updateData.box = box
    if (estado) updateData.estado = estado
    if (observaciones !== undefined) updateData.observaciones = observaciones
    if (metodoPago) updateData.metodoPago = metodoPago
    if (precioFinal !== undefined) updateData.total = precioFinal

    // Actualizar la cita
    const cita = await prisma.cita.update({
      where: { id: params.id },
      data: updateData,
      include: {
        cliente: true,
        vehiculo: true,
        cita_servicios: {
          include: {
            servicios: true
          }
        },
      },
    })

    return NextResponse.json(cita)
  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar si la cita existe
    const citaExistente = await prisma.cita.findUnique({
      where: { id: params.id },
    })

    if (!citaExistente) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar la cita y sus servicios relacionados
    await prisma.cita.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Cita eliminada correctamente' })
  } catch (error) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
