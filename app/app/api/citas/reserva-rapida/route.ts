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
    const { fecha, horaInicio, box, nombre, telefono, marca, modelo, matricula, observaciones, clienteId, vehiculoId } = body

    if (!fecha || !horaInicio || !nombre || !telefono) {
      return NextResponse.json({ error: 'Faltan campos requeridos (fecha, hora, nombre, teléfono)' }, { status: 400 })
    }

    const localContext = await getLocalContext()
    const localId = localContext ? getLocalIdForCreate(localContext) : null

    if (!localId) {
      return NextResponse.json(
        { error: 'Debes seleccionar un local concreto para crear una reserva rápida' },
        { status: 400 }
      )
    }

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
    const telefonoClean = (telefono || '').trim()
    const matriculaUp = (matricula || '').trim().toUpperCase()
    const matriculaReal = !!matriculaUp && !matriculaUp.startsWith('PEND-')

    const result = await prisma.$transaction(async (tx: any) => {
      let cliente: any = null
      let vehiculo: any = null

      // A) Reutilizar ficha existente seleccionada en el autocompletar (por vehiculoId)
      if (vehiculoId) {
        vehiculo = await tx.vehiculo.findUnique({ where: { id: vehiculoId }, include: { cliente: true } })
        if (vehiculo?.cliente) cliente = vehiculo.cliente
      }

      // B) Reutilizar cliente seleccionado (por clienteId)
      if (!cliente && clienteId) {
        cliente = await tx.cliente.findUnique({ where: { id: clienteId } })
      }

      // C) Si hay matrícula real y aún no tenemos vehículo, buscar vehículo existente por matrícula
      if (!vehiculo && matriculaReal) {
        vehiculo = await tx.vehiculo.findFirst({ where: { matricula: matriculaUp, localId }, include: { cliente: true } })
        if (vehiculo?.cliente && !cliente) cliente = vehiculo.cliente
      }

      // D) Si seguimos sin cliente, buscar por teléfono o crear nuevo
      if (!cliente) {
        cliente = await tx.cliente.findFirst({ where: { telefono: telefonoClean } })
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
      }

      // E) Si seguimos sin vehículo, buscar/crear
      if (!vehiculo) {
        const hasCar = marca && marca.trim()
        const marcaUp = hasCar ? marca.trim().toUpperCase() : 'PENDIENTE'
        const modeloUp = hasCar ? ((modelo || '').trim().toUpperCase() || 'SIN MODELO') : 'PENDIENTE'

        // Si NO hay matrícula real, intentar reutilizar vehículo del cliente con misma marca/modelo
        if (!matriculaReal) {
          vehiculo = await tx.vehiculo.findFirst({
            where: { clienteId: cliente.id, marca: marcaUp, modelo: modeloUp }
          })
        }

        if (!vehiculo) {
          const matriculaFinal = matriculaReal ? matriculaUp : `PEND-${Date.now().toString(36).toUpperCase()}`
          vehiculo = await tx.vehiculo.create({
            data: {
              marca: marcaUp,
              modelo: modeloUp,
              matricula: matriculaFinal,
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
