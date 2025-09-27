
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
        servicios: {
          include: {
            servicio: true,
          },
        },
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
      box,
      clienteId,
      vehiculoId,
      servicios,
      observaciones,
      metodoPago,
    } = body

    // Validar campos requeridos
    if (!fecha || !horaInicio || !horaFin || !box || !clienteId || !vehiculoId) {
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

    // Calcular total
    let total = 0
    if (servicios && servicios.length > 0) {
      const serviciosData = await prisma.servicio.findMany({
        where: {
          id: { in: servicios.map((s: any) => s.servicioId) },
        },
      })
      
      total = serviciosData.reduce((sum, servicio) => sum + servicio.precio, 0)
    }

    // Crear la cita
    const cita = await prisma.cita.create({
      data: {
        fecha: fechaCita,
        horaInicio,
        horaFin,
        box,
        estado: 'PENDIENTE',
        observaciones,
        metodoPago,
        total,
        clienteId,
        vehiculoId,
        servicios: servicios?.length > 0 ? {
          create: servicios.map((s: any) => ({
            servicioId: s.servicioId,
            precio: s.precio || 0,
          })),
        } : undefined,
      },
      include: {
        cliente: true,
        vehiculo: true,
        servicios: {
          include: {
            servicio: true,
          },
        },
      },
    })

    // NUEVA FUNCIONALIDAD: Crear factura/ticket automáticamente según método de pago
    if (metodoPago && total > 0 && servicios?.length > 0) {
      // Determinar el tipo de documento según método de pago
      let tipoDocumento: 'TICKET' | 'FACTURA'
      if (metodoPago === 'TPV_UNICAJA') {
        // TPV UNICAJA siempre genera FACTURA
        tipoDocumento = 'FACTURA'
      } else if (metodoPago === 'EFECTIVO' || metodoPago === 'TARJETA_SUMUP') {
        // EFECTIVO o TPV SUMUP generan TICKET
        tipoDocumento = 'TICKET'
      } else {
        // Por defecto TICKET para otros métodos
        tipoDocumento = 'TICKET'
      }
      
      // Generar número de documento
      const ultimaFactura = await prisma.factura.findFirst({
        where: { tipo: tipoDocumento },
        orderBy: { numero: 'desc' }
      })

      let numeroSecuencia = 1
      if (ultimaFactura) {
        const ultimoNumero = parseInt(ultimaFactura.numero.split('-')[1]) || 0
        numeroSecuencia = ultimoNumero + 1
      }

      const prefijo = tipoDocumento === 'FACTURA' ? 'FAC' : 'TIC'
      const numero = `${prefijo}-${numeroSecuencia.toString().padStart(6, '0')}`

      // Crear items de factura a partir de los servicios de la cita
      const itemsFactura = await Promise.all(
        servicios.map(async (s: any) => {
          const servicio = await prisma.servicio.findUnique({
            where: { id: s.servicioId }
          })
          return {
            descripcion: servicio?.nombre || 'Servicio',
            cantidad: 1,
            precio: s.precio || 0,
            total: s.precio || 0
          }
        })
      )

      // Calcular totales de facturación
      const subtotal = total / 1.21 // Descontar IVA del total
      const iva = total - subtotal

      // Crear la factura/ticket
      await prisma.factura.create({
        data: {
          numero,
          tipo: tipoDocumento,
          subtotal,
          iva,
          total,
          metodoPago,
          clienteId,
          citaId: cita.id,
          items: {
            create: itemsFactura
          }
        }
      })

      console.log(`✅ ${tipoDocumento} ${numero} creado automáticamente para cita ${cita.id}`)
    }

    return NextResponse.json(cita, { status: 201 })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
