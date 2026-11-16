import { prisma } from '../lib/db'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
async function main(){
 const fid='cmw6n1twc0003mq081em8ss38',tid='cmwj5cged0001mr08ha82wz83'
 const f=await prisma.factura.findUniqueOrThrow({where:{id:fid}}),t=await prisma.transferenciaCaja.findUniqueOrThrow({where:{id:tid}})
 assert.equal(f.numero,'FAC-2026-0013');assert.equal(f.total,50);assert.equal(f.metodoPago,'EFECTIVO');assert.equal(f.estado,'PAGADA')
 assert.equal(t.importe,240);assert.equal(t.concepto,'PAGO VIEJA');assert.equal(t.origenLocalId,f.localId)
 const paid=new Date('2026-11-07T12:00:00Z'),moved=new Date('2026-11-11T12:00:00Z')
 assert(!f.fechaPago||f.fechaPago.getTime()===paid.getTime(),'Fecha de cobro cambiada: revisar antes de escribir')
 assert(['2026-11-16','2026-11-11'].includes(t.fecha.toISOString().slice(0,10)))
 const dir=path.join(process.cwd(),'scripts','backups');await mkdir(dir,{recursive:true})
 const backup=path.join(dir,`cash-dates-${Date.now()}.json`)
 await writeFile(backup,JSON.stringify({factura:f,transferencia:t},null,2))
 await prisma.$transaction(async tx=>{
  if(!f.fechaPago){
   const updated=await tx.factura.updateMany({where:{id:fid,fechaPago:null,updatedAt:f.updatedAt},data:{fechaPago:paid}});assert.equal(updated.count,1)
   await tx.activityLog.create({data:{action:'UPDATE',entity:'FACTURA',entityId:fid,description:'Fecha real de cobro corregida al 07/11/2026 por confirmación de Jose; emisión y número conservados',details:{fechaPagoAntes:null,fechaPagoDespues:paid.toISOString()}}})
  }
  if(t.fecha.getTime()!==moved.getTime()){
   const updated=await tx.transferenciaCaja.updateMany({where:{id:tid,updatedAt:t.updatedAt},data:{fecha:moved}});assert.equal(updated.count,1)
   await tx.activityLog.create({data:{action:'UPDATE',entity:'TRANSFERENCIA_CAJA',entityId:tid,description:'Fecha operativa corregida al 11/11/2026 por confirmación de Jose; importe y locales conservados',details:{fechaAntes:t.fecha.toISOString(),fechaDespues:moved.toISOString()}}})
  }
 })
 const afterF=await prisma.factura.findUniqueOrThrow({where:{id:fid}}),afterT=await prisma.transferenciaCaja.findUniqueOrThrow({where:{id:tid}})
 for(const key of Object.keys(f))if(!['fechaPago','updatedAt'].includes(key))assert.deepEqual((afterF as any)[key],(f as any)[key])
 for(const key of Object.keys(t))if(!['fecha','updatedAt'].includes(key))assert.deepEqual((afterT as any)[key],(t as any)[key])
 assert.equal(afterF.fechaPago?.getTime(),paid.getTime());assert.equal(afterT.fecha.getTime(),moved.getTime())
 console.log(JSON.stringify({ok:true,backup,numero:afterF.numero,emision:afterF.fecha,cobro:afterF.fechaPago,transferencia:afterT.id,fechaTransferencia:afterT.fecha,importe:afterT.importe,otrosCampos:'SIN CAMBIOS'},null,2))
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect())
