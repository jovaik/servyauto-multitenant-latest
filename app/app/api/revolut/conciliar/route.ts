export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext, getAllowedLocalIds } from '@/lib/local-context'
import { getRevolutOrder, listRevolutOrders, RevolutOrder } from '@/lib/revolut'

class Conflict extends Error {
  constructor(message: string, public status = 409) { super(message) }
}
const cents = (value: number) => Math.round(value * 100)
const orderIdValid = (id: unknown): id is string => typeof id === 'string' && /^[a-zA-Z0-9-]{10,80}$/.test(id)
const eligible = (o: RevolutOrder) => o.state === 'completed' && o.currency === 'EUR' && o.type === 'payment' && Number.isInteger(o.amount) && (o.amount || 0) > 0 && !(o.refunded_amount || 0)
const safeOrder = (o: RevolutOrder) => ({ id: o.id, importe: (o.amount || 0) / 100, fecha: o.updated_at || o.created_at, descripcion: o.description || '', referencia: o.merchant_order_data?.reference || '' })

async function authorize(citaId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) throw new Conflict('No autorizado', 401)
  const context = await getLocalContext()
  if (!context || !['SUPER_ADMIN', 'GRUPO_ADMIN', 'ADMIN'].includes(context.userRole)) throw new Conflict('La conciliación requiere permisos de administración.', 403)
  const allowed = getAllowedLocalIds(context)
  const cita = await prisma.cita.findFirst({ where: { id: citaId, ...(allowed ? { localId: { in: allowed } } : {}) } })
  if (!cita) throw new Conflict('Cita no encontrada o sin acceso a su local.', 404)
  if (!cita.localId) throw new Conflict('Asigna un local a la cita antes de conciliar.')
  if (cita.facturaAgrupadaId) throw new Conflict('Esta cita pertenece a un documento agrupado. Gestiona su cobro desde Facturación.')
  return session
}

function failure(error: unknown) {
  if (error instanceof Conflict) return NextResponse.json({ error: error.message }, { status: error.status })
  console.error('[Revolut conciliación] Fallo de consulta o registro:', error instanceof Error ? error.name : 'Error')
  return NextResponse.json({ error: 'No se pudo consultar o conciliar Revolut. No vuelvas a registrar el pago manualmente sin comprobar antes la lista de pagos.' }, { status: 502 })
}

// Lista solo cobros completos sin vincular. Nunca asocia por mera coincidencia de importe.
export async function GET(req: NextRequest) {
  try {
    const citaId = req.nextUrl.searchParams.get('citaId') || ''
    await authorize(citaId)
    const orderId = req.nextUrl.searchParams.get('orderId')
    if (orderId && !orderIdValid(orderId)) throw new Conflict('Identificador de operación inválido.', 400)
    const orders = orderId ? [await getRevolutOrder(orderId)] : await listRevolutOrders()
    const candidates = orders.filter(eligible)
    const known = await prisma.revolut_transactions.findMany({ where: { order_id: { in: candidates.map(o => o.id) } }, select: { order_id: true } })
    const linked = new Set(known.map(t => t.order_id))
    return NextResponse.json({ cobros: candidates.filter(o => !linked.has(o.id)).map(safeOrder), consultados: orders.length, limite: orderId ? 1 : 100 }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return failure(error) }
}

export async function POST(req: NextRequest) {
  try {
    const { citaId, orderId, confirmado } = await req.json()
    if (typeof citaId !== 'string' || !orderIdValid(orderId) || confirmado !== true) throw new Conflict('Selecciona y confirma el cobro que corresponde a esta cita.', 400)
    const session = await authorize(citaId)
    // Se vuelve a comprobar en Revolut; nunca confiar en importe/estado del navegador.
    const order = await getRevolutOrder(orderId)
    if (order.id !== orderId || !eligible(order)) throw new Conflict('El cobro debe estar completado en EUR y sin devoluciones. No se ha registrado ningún ingreso.')
    const fecha = new Date(order.updated_at || order.created_at || '')
    if (!Number.isFinite(fecha.getTime())) throw new Conflict('Revolut no proporciona una fecha válida para el cobro.')
    const user = await prisma.user.findUnique({ where: { email: session.user!.email! }, select: { id: true, name: true } })
    const result = await prisma.$transaction(async tx => {
      // Serializar las conciliaciones de una cita; order_id único protege entre citas.
      await tx.$queryRaw`SELECT id FROM citas WHERE id = ${citaId} FOR UPDATE`
      const cita = await tx.cita.findUniqueOrThrow({ where: { id: citaId }, include: { pagosParciales: true, facturas: true } })
      const existing = await tx.revolut_transactions.findUnique({ where: { order_id: orderId } })
      if (existing) {
        if (existing.citaId === citaId && existing.reconciled && await tx.pagoParcial.findUnique({ where: { id: `revolut-${orderId}` } })) {
          return { yaConciliado: true, saldoPendiente: Math.max(0, (cents(cita.total || 0) - cita.pagosParciales.reduce((s, p) => s + cents(p.importe), 0)) / 100), saldada: !cita.cobroDiferido && !!cita.metodoPago }
        }
        throw new Conflict('Este cobro ya está vinculado. Utiliza su cita o documento original; no se duplica.')
      }
      if (cita.facturaAgrupadaId || ['CANCELADA', 'NO_SHOW'].includes(cita.estado) || cita.facturas?.estado === 'CANCELADA') throw new Conflict('Esta cita no admite conciliación individual.')
      if (cita.facturas?.estado === 'PAGADA' || (!cita.cobroDiferido && cita.estado !== 'PAGO_POSTERIOR' && cita.metodoPago)) throw new Conflict('La cita ya figura cobrada. Revisa sus pagos antes de añadir otro ingreso.')
      const paid = cita.pagosParciales.reduce((s, p) => s + cents(p.importe), 0)
      const pending = cents(cita.total || 0) - paid
      if (order.amount! > pending) throw new Conflict('El cobro supera el saldo pendiente. No se ha registrado para evitar un ingreso duplicado o excesivo.')
      const day = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
      if (cita.pagosParciales.some(p => p.metodoPago === 'REVOLUT' && cents(p.importe) === order.amount && day(p.fecha) === day(fecha))) throw new Conflict('Ya hay un pago Revolut del mismo importe y día en esta cita. Revísalo antes de conciliar para no duplicarlo.')
      const importe = order.amount! / 100
      const saldada = order.amount === pending
      await tx.revolut_transactions.create({ data: {
        id: `externo-${orderId}`, order_id: orderId, amount: importe, currency: 'EUR', status: 'PAID',
        description: order.description || 'Cobro externo Revolut', reference: order.merchant_order_data?.reference || orderId,
        citaId, localId: cita.localId, creadoPorId: user?.id, creadoPorNombre: user?.name || session.user?.name, reconciled: true,
      } })
      await tx.pagoParcial.create({ data: {
        id: `revolut-${orderId}`, citaId, importe, metodoPago: 'REVOLUT', fecha,
        concepto: `REVOLUT CONCILIADO · ${orderId}`, creadoPorId: user?.id, creadoPorNombre: user?.name || session.user?.name,
      } })
      await tx.cita.update({ where: { id: citaId }, data: {
        cobroDiferido: !saldada, metodoPago: saldada ? 'REVOLUT' : null,
        ...(saldada ? { vencimientoCredito: null, tpvUserId: null, tpvNombre: null } : {}),
        ...(cita.estado === 'PAGO_POSTERIOR' ? { estado: 'COMPLETADA' } : {}),
      } })
      if (saldada && cita.facturas) await tx.factura.update({ where: { id: cita.facturas.id }, data: { estado: 'PAGADA', metodoPago: 'REVOLUT', fechaPago: fecha, tpvUserId: null, tpvNombre: null } })
      return { yaConciliado: false, importe, saldoPendiente: (pending - order.amount!) / 100, saldada }
    })
    return NextResponse.json(result)
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'El cobro ya se ha vinculado desde otra petición. Actualiza los pagos; no se ha duplicado.' }, { status: 409 })
    return failure(error)
  }
}
