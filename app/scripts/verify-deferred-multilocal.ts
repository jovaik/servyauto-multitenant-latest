// Endpoints reales y base real dentro de una transacción que SIEMPRE se revierte.
const assert = require('node:assert/strict')
const Module = require('node:module')
const { prisma: real } = require('../lib/db')
const { buildLocalFilter: realFilter } = require('../lib/local-context')
const originalLoad = Module._load
let tx: any
let context: any = { canSeeAll: true, userRole: 'SUPER_ADMIN', localId: null }
const proxy = new Proxy({}, { get: (_, key) => key === '$transaction' ? (fn: any) => fn(tx) : tx[key] })
const mocks: Record<string, any> = {
  'next-auth': { getServerSession: async () => ({ user: { name: 'Verificación aislada' } }) },
  'next-auth/next': { getServerSession: async () => ({ user: { name: 'Verificación aislada' } }) },
  '@/lib/auth': { authOptions: {} },
  '@/lib/db': { prisma: proxy },
  '@/lib/local-context': { getLocalContext: async () => context, buildLocalFilter: realFilter, getLocalIdForCreate: () => context.selectedLocalId || null },
  '@/lib/activity-logger': { logActivity: async () => {} },
  '@/lib/gscontrol-sync': { notificarCreacionGSControl: async () => {} },
}
Module._load = function(request: string, parent: any, isMain: boolean) {
  if (request in mocks) return mocks[request]
  return originalLoad.call(this, request, parent, isMain)
}
const { GET, POST } = require('../app/api/facturacion-agrupada/route')
const { GET: pendientes } = require('../app/api/citas/route')
const { facturasPorLocal, partesFactura } = require('../lib/factura-local')
const { NextRequest } = require('next/server')
function req(path: string, body?: any) {
  return new NextRequest('http://localhost'+path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined)
}
const rollback = new Error('ROLLBACK_VERIFICACION')
async function main() {
 const proof: any = {}
 try {
  await real.$transaction(async (client: any) => {
   tx = client
   const originales = await tx.cita.findMany({ where: { cliente: { nombre: 'MARBELLA MOTORS CARS' }, fecha: { gte: new Date('2026-09-16') } }, include: { vehiculo: true, local: true } })
   const diferidas = originales.filter((c: any) => c.cobroDiferido || c.estado === 'PAGO_POSTERIOR')
   for (const localId of [...new Set(diferidas.map((c: any) => c.localId))]) {
    context = { canSeeAll: true, userRole: 'SUPER_ADMIN', selectedLocalId: localId }
    const ops = await (await pendientes(req('/api/citas?pendientes=true&desde=2026-09-16'))).json()
    const flat = await (await GET(req('/api/facturacion-agrupada?flat=1'))).json()
    const propias = diferidas.filter((c: any) => c.localId === localId)
    propias.forEach((c: any) => {
      assert(ops.some((r: any) => r.id===c.id && r.estado==='COMPLETADA' && r.cobroDiferido), c.vehiculo.matricula)
      assert(flat.citas.some((r: any) => r.id===c.id && r.cobroDiferido))
    })
    const agrupables = await (await GET(req('/api/facturacion-agrupada?todosLocales=true&clienteId='+originales[0].clienteId))).json()
    diferidas.forEach((c: any) => assert(agrupables.citas.some((r: any) => r.id===c.id)))
   }
   proof.vehiculosReales = diferidas.map((c: any) => ({ matricula:c.vehiculo.matricula,local:c.local.nombre,visibleEnTresListados:true }))
   const locales = [...new Set(diferidas.map((c: any) => c.localId))] as string[]
   assert.equal(locales.length,2)
   // Probar permiso: un operador no obtiene servicios del otro local con todosLocales.
   context = { canSeeAll: false, userRole:'OPERADOR', localId:locales[0] }
   const restringidas = await (await GET(req('/api/facturacion-agrupada?todosLocales=true&clienteId='+originales[0].clienteId))).json()
   assert(restringidas.citas.every((c:any) => originales.find((o:any)=>o.id===c.id)?.localId===locales[0]))
   proof.permisos = 'Operador limitado a su local'
   context = { canSeeAll: true, userRole:'SUPER_ADMIN', selectedLocalId:locales[0] }
   for (const tipo of ['TICKET','FACTURA']) {
    const source = originales[0]
    const fixtures = []
    for (let i=0;i<2;i++) fixtures.push(await tx.cita.create({data:{fecha:new Date(),horaInicio:'10:00',horaFin:'11:00',box:'VERIFICACION',estado:'COMPLETADA',cobroDiferido:true,total:i===0?40:60,clienteId:source.clienteId,vehiculoId:source.vehiculoId,localId:locales[i]}}))
    // Pago parcial existente: se conserva, no se vuelve a crear al agrupar.
    await tx.pagoParcial.create({data:{citaId:fixtures[0].id,importe:10,metodoPago:'EFECTIVO'}})
    const body = {clienteId:source.clienteId,citaIds:fixtures.map(c=>c.id),todosLocales:true,tipo,metodoPago:null}
    const response=await POST(req('/api/facturacion-agrupada',body));const d=await response.json()
    assert.equal(response.status,200,JSON.stringify(d))
    assert.equal(d.total,100);assert.equal(d.estado,'PENDIENTE')
    const factura=await tx.factura.findUniqueOrThrow({where:{id:d.facturaId}})
    assert.equal(factura.localId,null);assert.equal(factura.localesAgrupados.length,2)
    assert.equal(await tx.pagoParcial.count({where:{citaId:{in:body.citaIds}}}),1)
    for (const c of await tx.cita.findMany({where:{id:{in:body.citaIds}}})) {
      assert.equal(c.estado,'COMPLETADA');assert.equal(c.facturaAgrupadaId,d.facturaId)
      assert.equal(c.localId,fixtures.find(x=>x.id===c.id).localId)
    }
    const ops=await (await pendientes(req('/api/citas?pendientes=true'))).json()
    assert(!ops.some((c:any)=>body.citaIds.includes(c.id)))
    assert.equal((await POST(req('/api/facturacion-agrupada',body))).status,400)
    await tx.factura.update({where:{id:d.facturaId},data:{estado:'PAGADA',metodoPago:'TPV_SUMUP',tpvNombre:'TPV externo prueba'}})
    for (let i=0;i<2;i++) {
      const where={id:d.facturaId,localId:locales[i]}
      const lista=await facturasPorLocal.findMany({where},true)
      assert.equal(lista[0].total,100);assert.equal(lista[0].totalLocal,i===0?40:60)
      const sum=await facturasPorLocal.aggregate({where,_sum:{total:true},_count:true})
      assert.equal(sum._sum.total,i===0?40:60);assert.equal(sum._count,1)
      const grupos=await facturasPorLocal.groupBy({where,by:['tpvNombre'],_sum:{total:true}})
      assert.equal(grupos[0]._sum.total,i===0?40:60)
    }
    const global=await facturasPorLocal.aggregate({where:{id:d.facturaId},_sum:{total:true}})
    assert.equal(global._sum.total,100)
    const parts=partesFactura(factura)
    assert.equal(parts.reduce((s:number,p:any)=>s+Math.round(p.total*100),0),10000)
    assert.equal(parts.reduce((s:number,p:any)=>s+Math.round(p.subtotal*100),0),Math.round(factura.subtotal*100))
    proof[tipo]={documentos:1,total:100,reparto:[40,60],pagoParcialConservado:10,repeticionBloqueada:true}
   }
   throw rollback
  },{timeout:25000})
 } catch(e) { if(e!==rollback) throw e }
 console.log(JSON.stringify({ok:true,...proof,transaccion:'REVERTIDA: ningún documento ni cita de prueba conservados'},null,2))
}
main().catch((e:any)=>{console.error(e);process.exitCode=1}).finally(()=>{Module._load=originalLoad;return real.$disconnect()})
export {}
