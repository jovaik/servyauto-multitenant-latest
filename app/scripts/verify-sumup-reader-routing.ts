// Rutas reales con lecturas reales. Bloquea TODOS los cobros/cancelaciones y escrituras.
import assert from 'node:assert/strict'
import { prisma } from '../lib/db'
import { resolveSumUpKeys, resolveReaderSumUpKeys } from '../lib/sumup'

const readerId = 'rdr_3YAFQXYFSK8K2BAW6FZRWH8FGC'
const citaId = 'cmwcbhe03000dmv08rb2vosr5'
const localId = 'cmm9arii40000on1r1znffzhv'
const cuentaTpvId = 'cmv3px60l00000bi2hnz8yd0s'
const realFetch = global.fetch
let writes = 0
let sent = 0
let recorded: any
let ownerKey: string
let calls = 0
const check = (value: unknown, label: string) => { assert(value, label); calls++; console.log('OK:', label) }
async function inspectReader(key?: string) {
  const headers = { Authorization: `Bearer ${key || process.env.SUMUP_API_KEY}` }
  const response = await realFetch('https://api.sumup.com/v0.1/me', { headers })
  assert.equal(response.status, 200)
  const me = await response.json()
  const merchant = me.merchant_code || me.merchant_profile?.merchant_code || me.account?.merchant_code
  return realFetch(`https://api.sumup.com/v0.1/merchants/${merchant}/readers/${readerId}`, { headers })
}
async function main() {
  const old = await resolveSumUpKeys({ cuentaTpvId, localId })
  check((await inspectReader(old.apiKey)).status === 404, 'Reproducido: cuenta de la venta no encuentra el terminal (404, solo lectura)')
  const corrected = await resolveReaderSumUpKeys({ readerId, cuentaTpvId, localId })
  ownerKey = corrected.apiKey
  check((await inspectReader(ownerKey)).status === 200, 'Corregido: la cuenta resuelta reconoce el mismo terminal (200)')
  check(ownerKey !== old.apiKey, 'No utiliza las credenciales erróneas del local')
  const legacy = await resolveReaderSumUpKeys({ readerId, localId })
  check(legacy.apiKey === ownerKey, 'Compatible con terminal sin CuentaTpv guardada')

  const user = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' }, select: { id: true, email: true, name: true } })
  assert(user)
  const reader = await prisma.sumUpReader.findUnique({ where: { sumupReaderId: readerId } })
  assert(reader)
  const mockDb: any = new Proxy(prisma, { get(target, prop: string) {
    const model = (target as any)[prop]
    if (!model || typeof model !== 'object') return model
    return new Proxy(model, { get(delegate, method: string) {
      if (prop === 'sumUpTransaction' && method === 'findFirst') return async () => ({ ...recorded, reader })
      if (prop === 'sumUpTransaction' && method === 'create') return async ({ data }: any) => { recorded = data; return { ...data, id: 'SIMULACION-SIN-GUARDAR' } }
      if (prop === 'sumUpTransaction' && method === 'updateMany') return async ({ data }: any) => { recorded = { ...recorded, ...data }; return { count: 1 } }
      if (/^(create|update|delete|upsert)/.test(method)) return () => { writes++; throw new Error('Escritura real bloqueada') }
      return typeof delegate[method] === 'function' ? delegate[method].bind(delegate) : delegate[method]
    } })
  } })
  const Module = require('node:module')
  const originalLoad = Module._load
  const mocks: Record<string, any> = {
    'next-auth': { getServerSession: async () => ({ user }) },
    '@/lib/auth': { authOptions: {} },
    '@/lib/db': { prisma: mockDb },
    '@/lib/local-context': { getLocalContext: async () => ({ selectedLocalId: localId }) },
    '@/lib/activity-logger': { requireSuperAdminForDelete: async () => null },
  }
  Module._load = function(request: string, parent: any, isMain: boolean) {
    return Object.prototype.hasOwnProperty.call(mocks, request) ? mocks[request] : originalLoad.call(this, request, parent, isMain)
  }
  global.fetch = async (input: any, init?: any) => {
    const url = String(input)
    const method = init?.method || 'GET'
    if (method !== 'GET') {
      assert(url.startsWith('https://api.sumup.com/'))
      assert.equal(new Headers(init.headers).get('Authorization'), `Bearer ${ownerKey}`)
      if (url.endsWith('/checkout')) {
        assert(url.includes(readerId)); assert.equal(JSON.parse(init.body).total_amount.value, 4000)
        sent++
        return Response.json({ data: { checkout_id: 'SIMULACION-CHECKOUT', client_transaction_id: 'SIMULACION-TXN' } })
      }
      assert(url.endsWith(`/${readerId}/terminate`))
      return new Response(null, { status: 204 })
    }
    if (url.includes('/me/transactions?')) {
      assert.equal(new Headers(init.headers).get('Authorization'), `Bearer ${ownerKey}`)
      return new Response(null, { status: 404 })
    }
    return realFetch(input, init)
  }
  try {
    const { POST } = require('../app/api/sumup/checkout/route')
    const statusRoute = require('../app/api/sumup/checkout/[id]/route')
    const readersRoute = require('../app/api/sumup/readers/route')
    const { NextRequest } = require('next/server')
    const response = await POST(new NextRequest('http://localhost/api/sumup/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 40, description: 'PRUEBA SIN COBRO', readerId, citaId, cuentaTpvId }),
    }))
    check(response.status === 200 && sent === 1, 'Ruta de cobro: un único envío SIMULADO con la cuenta correcta e importe 40 EUR')
    check(recorded.localId === localId && recorded.citaId === citaId && recorded.amount === 40, 'Conserva local, cita e importe de la venta')
    check(recorded.readerId === reader.id && recorded.cuentaTpvId === cuentaTpvId, 'Conserva trazabilidad del terminal y cuenta TPV')
    const pending = await statusRoute.GET(new NextRequest('http://localhost/api/sumup/checkout/SIMULACION-CHECKOUT'), { params: { id: 'SIMULACION-CHECKOUT' } })
    check((await pending.json()).status === 'PENDING', 'Consulta pendiente con la misma cuenta sin marcar la cita como cobrada')
    const cancelled = await statusRoute.DELETE(new NextRequest('http://localhost/api/sumup/checkout/SIMULACION-CHECKOUT', { method: 'DELETE' }), { params: { id: 'SIMULACION-CHECKOUT' } })
    check(cancelled.status === 200 && recorded.status === 'CANCELLED', 'Cancelación SIMULADA dirigida a la misma cuenta')
    const list = await readersRoute.GET()
    const body = await list.json()
    check(list.status === 200 && body.readers.some((r: any) => r.id === readerId), 'Listado real conserva el terminal con el filtro del local Arias')
    check(writes === 0, 'Ninguna escritura real ni cobro real')
  } finally { Module._load = originalLoad; global.fetch = realFetch }
  console.log(`RESULTADO: ${calls} comprobaciones OK. Cobro físico no probado.`)
}
main().catch((e) => { console.error(e instanceof assert.AssertionError ? e.message : 'Verificación interrumpida'); process.exitCode = 1 }).finally(() => prisma.$disconnect())
