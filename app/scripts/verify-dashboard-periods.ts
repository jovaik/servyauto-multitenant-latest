import assert from 'node:assert/strict'
import { encode } from 'next-auth/jwt'
import { prisma } from '../lib/db'
import { dashboardExtraPeriod } from '../lib/dashboard-period'
async function main(){
 const monday=dashboardExtraPeriod('semana_pasada',null,null,new Date('2026-11-16T10:00:00Z'))!
 assert.equal(monday.startDate.toISOString(),'2026-11-08T23:00:00.000Z');assert.equal(monday.endDate.toISOString(),'2026-11-15T22:59:59.999Z')
 const dst=dashboardExtraPeriod('personalizado','2026-10-25','2026-10-25')!
 assert.equal(dst.endDate.getTime()-dst.startDate.getTime()+1,25*3600000)
 for(const range of [[null,null],['2026-02-30','2026-03-01'],['2026-11-10','2026-11-09']]) assert.throws(()=>dashboardExtraPeriod('personalizado',range[0],range[1]))
 const u=await prisma.user.findFirstOrThrow({where:{role:'SUPER_ADMIN'},select:{id:true,email:true,role:true}})
 const token=await encode({token:{sub:u.id,id:u.id,email:u.email,role:u.role},secret:process.env.NEXTAUTH_SECRET!})
 const local='cmm9arii40000on1r1znffzhv'
 const get=async(q:string)=>fetch('http://localhost:3000/api/dashboard/stats?'+q,{headers:{cookie:'servyauto.session-token='+token,'x-selected-local-id':local}})
 const proof=[]
 for(const q of ['period=semana_pasada','period=personalizado&fechaDesde=2026-11-09&fechaHasta=2026-11-15','period=personalizado&fechaDesde=2026-11-07&fechaHasta=2026-11-07']){
  const params=new URLSearchParams(q),range=dashboardExtraPeriod(params.get('period')!,params.get('fechaDesde'),params.get('fechaHasta'))!
  const r=await get(q),d=await r.json();assert.equal(r.status,200)
  const count=await prisma.cita.count({where:{localId:local,fecha:{gte:range.startDate,lte:range.endDate}}})
  assert.equal(d.citasHoy,count);proof.push({query:q,citas:d.citasHoy,conteoVerificado:count})
 }
 assert.equal((await get('period=personalizado&fechaDesde=2026-11-10&fechaHasta=2026-11-09')).status,400)
 console.log(JSON.stringify({ok:true,pruebas:proof,cambioHora:'Día de 25 horas correcto',escrituras:0},null,2))
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect())
