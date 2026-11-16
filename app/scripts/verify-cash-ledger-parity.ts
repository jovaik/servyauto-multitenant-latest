import assert from 'node:assert/strict'
import { encode } from 'next-auth/jwt'
import { prisma } from '../lib/db'
async function main(){
 const u=await prisma.user.findFirstOrThrow({where:{role:'SUPER_ADMIN'},select:{id:true,email:true,role:true}})
 const token=await encode({token:{sub:u.id,id:u.id,email:u.email,role:u.role},secret:process.env.NEXTAUTH_SECRET!})
 const proof=[]
 for(const local of ['', 'cmm9arii40000on1r1znffzhv','cmmga3jou0001lp08fjx3d20s']){
  const headers:Record<string,string>={cookie:'servyauto.session-token='+token};if(local)headers['x-selected-local-id']=local
  const get=async(q:string)=>{const r=await fetch('http://localhost:3000/api/facturas/stats?'+q,{headers});assert.equal(r.status,200);return r.json()}
  const rows=await get('diario=1')
  for(const [from,to] of [['2026-11-02','2026-11-08'],['2026-11-09','2026-11-15'],['2026-11-01','2026-11-30']]){
   const day=(v:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v))
   const filtered=rows.filter((r:any)=>day(r.fecha)>=from&&day(r.fecha)<=to)
   const sum=(tipo:string,method?:string)=>Math.round(filtered.filter((r:any)=>r.tipo===tipo&&(!method||r.metodoPago===method)).reduce((s:number,r:any)=>s+r.importe,0)*100)/100
   const stats=await get('fechaDesde='+from+'&fechaHasta='+to)
   assert.equal(sum('INGRESO'),stats.ingresosMes);assert.equal(sum('GASTO'),stats.gastosTotal)
   const checks:Record<string,number>={}
   for(const [method,key] of [['EFECTIVO','efectivoEnCaja'],['TPV_SUMUP','netoTPVSumup'],['TPV_UNICAJA','netoTPVUnicaja'],['REVOLUT','netoRevolut']]){
    const value=Math.round((sum('INGRESO',method)-sum('GASTO',method))*100)/100;assert.equal(value,stats[key],`${local} ${from} ${method}`);checks[method]=value
   }
   proof.push({local:local||'TODOS',desde:from,hasta:to,diarioIgualFacturacion:checks})
  }
 }
 console.log(JSON.stringify({ok:true,comparaciones:proof,escrituras:0},null,2))
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect())
