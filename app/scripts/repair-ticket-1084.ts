import { prisma } from '../lib/db'
import { syncDocumentoAgrupado } from '../lib/sync-documento-agrupado'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'

async function main() {
  const before = await prisma.factura.findUniqueOrThrow({ where: { numero: 'TICK-2026-1084' }, include: { factura_items: true } })
  const citas = await prisma.cita.findMany({ where: { facturaAgrupadaId: before.id }, include: { lineasManuales: true, pagosParciales: true } })
  assert.equal(citas.length, 1); assert.equal(citas[0].id, 'cmwl13qom0005pd07ycf53czd'); assert.equal(citas[0].total, 484)
  assert.equal(before.estado, 'PENDIENTE'); assert.equal(before.fechaPago, null); assert.equal(before.metodoPago, null)
  assert([400, 484].includes(before.total), 'Importe modificado por otro usuario: revisar')
  if (before.total === 484 && before.factura_items.reduce((s, i) => s + i.total, 0) === 484) { console.log('Ticket ya corregido. Sin escrituras.'); return }
  const dir = path.join(process.cwd(), 'scripts', 'backups'); await mkdir(dir, { recursive: true })
  const backup = path.join(dir, `ticket-1084-${Date.now()}.json`)
  await writeFile(backup, JSON.stringify({ factura: before, citas }, null, 2))
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM facturas WHERE id = ${before.id} FOR UPDATE`
    await tx.$queryRaw`SELECT id FROM citas WHERE id = ${citas[0].id} FOR UPDATE`
    const current = await tx.factura.findUniqueOrThrow({ where: { id: before.id } })
    const citaActual = await tx.cita.findUniqueOrThrow({ where: { id: citas[0].id } })
    assert.equal(current.updatedAt.getTime(), before.updatedAt.getTime(), 'Ticket editado concurrentemente')
    assert.equal(citaActual.updatedAt.getTime(), citas[0].updatedAt.getTime(), 'Cita editada concurrentemente')
    const after = await syncDocumentoAgrupado(tx, before.id)
    assert.equal(after.total, 484); assert.equal(after.subtotal, 400); assert.equal(after.iva, 84)
    for (const key of Object.keys(after)) if (!['total','subtotal','iva','updatedAt'].includes(key)) assert.deepEqual((after as any)[key], (before as any)[key], key)
    await tx.activityLog.create({ data: { action: 'UPDATE', entity: 'FACTURA', entityId: before.id, description: 'TICK-2026-1084 sincronizado con Agenda por autorización de Jose. Base 400 EUR + IVA 84 EUR = 484 EUR. Sin cobro ni cambio de fecha o numeración.', details: { totalAnterior: before.total, totalActual: after.total, citaId: citas[0].id } } })
  })
  const after = await prisma.factura.findUniqueOrThrow({ where: { id: before.id }, include: { factura_items: true } })
  const citasAfter = await prisma.cita.findMany({ where: { facturaAgrupadaId: before.id }, include: { lineasManuales: true, pagosParciales: true } })
  assert.deepEqual(citasAfter, citas)
  assert.equal(after.factura_items.reduce((s, i) => s + i.total, 0), 484)
  assert.deepEqual(after.factura_items.map(i => i.id), before.factura_items.map(i => i.id))
  console.log(JSON.stringify({ ok: true, backup, numero: after.numero, subtotal: after.subtotal, iva: after.iva, total: after.total, fecha: after.fecha, estado: after.estado, fechaPago: after.fechaPago, citasYPagos: 'SIN CAMBIOS', conceptos: after.factura_items.map(i => i.descripcion) }, null, 2))
}
main().catch(e => { console.error(e.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
