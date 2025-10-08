
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const fecha = searchParams.get('fecha')

    let whereClause: any = {}

    if (fecha) {
      const fechaInicio = new Date(fecha)
      const fechaFin = new Date(fecha)
      fechaFin.setHours(23, 59, 59, 999)

      whereClause.fecha = {
        gte: fechaInicio,
        lte: fechaFin,
      }
    }

    const citas = await prisma.cita.findMany({
      where: whereClause,
      include: {
        cliente: true,
        vehiculo: true,
        cita_servicios: {
          include: {
            servicios: true
          }
        }
      },
      orderBy: {
        horaInicio: 'asc',
      },
    })

    return NextResponse.json(citas || [])
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
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
      clienteId,
      vehiculoId,
      servicios,
      box,
      observaciones,
      metodoPago,
    } = body

    // Validar campos requeridos
    if (!fecha || !horaInicio || !horaFin || !clienteId || !vehiculoId || !box) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Verificar disponibilidad del slot
    const fechaCita = new Date(fecha)
    const citaExistente = await prisma.cita.findFirst({
      where: {
        fecha: {
          gte: new Date(fechaCita.getFullYear(), fechaCita.getMonth(), fechaCita.getDate()),
          lt: new Date(fechaCita.getFullYear(), fechaCita.getMonth(), fechaCita.getDate() + 1),
        },
        horaInicio,
        box,
      },
    })

    if (citaExistente) {
      return NextResponse.json(
        { error: 'Ya existe una cita en este horario y box' },
        { status: 400 }
      )
    }

    // Calcular precio total de los servicios
    let precioTotal = 0
    const serviciosData = []
    
    if (servicios && Array.isArray(servicios) && servicios.length > 0) {
      for (const svc of servicios) {
        const servicioId = svc.servicioId || svc
        const servicio = await prisma.servicio.findUnique({
          where: { id: servicioId },
        })
        
        if (servicio) {
          const precio = svc.precio || servicio.precio
          precioTotal += precio
          serviciosData.push({
            id: `${Date.now()}_${servicioId}_${Math.random().toString(36).substr(2, 9)}`,
            servicioId: servicioId,
            precio: precio
          })
        }
      }
    }

    // Crear la cita con sus servicios asociados
    const cita = await prisma.cita.create({
      data: {
        fecha: fechaCita,
        horaInicio,
        horaFin,
        clienteId,
        vehiculoId,
        box,
        estado: 'PENDIENTE',
        observaciones,
        metodoPago,
        total: precioTotal,
        cita_servicios: serviciosData.length > 0 ? {
          create: serviciosData
        } : undefined
      },
      include: {
        cliente: true,
        vehiculo: true,
        cita_servicios: {
          include: {
            servicios: true
          }
        }
      },
    })

    return NextResponse.json(cita, { status: 201 })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
