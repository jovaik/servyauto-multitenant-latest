import { prisma } from '../lib/db'
import { encode } from 'next-auth/jwt'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

async function main() {
 const cases = [{id:'cmv6lvaky000ami08cugpimhw',numero:'TICK-2026-0888',total:450},{id:'cmv57b7o7000xlg0711sg4zij',numero:'TICK-2026-0883',total:150}]
 const snapshots = await prisma.cita.findMany({where:{id:{in:cases.map(x=>x.id)}},include:{lineasManuales:true,cita_servicios:true,facturas:{include:{factura_items:true}}}})
 assert.equal(snapshots.length,2)
 for(const c of cases) {
  const s=snapshots.find(x=>x.id===c.id)!
  assert.equal(s.facturas?.numero,c.numero)
  assert.equal(s.facturas?.estado,'PAGADA')
  assert.equal(s.cita_servicios.length,0)
  assert.equal(s.lineasManuales.reduce((sum,l)=>sum+l.total,0),c.total)
  assert.ok((s.total===0&&s.facturas.total===0&&s.facturas.factura_items.length===0)||(s.total===c.total&&s.facturas.total===c.total),'Estado distinto al observado: detener')
 }
 const backup=path.join(process.cwd(),'scripts',`manual-cash-before-${Date.now()}.json`)
 await writeFile(backup,JSON.stringify(snapshots,null,2),{flag:'wx',mode:0o600})
 console.log('COPIA PREVIA: '+backup)
 const u=await prisma.user.findFirstOrThrow({where:{role:'SUPER_ADMIN'},select:{id:true,email:true,role:true}})
 const token=await encode({token:{sub:u.id,id:u.id,email:u.email,role:u.role},secret:process.env.NEXTAUTH_SECRET!})
 const headers={cookie:'servyauto.session-token='+token,'Content-Type':'application/json','x-selected-local-id':snapshots[0].localId!}
 for(const c of cases) {
  const before=snapshots.find(x=>x.id===c.id)!
  if(before.total!==c.total) {
   const r=await fetch('http://localhost:3000/api/citas/'+c.id,{method:'PUT',headers,body:JSON.stringify({total:c.total})})
   assert.equal(r.status,200)
  }
  const after=await prisma.cita.findUniqueOrThrow({where:{id:c.id},include:{lineasManuales:true,facturas:{include:{factura_items:true}}}})
  assert.equal(after.total,c.total); assert.equal(after.facturas!.total,c.total)
  assert.equal(after.facturas!.factura_items.reduce((s,x)=>s+x.total,0),c.total)
  assert.deepEqual(after.lineasManuales,before.lineasManuales)
  for(const k of ['numero','estado','metodoPago','fecha','fechaPago','tipo','datosFacturacion','localId'] as const) assert.deepEqual(after.facturas![k],before.facturas![k])
  assert.deepEqual(after.fecha,before.fecha);assert.equal(after.metodoPago,before.metodoPago)
 }
 for(const base of ['http://localhost:3000','https://app.servyauto.com']) {
  const r=await fetch(base+'/api/facturas',{headers});assert.equal(r.status,200)
  const list=await r.json()
  for(const c of cases) {
   const f=list.find((x:any)=>x.numero===c.numero)
   assert.ok(f);assert.equal(f.total,c.total);assert.equal(f.estado,'PAGADA')
   console.log(JSON.stringify({origen:base,numero:f.numero,cliente:f.cliente.nombre,importeDiario:f.total,metodoPago:f.metodoPago,fechaDiario:f.fechaPago||f.fecha}))
  }
 }
 console.log('OK: IMPORTES RECUPERADOS; FECHAS, MÉTODOS DE PAGO Y LÍNEAS ORIGINALES CONSERVADOS')
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect())
