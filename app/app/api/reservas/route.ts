
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLocalContext, buildLocalFilter } from '@/lib/local-context'
import { syncReservaToAD4U, buildAD4UPayloadFromReserva } from '@/lib/autodetail4u-sync'

export const dynamic = 'force-dynamic'

/**
 * GET /api/reservas
 * - Sin parámetros: Lista todas las reservas (filtradas por local)
 * - Con fecha y hora: Verifica disponibilidad
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fecha = searchParams.get('fecha')
    const hora = searchParams.get('hora')

    // Si hay fecha y hora, verificar disponibilidad (endpoint público)
    if (fecha && hora) {
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

      return NextResponse.json({
        disponible: !citaExistente,
        mensaje: citaExistente 
          ? 'Este horario ya está ocupado. Por favor elige otra hora.' 
          : 'Horario disponible'
      })
    }

    // Sin parámetros: listar reservas (requiere sesión)
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener contexto multi-local
    const localContext = await getLocalContext()
    if (!localContext) {
      return NextResponse.json([])
    }
    
    const localFilter = buildLocalFilter(localContext)

    const reservas = await prisma.reservas.findMany({
      where: localFilter,
      include: {
        local: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(reservas)
  } catch (error) {
    console.error('Error en reservas:', error)
    return NextResponse.json(
      { error: 'Error al procesar solicitud' },
      { status: 500 }
    )
  }
}

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
      mensaje,
      localId  // Nuevo: local seleccionado
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

    // Crear la reserva (cita) con localId
    const cita = await prisma.cita.create({
      data: {
        fecha: fechaCita,
        horaInicio: hora,
        horaFin,
        clienteId: cliente.id,
        vehiculoId: vehiculo.id,
        box: primerBox,
        estado: 'PENDIENTE',
        observaciones: mensaje || `Reserva online - ${servicio}`,
        ...(localId && { localId }), // Asignar local si se proporcionó
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
        local: true,
        cita_servicios: {
          include: {
            servicios: true
          }
        }
      }
    })
    
    // También guardar en el modelo reservas para tracking
    await prisma.reservas.create({
      data: {
        id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        nombre,
        apellido: apellido || null,
        email: email || '',
        telefono,
        fecha: fechaCita,
        hora,
        vehiculo: `${marcaModelo} - ${matricula}`,
        servicio,
        mensaje: mensaje || null,
        estado: 'PENDIENTE',
        localId: localId || null,
        updatedAt: new Date(),
      }
    })

    // 🔄 Sync a autodetail4u (fire-and-forget)
    const ad4uPayload = buildAD4UPayloadFromReserva({
      nombre,
      apellido,
      telefono,
      email,
      fecha: fechaCita,
      hora,
      servicio,
      marcaModelo,
      matricula,
      localId,
    })
    syncReservaToAD4U(ad4uPayload).catch(() => {})

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
