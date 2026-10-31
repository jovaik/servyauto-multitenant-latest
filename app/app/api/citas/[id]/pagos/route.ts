export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET: listar pagos parciales de una cita + saldo pendiente
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const cita = await prisma.cita.findUnique({
      where: { id: params.id },
      select: { id: true, total: true },
    })
    if (!cita) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })

    const pagos = await prisma.pagoParcial.findMany({
      where: { citaId: params.id },
      orderBy: { fecha: 'asc' },
    })

    const totalPagado = pagos.reduce((s: number, p: any) => s + (p.importe || 0), 0)
    const saldoPendiente = Math.round(((cita.total || 0) - totalPagado) * 100) / 100

    return NextResponse.json({ pagos, totalCita: cita.total || 0, totalPagado, saldoPendiente })
  } catch (error: any) {
    console.error('Error GET pagos parciales:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: registrar un nuevo pago parcial
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const cita = await prisma.cita.findUnique({
      where: { id: params.id },
      select: { id: true, total: true, localId: true, facturaAgrupadaId: true },
    })
    if (!cita) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })

    if (cita.facturaAgrupadaId) {
      const documento = await prisma.factura.findUnique({ where: { id: cita.facturaAgrupadaId }, select: { estado: true } })
      if (documento?.estado === 'PAGADA') return NextResponse.json({ error: 'El documento agrupado ya está pagado. No se puede registrar otro cobro.' }, { status: 409 })
    }
    const body = await req.json()
    const importe = parseFloat(body.importe)
    if (!importe || importe <= 0) {
      return NextResponse.json({ error: 'Importe inválido' }, { status: 400 })
    }
    const metodoPago = body.metodoPago
    if (!['EFECTIVO', 'TPV_SUMUP', 'TPV_UNICAJA', 'REVOLUT'].includes(metodoPago)) {
      return NextResponse.json({ error: 'Método de pago inválido' }, { status: 400 })
    }

    const userEmail = session?.user?.email || ''
    const user = await prisma.user.findUnique({ where: { email: userEmail }, select: { id: true, name: true } })
    const userName = user?.name || session?.user?.name || userEmail

    const fecha = body.fecha ? new Date(body.fecha + 'T12:00:00') : new Date()
    const concepto = (body.concepto || '').trim().toUpperCase() || null
    // Cuenta/TPV concreta (autónomo) que recibe el pago. Solo aplica a pagos con tarjeta.
    const tpvUserId = ['TPV_SUMUP', 'TPV_UNICAJA', 'REVOLUT'].includes(metodoPago) ? (body.tpvUserId || null) : null
    const tpvNombre = tpvUserId ? ((body.tpvNombre || '').trim().toUpperCase() || null) : null

    const pago = await prisma.pagoParcial.create({
      data: {
        citaId: params.id,
        importe,
        metodoPago,
        fecha,
        concepto,
        tpvUserId,
        tpvNombre,
        creadoPorId: user?.id || null,
        creadoPorNombre: userName,
      },
    })

    // Recalcular saldo
    const pagos = await prisma.pagoParcial.findMany({ where: { citaId: params.id } })
    const totalPagado = pagos.reduce((s: number, p: any) => s + (p.importe || 0), 0)
    const saldoPendiente = Math.round(((cita.total || 0) - totalPagado) * 100) / 100

    return NextResponse.json({ pago, totalPagado, saldoPendiente })
  } catch (error: any) {
    console.error('Error POST pago parcial:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: eliminar un pago parcial (por query param ?pagoId=xxx)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const pagoId = req.nextUrl.searchParams.get('pagoId')
    if (!pagoId) return NextResponse.json({ error: 'pagoId requerido' }, { status: 400 })

    const pago = await prisma.pagoParcial.findUnique({ where: { id: pagoId } })
    if (!pago || pago.citaId !== params.id) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    await prisma.pagoParcial.delete({ where: { id: pagoId } })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Error DELETE pago parcial:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
