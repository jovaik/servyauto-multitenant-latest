const assert = require('node:assert/strict')
const Module = require('node:module')
const { prisma: real } = require('../lib/db')
const { precioConIva, lineasConPrecioFinal } = require('../lib/precio-iva')
const originalLoad = Module._load
const originalFetch = globalThis.fetch
// Ninguna sincronización externa puede salir de esta prueba.
globalThis.fetch = async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
let tx: any
const proxy = new Proxy({}, { get: (_, key) => key === '$transaction' ? (fn: any) => fn(tx) : tx[key] })
const mocks: Record<string, any> = {
  'next-auth': { getServerSession: async () => ({ user: { email: 'verification@example.invalid' } }) },
  'next-auth/next': { getServerSession: async () => ({ user: { email: 'verification@example.invalid' } }) },
  '@/lib/db': { prisma: proxy }, '@/lib/auth': { authOptions: {} },
  '@/lib/local-context': { getLocalContext: async () => ({}), getLocalIdForCreate: () => 'cmm9arii40000on1r1znffzhv' },
  '@/lib/activity-logger': { logActivity: async () => {} },
  '@/lib/gscontrol-sync': { notificarCreacionGSControl: async () => {} },
  '@/lib/notifications': { generarEnlaceConfirmacionDeposito: () => ({ success: false }) },
}
Module._load = function(r: string, p: any, m: boolean) { return r in mocks ? mocks[r] : originalLoad.call(this, r, p, m) }
const { POST } = require('../app/api/citas/route')
const { PUT } = require('../app/api/citas/[id]/route')
const { NextRequest } = require('next/server')
const req = (body: any) => new NextRequest('http://localhost/api/citas', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const rollback = new Error('ROLLBACK_TEST')
async function main() {
  assert.equal(precioConIva(400, true), 484)
  assert.equal(precioConIva(400, false), 400)
  assert.equal(precioConIva(19.99, true), 24.19)
  const manuales = lineasConPrecioFinal([{ descripcion: 'PRUEBA IVA', cantidad: 2, precioUnitario: 100, anadirIva: true }])
  assert.equal(manuales[0].precioUnitario, 121)
  assert.deepEqual(lineasConPrecioFinal(manuales), manuales, 'Reabrir sin la casilla no duplica IVA')
  try { await real.$transaction(async (client: any) => {
    tx = client
    const source = await tx.cita.findUniqueOrThrow({ where: { id: 'cmwl13qom0005pd07ycf53czd' } })
    const servicio = await tx.servicio.findFirstOrThrow({ where: { activo: true } })
    await tx.cliente.update({ where: { id: source.clienteId }, data: { clienteParking: false, clienteVIP: false, clienteEmpresa: false } })
    const body = { fecha: '2099-01-01', horaInicio: '00:01', horaFin: '00:02', box: 'VERIFICACION IVA', clienteId: source.clienteId, vehiculoId: source.vehiculoId, metodoPago: null, servicios: [{ servicioId: servicio.id, precio: precioConIva(100, true) }], lineasManuales: manuales }
    const res = await POST(req(body)), data = await res.json()
    assert.equal(res.status, 201, data.error || 'Crear cita debe devolver 201'); assert.equal(data.total, 363)
    // Ticket individual existente: sigue sincronizando sin añadir IVA otra vez.
    const f = await tx.factura.create({ data: { numero: 'TEST-IVA-ROLLBACK', tipo: 'TICKET', estado: 'PENDIENTE', clienteId: source.clienteId, citaId: data.id, total: 1, subtotal: 1, iva: 0 } })
    for (let i = 0; i < 2; i++) {
      const response = await PUT(req({ servicios: body.servicios, lineasManuales: lineasConPrecioFinal(manuales), total: 363 }), { params: { id: data.id } })
      assert.equal(response.status, 200)
      const documento = await tx.factura.findUniqueOrThrow({ where: { id: f.id }, include: { factura_items: true } })
      assert.equal(documento.total, 363); assert.equal(documento.estado, 'PENDIENTE'); assert.equal(documento.fechaPago, null)
      assert.equal(documento.factura_items.reduce((sum: number, item: any) => sum + item.total, 0), 363)
    }
    throw rollback
  }, { timeout: 25000 }) } catch (e) { if (e !== rollback) throw e }
  console.log(JSON.stringify({ ok: true, casilla: '400 → 484; desmarcada 400; 19,99 → 24,19', nuevaCita: 'Catálogo 121 + 2 manuales de 121 = 363', editar: 'Dos guardados mantienen 363 en cita y ticket individual, sin cobro', datosPrueba: 'REVERTIDOS' }, null, 2))
}
main().catch((e: any) => { console.error(e); process.exitCode = 1 }).finally(() => { Module._load = originalLoad; globalThis.fetch = originalFetch; return real.$disconnect() })
export {}
