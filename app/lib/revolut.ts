/**
 * Revolut Merchant API - enlaces de pago (orders).
 * Docs: https://developer.revolut.com/docs/merchant/create-order
 *
 * Variables de entorno:
 *   REVOLUT_SECRET_KEY  -> clave secreta (sk_...) de Revolut Business > Merchant API
 *   REVOLUT_ENV         -> 'production' (por defecto) o 'sandbox'
 */
import { prisma } from '@/lib/db'

const API_VERSION = '2024-09-01'

function baseUrl() {
  return process.env.REVOLUT_ENV === 'sandbox'
    ? 'https://sandbox-merchant.revolut.com'
    : 'https://merchant.revolut.com'
}

export function isRevolutConfigured() {
  return !!process.env.REVOLUT_SECRET_KEY
}

async function revolutFetch(path: string, init: RequestInit = {}) {
  const key = process.env.REVOLUT_SECRET_KEY
  if (!key) throw new Error('Revolut no está configurado (falta la clave secreta).')
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      'Revolut-Api-Version': API_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })
  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = { raw: text } }
  if (!res.ok) {
    const msg = data?.message || data?.error || text || `HTTP ${res.status}`
    throw new Error(`Revolut: ${msg}`)
  }
  return data
}

export interface RevolutOrder {
  id: string
  token?: string
  state: string // pending | processing | authorised | completed | cancelled | failed
  checkout_url?: string
  amount?: number
  currency?: string
  type?: string
  created_at?: string
  updated_at?: string
  description?: string
  refunded_amount?: number
  merchant_order_data?: { reference?: string }
}

/** Consulta de solo lectura; no crea ni captura pagos. */
export async function listRevolutOrders(): Promise<RevolutOrder[]> {
  const data = await revolutFetch('/api/orders?limit=100')
  const orders = Array.isArray(data) ? data : data?.orders
  if (!Array.isArray(orders)) throw new Error('Revolut no devolvió una lista de pedidos válida.')
  return orders
}

export async function createRevolutOrder(params: {
  amount: number // en euros
  description: string
  reference: string
  customerEmail?: string | null
}): Promise<RevolutOrder> {
  const body: any = {
    amount: Math.round(params.amount * 100),
    currency: 'EUR',
    description: params.description,
    merchant_order_data: { reference: params.reference },
  }
  if (params.customerEmail) body.customer = { email: params.customerEmail }
  return revolutFetch('/api/orders', { method: 'POST', body: JSON.stringify(body) })
}

export async function getRevolutOrder(orderId: string): Promise<RevolutOrder> {
  return revolutFetch(`/api/orders/${encodeURIComponent(orderId)}`)
}

export async function cancelRevolutOrder(orderId: string) {
  return revolutFetch(`/api/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'POST' })
}

/** Traduce el estado de Revolut al mismo vocabulario que usa SumUp en la app. */
export function mapRevolutState(state: string): 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' {
  const s = (state || '').toLowerCase()
  if (s === 'completed') return 'PAID'
  if (s === 'failed') return 'FAILED'
  if (s === 'cancelled') return 'CANCELLED'
  return 'PENDING'
}

/**
 * Consulta el estado en Revolut, lo guarda y, si está pagado, marca el método de
 * pago REVOLUT en la cita (o la factura) asociada.
 * Es idempotente: no vuelve a conciliar un pedido ya conciliado.
 */
export async function refreshAndReconcileRevolut(orderId: string) {
  const order = await getRevolutOrder(orderId)
  const status = mapRevolutState(order.state)

  const txn = await prisma.revolut_transactions.findUnique({ where: { order_id: orderId } })
  if (!txn) return { status, order }

  if (txn.status !== status) {
    await prisma.revolut_transactions.update({ where: { id: txn.id }, data: { status } })
  }

  if (status === 'PAID' && !txn.reconciled) {
    await reconcile(txn)
  }
  return { status, order }
}

async function reconcile(txn: any) {
  try {
    if (txn.citaId) {
      await prisma.cita.update({
        where: { id: txn.citaId },
        data: { metodoPago: 'REVOLUT' },
      })
    }
    if (txn.facturaId) {
      await prisma.factura.update({
        where: { id: txn.facturaId },
        data: { metodoPago: 'REVOLUT', estado: 'PAGADA' },
      })
    }
  } catch (e) {
    console.warn('[Revolut] Aviso al marcar el pago en cita/factura:', e)
  }

  await prisma.revolut_transactions.update({ where: { id: txn.id }, data: { reconciled: true } })
  console.log(`[Revolut] Cobro ${txn.order_id} conciliado €${txn.amount} (cita=${txn.citaId || '-'} factura=${txn.facturaId || '-'})`)
}
