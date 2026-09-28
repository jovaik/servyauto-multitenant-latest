export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext, getLocalIdForCreate } from '@/lib/local-context'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { fecha, horaInicio, box, nombre, telefono, marca, modelo, observaciones } = body

    if (!fecha || !horaInicio || !nombre || !telefono) {
      return NextResponse.json({ error: 'Faltan campos requeridos (fecha, hora, nombre, teléfono)' }, { status: 400 })
    }

    const localContext = await getLocalContext()
    const localId = localContext ? getLocalIdForCreate(localContext) : null

    // User info for traceability
    const userEmail = session?.user?.email || ''
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, name: true }
    })
    const userName = user?.name || session?.user?.name || userEmail

    // Calculate horaFin = horaInicio + 1 hour (default)
    const [h, m] = horaInicio.split(':').map(Number)
    const endH = Math.min(h + 1, 23)
    const horaFin = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`

    // Assign box: use provided or default to 'Box 1'
    const boxFinal = box || 'Box 1'

    // Transaction: find/create client, find/create vehicle, create cita
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Find or create client by phone
      const telefonoClean = telefono.trim()
      let cliente = await tx.cliente.findFirst({
        where: { telefono: telefonoClean },
      })

      if (!cliente) {
        cliente = await tx.cliente.create({
          data: {
            nombre: nombre.trim(),
            telefono: telefonoClean,
            localId,
            creadoPorId: user?.id || null,
            creadoPorNombre: userName,
          }
        })
      }

      // 2. Find or create vehicle
      let vehiculo
      const hasCar = marca && marca.trim()
      if (hasCar) {
        const marcaUp = marca.trim().toUpperCase()
        const modeloUp = (modelo || '').trim().toUpperCase() || 'SIN MODELO'
        // Try to find existing vehicle for this client with same brand/model
        vehiculo = await tx.vehiculo.findFirst({
          where: {
            clienteId: cliente.id,
            marca: marcaUp,
            modelo: modeloUp,
          }
        })
        if (!vehiculo) {
          vehiculo = await tx.vehiculo.create({
            data: {
              marca: marcaUp,
              modelo: modeloUp,
              matricula: `PEND-${Date.now().toString(36).toUpperCase()}`,
              anio: new Date().getFullYear(),
              clienteId: cliente.id,
              localId,
              creadoPorId: user?.id || null,
              creadoPorNombre: userName,
            }
          })
        }
      } else {
        // No car data — find existing placeholder or create one
        vehiculo = await tx.vehiculo.findFirst({
          where: {
            clienteId: cliente.id,
            marca: 'PENDIENTE',
            modelo: 'PENDIENTE',
          }
        })
        if (!vehiculo) {
          vehiculo = await tx.vehiculo.create({
            data: {
              marca: 'PENDIENTE',
              modelo: 'PENDIENTE',
              matricula: `PEND-${Date.now().toString(36).toUpperCase()}`,
              anio: new Date().getFullYear(),
              clienteId: cliente.id,
              localId,
              creadoPorId: user?.id || null,
              creadoPorNombre: userName,
            }
          })
        }
      }

      // 3. Create cita
      const fechaCita = new Date(fecha)
      const cita = await tx.cita.create({
        data: {
          fecha: fechaCita,
          horaInicio,
          horaFin,
          box: boxFinal,
          estado: 'PENDIENTE',
          observaciones: observaciones || null,
          total: 0,
          clienteId: cliente.id,
          vehiculoId: vehiculo.id,
          localId,
          creadoPorId: user?.id || null,
          creadoPorNombre: userName,
        },
        include: {
          cliente: true,
          vehiculo: true,
        }
      })

      return cita
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error en reserva rápida:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear la reserva rápida' },
      { status: 500 }
    )
  }
}
