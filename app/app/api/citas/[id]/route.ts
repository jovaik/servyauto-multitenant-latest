
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
      metodoPago,
      servicios,
    } = body

    console.log('=== INICIO ACTUALIZACIÓN CITA ===')
    console.log('Cita ID:', params.id)
    console.log('Body completo:', JSON.stringify(body, null, 2))
    console.log('metodoPago:', metodoPago, 'tipo:', typeof metodoPago, 'es null:', metodoPago === null, 'es undefined:', metodoPago === undefined)

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
    
    // Manejar metodoPago: si es undefined se envía como null a Prisma
    if (metodoPago !== undefined) {
      updateData.metodoPago = metodoPago || null
    }
    
    if (precioFinal !== undefined) updateData.total = precioFinal

    console.log('=== DATOS PREPARADOS PARA PRISMA ===')
    console.log('Update data:', JSON.stringify(updateData, null, 2))
    console.log('Cantidad de campos:', Object.keys(updateData).length)

    // Verificar que hay datos para actualizar
    if (Object.keys(updateData).length === 0) {
      console.log('ERROR: No hay datos para actualizar')
      return NextResponse.json(
        { error: 'No hay datos para actualizar' },
        { status: 400 }
      )
    }

    console.log('=== EJECUTANDO PRISMA UPDATE ===')
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

    console.log('=== ACTUALIZACIÓN EXITOSA ===')
    console.log('Cita actualizada:', cita.id)
    
    return NextResponse.json(cita)
  } catch (error: any) {
    console.error('=== ERROR EN ACTUALIZACIÓN ===')
    console.error('Error completo:', error)
    console.error('Error message:', error.message)
    console.error('Error code:', error.code)
    console.error('Error meta:', error.meta)
    console.error('Error name:', error.name)
    
    // Si es un error de Prisma, mostrar más detalles
    if (error.code) {
      console.error('Es un error de Prisma con código:', error.code)
    }
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error.message,
        code: error.code,
        details: error.meta
      },
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
