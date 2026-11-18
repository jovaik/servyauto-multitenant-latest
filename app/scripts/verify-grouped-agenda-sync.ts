// Rutas reales en una transacción siempre revertida; sin cobros ni notificaciones.
const assert = require('node:assert/strict')
const Module = require('node:module')
const { prisma: real } = require('../lib/db')
const originalLoad = Module._load
let tx: any
const proxy = new Proxy({}, { get: (_, key) => key === '$transaction' ? async (fn: any) => {
  await tx.$executeRawUnsafe('SAVEPOINT route_test')
  try { const result = await fn(tx); await tx.$executeRawUnsafe('RELEASE SAVEPOINT route_test'); return result }
  catch (e) { await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT route_test'); throw e }
} : tx[key] })
const mocks: Record<string, any> = {
  'next-auth/next': { getServerSession: async () => ({ user: { name: 'Verificación aislada', email: 'verification@example.invalid' } }) },
  'next-auth': { getServerSession: async () => ({ user: { name: 'Verificación aislada', email: 'verification@example.invalid' } }) },
  '@/lib/auth': { authOptions: {} }, '@/lib/db': { prisma: proxy },
  '@/lib/activity-logger': { logActivity: async () => {} },
  '@/lib/gscontrol-sync': { notificarCreacionGSControl: async () => {} },
  '@/lib/notifications': {},
}
Module._load = function(r: string, p: any, m: boolean) { return r in mocks ? mocks[r] : originalLoad.call(this, r, p, m) }
const { PUT } = require('../app/api/citas/[id]/route')
const { GET: getFactura } = require('../app/api/facturas/[id]/route')
const { NextRequest } = require('next/server')
const rollback = new Error('ROLLBACK_TEST')
const old = process.argv.includes('--expect-old')
const req = (body: any) => new NextRequest('http://localhost/api/citas/test', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
async function main() {
  const proof: any = {}
  try { await real.$transaction(async (client: any) => {
    tx = client
    const f = await tx.factura.findUniqueOrThrow({ where: { numero: 'TICK-2026-1084' }, include: { factura_items: true } })
    const citas = await tx.cita.findMany({ where: { facturaAgrupadaId: f.id }, include: { lineasManuales: true } })
    assert.equal(citas.length, 1)
    const c = citas[0]
    const n = await tx.factura.count(), p = await tx.pagoParcial.count()
    // Reproducir exactamente el ticket anterior frente a la cita editada.
    await tx.factura.update({ where: { id: f.id }, data: { total: 400, subtotal: 400 / 1.21, iva: 400 - 400 / 1.21 } })
    const body = { servicios: [], lineasManuales: c.lineasManuales.map((l: any) => ({ descripcion: l.descripcion, cantidad: l.cantidad, precioUnitario: l.precioUnitario })), total: 484 }
    const response = await PUT(req(body), { params: { id: c.id } })
    assert.equal(response.status, 200, JSON.stringify(await response.json()))
    const after = await tx.factura.findUniqueOrThrow({ where: { id: f.id }, include: { factura_items: true } })
    assert.equal(after.total, old ? 400 : 484)
    if (!old) {
      const returned = await (await getFactura(req({}), { params: { id: f.id } })).json()
      assert.equal(returned.total, 484); assert.equal(returned.items[0].total, 484)
      assert.equal(after.subtotal, 400); assert.equal(after.iva, 84)
      assert.equal(after.factura_items.reduce((s: number, i: any) => s + i.total, 0), 484)
      for (const key of ['numero','fecha','createdAt','estado','metodoPago','fechaPago','clienteId','datosFacturacion']) assert.deepEqual(after[key], f[key])
      // Cambiar también el concepto, guardar de nuevo y comprobar idempotencia.
      body.lineasManuales[0].descripcion = 'CONCEPTO VERIFICACIÓN IVA'
      for (let i = 0; i < 2; i++) assert.equal((await PUT(req(body), { params: { id: c.id } })).status, 200)
      const updated = await tx.factura.findUniqueOrThrow({ where: { id: f.id }, include: { factura_items: true } })
      assert.equal(updated.total, 484); assert(updated.factura_items[0].descripcion.includes('CONCEPTO VERIFICACIÓN IVA'))
      assert.deepEqual(updated.factura_items.map((i: any) => i.id), after.factura_items.map((i: any) => i.id))
      // Documento con dos citas, dos locales: recalcular conjunto, no solo la editada.
      const otherLocal = await tx.local.findFirstOrThrow({ where: { id: { not: c.localId } } })
      const extra = await tx.cita.create({ data: { fecha: c.fecha, horaInicio: '10:00', horaFin: '11:00', box: 'PRUEBA', estado: 'COMPLETADA', cobroDiferido: true, total: 60, clienteId: c.clienteId, vehiculoId: c.vehiculoId, localId: otherLocal.id, facturaAgrupadaId: f.id } })
      assert.equal((await PUT(req(body), { params: { id: c.id } })).status, 200)
      const multi = await tx.factura.findUniqueOrThrow({ where: { id: f.id }, include: { factura_items: true } })
      assert.equal(multi.total, 544); assert.equal(multi.factura_items.length, 2); assert.equal(multi.localId, null)
      assert.equal(multi.repartoLocales.find((r: any) => r.localId === c.localId).total, 484)
      assert.equal(multi.repartoLocales.find((r: any) => r.localId === otherLocal.id).total, 60)
      // Un cobro previo nunca aumenta silenciosamente por editar Agenda.
      await tx.factura.update({ where: { id: f.id }, data: { estado: 'PAGADA', metodoPago: 'EFECTIVO', fechaPago: new Date('2026-11-17T12:00:00Z') } })
      assert.equal((await PUT(req({ ...body, total: 600 }), { params: { id: c.id } })).status, 409)
      assert.equal((await tx.cita.findUniqueOrThrow({ where: { id: c.id } })).total, 484)
      assert.equal((await tx.factura.findUniqueOrThrow({ where: { id: f.id } })).total, 544)
      // Cancelado también rechaza sin guardar cambios parciales.
      await tx.factura.update({ where: { id: f.id }, data: { estado: 'CANCELADA' } })
      assert.equal((await PUT(req({ ...body, total: 600 }), { params: { id: c.id } })).status, 409)
      assert.equal((await tx.cita.findUniqueOrThrow({ where: { id: c.id } })).total, 484)
      assert.equal(await tx.factura.count(), n); assert.equal(await tx.pagoParcial.count(), p)
      proof.multilocal = '544 = 484 + 60; reparto conservado; cobro no alterado'
    }
    proof.casoReal = { antes: 400, agenda: 484, ticket: after.total, estado: after.estado, fechaPago: after.fechaPago }
    throw rollback
  }, { timeout: 25000 }) } catch (e) { if (e !== rollback) throw e }
  console.log(JSON.stringify({ ok: true, modo: old ? 'REPRODUCCIÓN ANTES' : 'VERIFICACIÓN DESPUÉS', ...proof, datosPrueba: 'REVERTIDOS' }, null, 2))
}
main().catch((e: any) => { console.error(e); process.exitCode = 1 }).finally(() => { Module._load = originalLoad; return real.$disconnect() })
export {}
