// Lecturas reales de Revolut; endpoints reales y BD en una transacción SIEMPRE revertida.
// No se envían cargos, cancelaciones ni devoluciones a Revolut.
import assert from 'node:assert/strict'
import { prisma as real } from '../lib/db'
import { listRevolutOrders, getRevolutOrder } from '../lib/revolut'
const Module = require('node:module')
const originalLoad = Module._load
let tx: any
let context: any = { canSeeAll: true, userRole: 'SUPER_ADMIN', localId: null }
let authenticated = true
let email = ''
let order: any
const proxy = new Proxy({}, { get: (_, key) => key === '$transaction' ? (fn: any) => fn(tx) : tx[key] })
const mocks: Record<string, any> = {
  'next-auth': { getServerSession: async () => authenticated ? { user: { email, name: 'VERIFICACIÓN' } } : null },
  '@/lib/auth': { authOptions: {} },
  '@/lib/db': { prisma: proxy },
  '@/lib/local-context': { getLocalContext: async () => context, getAllowedLocalIds: (c: any) => c.canSeeAll ? null : [c.localId], buildLocalFilter: (c: any) => c.selectedLocalId ? { localId: c.selectedLocalId } : {} },
  '@/lib/revolut': { isRevolutConfigured: () => true, listRevolutOrders: async () => [order], getRevolutOrder: async () => order, refreshAndReconcileRevolut: async () => { throw Error('No debe consultar pedidos desconocidos') } },
}
Module._load = function(request: string, parent: any, isMain: boolean) { return request in mocks ? mocks[request] : originalLoad.call(this, request, parent, isMain) }
const { GET, POST } = require('../app/api/revolut/conciliar/route')
const { POST: oldSync } = require('../app/api/revolut/sync/route')
const { GET: diaryPayments } = require('../app/api/pagos-parciales/route')
const { DELETE: deletePayment } = require('../app/api/citas/[id]/pagos/route')
const { NextRequest } = require('next/server')
function req(path: string, body?: any) { return new NextRequest('http://localhost'+path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined) }
const rollback = new Error('ROLLBACK_VERIFICATION')
async function main() {
  const orders = await listRevolutOrders()
  const known = await real.revolut_transactions.findMany({ select: { order_id: true } })
  const candidate = orders.find(o => o.state === 'completed' && o.currency === 'EUR' && o.type === 'payment' && !known.some(k => k.order_id === o.id))
  assert(candidate, 'No hay un cobro real sin vincular disponible para la prueba de lectura')
  order = await getRevolutOrder(candidate.id)
  const originalOrder = { ...order }
  assert.equal(order.state, 'completed')
  const amount = order.amount / 100
  email = (await real.user.findFirstOrThrow({ where: { role: 'SUPER_ADMIN' }, select: { email: true } })).email!
  const source = await real.cita.findFirstOrThrow({ where: { localId: { not: null } } })
  const anotherLocal = await real.local.findFirstOrThrow({ where: { id: { not: source.localId! } } })
  let fixtureId = ''
  try {
    await real.$transaction(async (client: any) => {
      tx = client
      const cita = await tx.cita.create({ data: { fecha: new Date(), horaInicio: '00:00', horaFin: '00:01', box: 'VERIFICACIÓN REVERTIDA', estado: 'COMPLETADA', cobroDiferido: true, total: amount + 10, clienteId: source.clienteId, vehiculoId: source.vehiculoId, localId: source.localId } })
      fixtureId = cita.id
      const url = '/api/revolut/conciliar?citaId='+cita.id
      const body = { citaId: cita.id, orderId: order.id, confirmado: true }
      const post = () => POST(req('/api/revolut/conciliar', body))
      // Antes: sync no puede descubrir cobros creados fuera de ServyAuto.
      const previous = await (await oldSync(req('/api/revolut/sync', { citaId: cita.id }))).json()
      assert.equal(previous.sincronizadas, 0); assert.equal(previous.alguno_pagado, false)
      const listed = await (await GET(req(url))).json()
      assert.equal(listed.cobros[0].id, order.id)
      assert(!JSON.stringify(listed).includes('token'))
      authenticated = false; assert.equal((await GET(req(url))).status, 401); authenticated = true
      context = { canSeeAll: false, userRole: 'ADMIN', localId: anotherLocal.id }
      assert.equal((await post()).status, 404)
      context = { canSeeAll: true, userRole: 'SUPER_ADMIN', selectedLocalId: source.localId }
      for (const overrides of [{ state: 'pending' }, { state: 'failed' }, { currency: 'USD' }, { refunded_amount: 1 }, { amount: order.amount + 2000 }]) {
        order = { ...originalOrder, ...overrides }
        assert.equal((await post()).status, 409)
      }
      order = { ...originalOrder }
      // Primer pago parcial real (en transacción revertida), conserva el local y estado físico.
      let response = await post(); let result = await response.json()
      assert.equal(response.status, 200, JSON.stringify(result)); assert.equal(result.saldoPendiente, 10); assert.equal(result.saldada, false)
      let saved = await tx.cita.findUniqueOrThrow({ where: { id: cita.id } })
      assert.equal(saved.localId, source.localId); assert.equal(saved.estado, 'COMPLETADA'); assert.equal(saved.cobroDiferido, true)
      assert.equal((await (await post()).json()).yaConciliado, true)
      assert.equal(await tx.pagoParcial.count({ where: { citaId: cita.id } }), 1)
      assert.equal((await (await GET(req(url))).json()).cobros.length, 0)
      assert.equal((await deletePayment(req(`/api/citas/${cita.id}/pagos?pagoId=revolut-${order.id}`), { params: { id: cita.id } })).status, 409)
      let payments = await (await diaryPayments()).json()
      assert.equal(payments.find((p: any) => p.citaId === cita.id).importe, amount)
      assert.equal(payments.find((p: any) => p.citaId === cita.id).metodoPago, 'REVOLUT')
      context.selectedLocalId = anotherLocal.id
      assert(!(await (await diaryPayments()).json()).some((p: any) => p.citaId === cita.id))
      context.selectedLocalId = source.localId
      // Segundo cobro simulado de 10 EUR para completar el saldo (ninguna llamada de cargo).
      order = { ...originalOrder, id: 'test-revolut-second-order', amount: 1000 }
      body.orderId = order.id
      const factura = await tx.factura.create({ data: { numero: 'TEST-REV-'+cita.id, tipo: 'TICKET', total: amount+10, subtotal: (amount+10)/1.21, iva: (amount+10)-(amount+10)/1.21, estado: 'PENDIENTE', clienteId: cita.clienteId, citaId: cita.id, localId: source.localId } })
      response = await post(); result = await response.json()
      assert.equal(response.status, 200, JSON.stringify(result)); assert.equal(result.saldoPendiente, 0); assert.equal(result.saldada, true)
      saved = await tx.cita.findUniqueOrThrow({ where: { id: cita.id } })
      assert.equal(saved.cobroDiferido, false); assert.equal(saved.metodoPago, 'REVOLUT')
      const ticket = await tx.factura.findUniqueOrThrow({ where: { id: factura.id } })
      assert.equal(ticket.estado, 'PAGADA'); assert.equal(ticket.localId, source.localId)
      payments = (await (await diaryPayments()).json()).filter((p: any) => p.citaId === cita.id)
      const paid = payments.reduce((s: number, p: any) => s + p.importe, 0)
      assert.equal(paid, amount+10)
      assert.equal(Math.max(0, Math.round((ticket.total-paid)*100)/100) + paid, ticket.total)
      // Reutilizar el cobro para otra cita está bloqueado.
      body.citaId = source.id
      assert.equal((await post()).status, 409)
      console.log(JSON.stringify({ ok: true, consultaRealRevolut: true, pedidosConsultados: orders.length, antesSync: 0, cobroRealLeidoEUR: amount, pruebaSaldoParcialEUR: 10, saldoFinalEUR: 0, idempotencia: true, permisosYLocal: true, diarioSinDobleIngreso: true, canceladosPendientesReembolsosYExcesoBloqueados: true }))
      throw rollback
    }, { timeout: 25000 })
  } catch (e) { if (e !== rollback) throw e }
  assert.equal(await real.cita.count({ where: { id: fixtureId } }), 0)
  assert.equal(await real.revolut_transactions.count({ where: { order_id: originalOrder.id } }), 0)
  console.log('TRANSACCIÓN REVERTIDA: ningún pago, cita ni documento de prueba conservado; ningún cargo externo.')
}
main().catch(e => { console.error(e); process.exitCode = 1 }).finally(() => { Module._load = originalLoad; return real.$disconnect() })
