// Prueba aislada del endpoint real: sin conexión a BD ni emisión de documentos.
const assert = require('node:assert/strict')
const Module = require('node:module')
const originalLoad = Module._load
let created: any
let linked: any
let notification: any
let available = true
const cliente = { nombre: 'PRUEBA', apellido: '', documento: null }
const citas = [35, 35, 40].map((total, i) => ({
  id: `test-${i}`, total, fecha: new Date('2026-10-28T00:00:00Z'),
  vehiculo: { matricula: `TEST-${i}`, marca: 'PRUEBA', modelo: 'PRUEBA' },
  cita_servicios: [], lineasManuales: [{ descripcion: `SERVICIO ${i}` }],
}))
const mocks: Record<string, any> = {
  'next-auth': { getServerSession: async () => ({ user: { id: 'test', name: 'PRUEBA' } }) },
  '@/lib/auth': { authOptions: {} },
  '@/lib/local-context': {
    getLocalContext: async () => ({}),
    buildLocalFilter: () => ({ localId: 'local-test' }),
    getLocalIdForCreate: () => 'local-test',
  },
  '@/lib/activity-logger': { logActivity: async () => {} },
  '@/lib/gscontrol-sync': { notificarCreacionGSControl: async (data: any) => { notification = data } },
  '@/lib/db': { prisma: {
    cliente: { findUnique: async () => cliente },
    cita: {
      findMany: async ({ where }: any) => {
        assert.equal(where.localId, 'local-test')
        assert.deepEqual(where.facturas, { is: null })
        assert.equal(where.facturaAgrupadaId, null)
        return available ? citas : []
      },
      updateMany: async (args: any) => { if (args.data.facturaAgrupadaId) { linked = args; available = false }; return { count: available || linked ? 3 : 0 } },
    },
    factura: {
      findFirst: async ({ where }: any) => ({ numero: `${where.numero.startsWith}0012` }),
      create: async ({ data }: any) => {
        created = data
        return { ...data, id: 'document-test', createdAt: new Date(), cliente }
      },
    },
  } },
}
Module._load = function(request: string, parent: any, isMain: boolean) {
  if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request]
  return originalLoad.call(this, request, parent, isMain)
}
mocks['@/lib/db'].prisma.$transaction = (callback: any) => callback(mocks['@/lib/db'].prisma)
const { POST } = require('../app/api/facturacion-agrupada/route')
const { NextRequest } = require('next/server')
function request(body: any) {
  return new NextRequest('http://localhost/api/facturacion-agrupada', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}
async function main() {
  for (const tipo of ['TICKET', 'FACTURA', undefined]) {
    for (const metodoPago of [null, 'EFECTIVO', 'TPV_SUMUP', 'TPV_UNICAJA', 'REVOLUT']) {
      available = true; created = linked = notification = undefined
      const payload = { tipo, metodoPago, clienteId: 'client-test', citaIds: citas.map((c: any) => c.id) }
      const response = await POST(request(payload))
      const data = await response.json()
      assert.equal(response.status, 200)
      const expected = tipo || 'FACTURA'
      assert.equal(data.tipo, expected)
      assert.equal(created.tipo, expected)
      assert.match(data.numero, expected === 'TICKET' ? /^TICK-\d{4}-0013$/ : /^FAC-\d{4}-0013$/)
      assert.equal(created.total, 110)
      assert.equal(created.factura_items.create.length, 3)
      assert.equal(created.estado, metodoPago ? 'PAGADA' : 'PENDIENTE')
      assert.equal(created.metodoPago, metodoPago)
      assert.equal(!!created.fechaPago, !!metodoPago)
      assert.equal(created.localId, 'local-test')
      assert.equal(linked.data.facturaAgrupadaId, 'document-test')
      assert.equal(linked.data.estado, 'COMPLETADA')
      assert.equal(linked.data.cobroDiferido, !metodoPago)
      if (metodoPago) assert.equal(notification.documentType, expected)
      else assert.equal(notification, undefined)
      const repeated = await POST(request(payload))
      assert.equal(repeated.status, 400)
    }
  }
  created = undefined
  const invalid = await POST(request({ tipo: 'INVALIDO', clienteId: 'client-test', citaIds: ['test-0'] }))
  assert.equal(invalid.status, 400)
  assert.equal(created, undefined)
  console.log('OK: Ticket y Factura, compatibilidad anterior, series separadas, 3 líneas/110 EUR, local, pendiente y 4 métodos, bloqueo de repetición y tipo inválido. Sin escrituras reales.')
}
main().catch((error: any) => { console.error(error); process.exitCode = 1 }).finally(() => { Module._load = originalLoad })
export {}
