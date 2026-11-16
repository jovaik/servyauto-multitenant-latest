// Rutas reales; escrituras de prueba siempre revertidas, sin avisos externos.
const assert = require('node:assert/strict')
const Module = require('node:module')
const { prisma: real } = require('../lib/db')
const { buildLocalFilter, getAllowedLocalIds } = require('../lib/local-context')
const originalLoad = Module._load
let tx: any
const local = 'cmm9arii40000on1r1znffzhv'
const proxy = new Proxy({}, { get: (_, key) => key === '$transaction' ? (fn:any)=>fn(tx) : tx[key] })
const mocks:Record<string,any> = {
 'next-auth': { getServerSession: async()=>({user:{name:'Verificación aislada',email:'verification@example.invalid'}}) },
 '@/lib/auth': {authOptions:{}}, '@/lib/db':{prisma:proxy},
 '@/lib/activity-logger':{logActivity:async()=>{}},
 '@/lib/gscontrol-sync':{notificarCreacionGSControl:async()=>{}},
 '@/lib/local-context':{getLocalContext:async()=>({canSeeAll:true,userRole:'SUPER_ADMIN',selectedLocalId:local}),buildLocalFilter,getAllowedLocalIds},
}
Module._load=function(r:string,p:any,m:boolean){return r in mocks?mocks[r]:originalLoad.call(this,r,p,m)}
const {PUT:convert}=require('../app/api/facturas/[id]/convertir/route')
const {POST:transfer}=require('../app/api/transferencias-caja/route')
const {GET:stats}=require('../app/api/facturas/stats/route')
const {NextRequest}=require('next/server')
const req=(path:string,body?:any)=>new NextRequest('http://localhost'+path,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:undefined)
const rollback=new Error('ROLLBACK_TEST')
async function main(){
 const proof:any={}
 try{await real.$transaction(async(client:any)=>{
  tx=client
  const f=await tx.factura.findUniqueOrThrow({where:{numero:'FAC-2026-0013'}})
  const n=await tx.factura.count(), p=await tx.pagoParcial.count()
  // Reproducir ticket cobrado el 7, sin fechaPago, convertido después.
  await tx.factura.update({where:{id:f.id},data:{tipo:'TICKET',fecha:new Date('2026-11-07T12:00:00Z'),fechaPago:null}})
  const serie='FAC-'+new Intl.DateTimeFormat('en-GB',{year:'numeric',timeZone:'Europe/Madrid'}).format(new Date())+'-'
  const nums=await tx.factura.findMany({where:{numero:{startsWith:serie}},select:{numero:true}})
  const refs=await tx.factura_items.findMany({where:{id:{startsWith:serie}},select:{id:true}})
  const next=Math.max(0,...nums.map((x:any)=>parseInt(x.numero.split('-')[2])||0),...refs.map((x:any)=>parseInt(x.id.split('-')[2])||0))+1
  const r=await convert(req('/api/facturas/'+f.id+'/convertir',{}),{params:{id:f.id}}),out=await r.json()
  assert.equal(r.status,200,JSON.stringify(out));assert.equal(out.fechaPago,'2026-11-07T12:00:00.000Z')
  assert.equal(out.numero,serie+String(next).padStart(4,'0'));assert.equal(out.createdAt,f.createdAt.toISOString());assert.equal(out.total,50);assert.equal(out.metodoPago,'EFECTIVO')
  assert.equal(await tx.factura.count(),n);assert.equal(await tx.pagoParcial.count(),p)
  assert.equal((await convert(req('/convert',{}),{params:{id:f.id}})).status,400)
  // Fecha explícita anterior no se sustituye; pendiente no se inventa cobro.
  for(const state of ['PAGADA','PENDIENTE']){
   await tx.factura.update({where:{id:f.id},data:{tipo:'TICKET',estado:state,fecha:new Date('2025-12-31T12:00:00Z'),fechaPago:state==='PAGADA'?new Date('2026-01-02T12:00:00Z'):null}})
   const o=await(await convert(req('/convert',{}),{params:{id:f.id}})).json()
   assert.equal(o.fechaPago,state==='PAGADA'?'2026-01-02T12:00:00.000Z':null);assert(o.numero.startsWith(serie))
  }
  proof.conversion='Conserva cobro explícito o histórico, creación, importe y método; serie del año de emisión; sin duplicación; pendiente sigue sin cobrar'
  const t=await tx.transferenciaCaja.findUniqueOrThrow({where:{id:'cmwj5cged0001mr08ha82wz83'}})
  const body={origenLocalId:t.origenLocalId,destinoLocalId:t.destinoLocalId,importe:240,concepto:'PRUEBA REVERTIDA'}
  for(const fecha of [undefined,'','2026-02-30','incorrecta'])assert.equal((await transfer(req('/transfer',{...body,fecha}))).status,400)
  const rt=await transfer(req('/transfer',{...body,fecha:'2026-11-11'})),nt=await rt.json()
  assert.equal(rt.status,200,JSON.stringify(nt));assert.equal(nt.fecha,'2026-11-11T12:00:00.000Z')
  // Restaurar estado económico original dentro de la prueba y mover solo fechas confirmadas.
  await tx.transferenciaCaja.delete({where:{id:nt.id}})
  await tx.factura.update({where:{id:f.id},data:{tipo:f.tipo,numero:f.numero,estado:f.estado,fecha:f.fecha,fechaPago:new Date('2026-11-07T12:00:00Z')}})
  await tx.transferenciaCaja.update({where:{id:t.id},data:{fecha:new Date('2026-11-11T12:00:00Z')}})
  const week=await(await stats(req('/api/facturas/stats?fechaDesde=2026-11-09&fechaHasta=2026-11-15'))).json()
  assert.equal(week.transferenciasSalida,240)
  // Diferencia exacta al mover el cobro de 7 a 9, manteniendo toda deduplicación.
  await tx.factura.update({where:{id:f.id},data:{fechaPago:new Date('2026-11-09T12:00:00Z')}})
  const bad=await(await stats(req('/api/facturas/stats?fechaDesde=2026-11-09&fechaHasta=2026-11-15'))).json()
  assert.equal(Math.round((bad.efectivoEnCaja-week.efectivoEnCaja)*100),5000)
  proof.transferencia='Fecha 11/11 persistida; ausente o inválida rechazada; 240 restados en semana 9–15'
  proof.caja='API de caja: mover el cobro del 9 al 7 resta exactamente 50 de la semana 9–15'
  throw rollback
 },{timeout:25000})}catch(e){if(e!==rollback)throw e}
 console.log(JSON.stringify({ok:true,...proof,datosPrueba:'REVERTIDOS'},null,2))
}
main().catch((e:any)=>{console.error(e);process.exitCode=1}).finally(()=>{Module._load=originalLoad;return real.$disconnect()})
export {}
