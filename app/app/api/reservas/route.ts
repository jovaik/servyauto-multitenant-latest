
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      nombre,
      apellido,
      email,
      telefono,
      fecha,
      hora,
      marcaModelo,
      matricula,
      servicio,
      mensaje
    } = body

    // Validar campos requeridos
    if (!nombre || !apellido || !telefono || !fecha || !hora || !marcaModelo || !matricula || !servicio) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // **VALIDACIÓN DE CONFLICTOS CON LA AGENDA**
    // Verificar si existe alguna cita en la misma fecha y hora
    const fechaCita = new Date(fecha)
    const citaExistente = await prisma.cita.findFirst({
      where: {
        fecha: {
          gte: new Date(fechaCita.getFullYear(), fechaCita.getMonth(), fechaCita.getDate()),
          lt: new Date(fechaCita.getFullYear(), fechaCita.getMonth(), fechaCita.getDate() + 1),
        },
        horaInicio: hora,
      },
    })

    if (citaExistente) {
      return NextResponse.json(
        { error: 'Lo sentimos, este horario ya está ocupado. Por favor elige otra hora.' },
        { status: 400 }
      )
    }

    // Buscar o crear cliente
    let cliente = await prisma.cliente.findFirst({
      where: {
        OR: [
          { telefono },
          ...(email ? [{ email }] : [])
        ]
      }
    })

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nombre,
          apellido,
          email: email || '',
          telefono,
          clienteParking: false
        }
      })
    }

    // Buscar o crear vehículo
    let vehiculo = await prisma.vehiculo.findFirst({
      where: {
        matricula: matricula.toUpperCase(),
        clienteId: cliente.id
      }
    })

    if (!vehiculo) {
      const marcaParts = marcaModelo.split(' ')
      vehiculo = await prisma.vehiculo.create({
        data: {
          marca: marcaParts[0] || marcaModelo,
          modelo: marcaParts.slice(1).join(' ') || 'N/A',
          anio: new Date().getFullYear(), // Año actual por defecto
          matricula: matricula.toUpperCase(),
          clienteId: cliente.id
        }
      })
    }

    // Buscar el servicio por nombre
    const servicioDb = await prisma.servicio.findFirst({
      where: {
        nombre: servicio
      }
    })

    if (!servicioDb) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 400 }
      )
    }

    // Obtener el primer box de la configuración
    const boxesConfig = await prisma.configuracion.findUnique({
      where: { clave: 'boxes.nombres' }
    })
    
    let primerBox = 'Box 1' // Valor por defecto
    if (boxesConfig) {
      try {
        const boxNames = JSON.parse(boxesConfig.valor)
        if (boxNames && Array.isArray(boxNames) && boxNames.length > 0) {
          primerBox = boxNames[0]
        }
      } catch (e) {
        console.error('Error parsing boxes config:', e)
      }
    }

    // Calcular hora fin (añadir 1 hora por defecto)
    const [horaInicio, minutos] = hora.split(':').map(Number)
    let horaFin = `${(horaInicio + 1).toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`

    // Crear la reserva (cita)
    const cita = await prisma.cita.create({
      data: {
        fecha: fechaCita,
        horaInicio: hora,
        horaFin,
        clienteId: cliente.id,
        vehiculoId: vehiculo.id,
        box: primerBox, // Usa el primer box de la configuración
        estado: 'PENDIENTE',
        observaciones: mensaje || `Reserva online - ${servicio}`,
        cita_servicios: {
          create: [
            {
              id: `cs_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
              servicioId: servicioDb.id,
              precio: servicioDb.precio
            }
          ]
        }
      },
      include: {
        cliente: true,
        vehiculo: true,
        cita_servicios: {
          include: {
            servicios: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      cita
    })
  } catch (error) {
    console.error('Error creating reservation:', error)
    return NextResponse.json(
      { error: 'Error al crear la reserva' },
      { status: 500 }
    )
  }
}
