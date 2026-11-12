// Reproduce el intento real mediante GET; bloquea cobros y escrituras reales.
import assert from 'node:assert/strict'
import { prisma } from '../lib/db'
const checkoutId = '77310ad2-36b8-4100-9990-2be1170775ba'
async function main() {
 const originalFetch=global.fetch
 global.fetch=async (input:any,init?:any)=>{ assert.equal(init?.method||'GET','GET','Prohibido enviar cobros'); return originalFetch(input,init) }
 let writes=0
 const mockDb=new Proxy(prisma,{get(target,prop:string){const model=(target as any)[prop]; if(!model||typeof model!=='object')return model;return new Proxy(model,{get(d,m:string){
  if(prop==='sumUpTransaction'&&m==='updateMany')return async()=>{writes++;return {count:1}}
  if(/^(create|update|delete|upsert)/.test(m))return ()=>{throw Error('Escritura real bloqueada')}
  return typeof d[m]==='function'?d[m].bind(d):d[m]
 }})}})
 const Module=require('node:module');const load=Module._load
 const mocks:any={'next-auth':{getServerSession:async()=>({user:{id:'READ_ONLY_TEST'}})},'@/lib/auth':{authOptions:{}},'@/lib/db':{prisma:mockDb},'@/lib/activity-logger':{requireSuperAdminForDelete:async()=>null}}
 Module._load=function(r:string,p:any,m:boolean){return Object.hasOwn(mocks,r)?mocks[r]:load.call(this,r,p,m)}
 try {
  const {GET}=require('../app/api/sumup/checkout/[id]/route');const {NextRequest}=require('next/server')
  const response=await GET(new NextRequest(`http://localhost/api/sumup/checkout/${checkoutId}`),{params:{id:checkoutId}})
  const data=await response.json();console.log('REAL_RUNTIME',response.status,JSON.stringify(data));assert.equal(response.status,200);assert.equal(data.status,'FAILED');assert.equal(data.amount,1)
  if(process.argv.includes('--expect-detail')){assert.equal(data.failureReason,'No action taken');assert.equal(data.transactionCode,'TAAA7FLAPYE');console.log('OK: motivo real y referencia presentes; ningún pago conciliado')}
  else {assert.equal(data.failureReason,undefined);console.log('REPRODUCIDO: motivo de fallo omitido por la aplicación')}
  console.log('Escrituras interceptadas (no persistidas):',writes,'; cargos enviados: 0')
 }finally{Module._load=load;global.fetch=originalFetch}
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect())
