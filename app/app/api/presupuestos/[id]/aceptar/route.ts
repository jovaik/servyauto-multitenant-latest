export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { randomUUID } from 'crypto'

// POST: aceptar un presupuesto → lo mete en agenda creando una Cita PENDIENTE
// y marca el presupuesto como ACEPTADO. A partir de ahí sigue el flujo normal
// de citas (completar → ticket → opción de convertir a factura).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const fechaBody: string | undefined = body?.fecha
    const horaInicioBody: string | undefined = body?.horaInicio

    const presupuesto = await prisma.presupuesto.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        cliente: true,
        vehiculo: true,
      },
    })
    if (!presupuesto) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })

    if (presupuesto.estado === 'ACEPTADO') {
      return NextResponse.json({ error: 'Este presupuesto ya está aceptado y en agenda.' }, { status: 400 })
    }
    if (presupuesto.estado === 'CONVERTIDO') {
      return NextResponse.json({ error: 'Este presupuesto ya se convirtió en documento.' }, { status: 400 })
    }

    const localId = presupuesto.localId
    if (!localId) {
      return NextResponse.json(
        { error: 'El presupuesto no tiene local asignado. No se puede meter en agenda.' },
        { status: 400 }
      )
    }

    // Trazabilidad usuario
    const userEmail = session?.user?.email || ''
    const user = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true, name: true } })
    const userName = user?.name || session?.user?.name || userEmail

    const cita = await prisma.$transaction(async (tx: any) => {
      // 1. Resolver CLIENTE
      let clienteId = presupuesto.clienteId
      if (!clienteId) {
        const telefono = (presupuesto.clienteTelefono || '').trim()
        let cliente = null
        if (telefono) {
          cliente = await tx.cliente.findFirst({ where: { telefono, localId } })
        }
        if (!cliente) {
          cliente = await tx.cliente.create({
            data: {
              nombre: (presupuesto.clienteNombre || 'CLIENTE').trim().toUpperCase(),
              telefono: telefono || 'SIN TELÉFONO',
              email: presupuesto.clienteEmail || null,
              localId,
              creadoPorId: user?.id || null,
              creadoPorNombre: userName,
            },
          })
        }
        clienteId = cliente.id
      }

      // 2. Resolver VEHÍCULO
      let vehiculoId = presupuesto.vehiculoId
      if (!vehiculoId) {
        // buscar placeholder existente del cliente o crear uno
        let vehiculo = await tx.vehiculo.findFirst({
          where: { clienteId, marca: 'PENDIENTE', modelo: 'PENDIENTE' },
        })
        if (!vehiculo) {
          vehiculo = await tx.vehiculo.create({
            data: {
              marca: 'PENDIENTE',
              modelo: 'PENDIENTE',
              matricula: `PEND-${Date.now().toString(36).toUpperCase()}`,
              anio: new Date().getFullYear(),
              clienteId,
              localId,
              creadoPorId: user?.id || null,
              creadoPorNombre: userName,
            },
          })
        }
        vehiculoId = vehiculo.id
      }

      // 3. Fecha/hora de la cita (hoy por defecto, 09:00-10:00)
      const fechaCita = fechaBody ? new Date(fechaBody) : new Date()
      const horaInicio = horaInicioBody || '09:00'
      const [h, m] = horaInicio.split(':').map(Number)
      const endH = Math.min((h || 9) + 1, 23)
      const horaFin = `${String(endH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`

      // 4. Observaciones: nº presupuesto + líneas manuales (sin servicio de catálogo)
      const lineasManuales = presupuesto.items
        .filter((it: any) => !it.servicioId)
        .map((it: any) => `${it.descripcion} (${it.cantidad} x ${it.precioUnitario.toFixed(2)}€)`)
      const obsPartes = [`Desde presupuesto ${presupuesto.numero}`]
      if (lineasManuales.length) obsPartes.push(`Conceptos: ${lineasManuales.join('; ')}`)
      if (presupuesto.observaciones) obsPartes.push(presupuesto.observaciones)
      const observaciones = obsPartes.join('\n')

      // 5. Crear Cita PENDIENTE
      const nuevaCita = await tx.cita.create({
        data: {
          fecha: fechaCita,
          horaInicio,
          horaFin,
          box: 'Box 1',
          estado: 'PENDIENTE',
          observaciones,
          total: presupuesto.total || 0,
          clienteId,
          vehiculoId,
          localId,
          creadoPorId: user?.id || null,
          creadoPorNombre: userName,
        },
      })

      // 6. Servicios de catálogo → cita_servicios
      const serviciosCatalogo = presupuesto.items.filter((it: any) => it.servicioId)
      for (const it of serviciosCatalogo) {
        try {
          await tx.cita_servicios.create({
            data: {
              id: randomUUID(),
              citaId: nuevaCita.id,
              servicioId: it.servicioId,
              precio: it.precioUnitario,
            },
          })
        } catch (e) {
          // ignorar duplicados (@@unique citaId+servicioId)
        }
      }

      // 7. Marcar presupuesto como ACEPTADO
      await tx.presupuesto.update({
        where: { id: presupuesto.id },
        data: { estado: 'ACEPTADO' },
      })

      return nuevaCita
    })

    return NextResponse.json({ ok: true, cita })
  } catch (error: any) {
    console.error('Error aceptando presupuesto:', error)
    return NextResponse.json({ error: error.message || 'Error al aceptar el presupuesto' }, { status: 500 })
  }
}
