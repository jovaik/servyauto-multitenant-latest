import { prisma } from '../lib/db'
import { encode } from 'next-auth/jwt'
async function main() {
 const u = await prisma.user.findFirstOrThrow({where:{role:'SUPER_ADMIN'},select:{id:true,email:true,role:true}})
 const token = await encode({token:{sub:u.id,id:u.id,email:u.email,role:u.role},secret:process.env.NEXTAUTH_SECRET!})
 const headers = {cookie:'servyauto.session-token='+token,'x-selected-local-id':'cmm9arii40000on1r1znffzhv'}
 const get = async (p:string) => {const r=await fetch('http://localhost:3000'+p,{headers});if(!r.ok)throw Error(String(r.status));return r.json()}
 const s=await get('/api/facturas/stats?fechaDesde=2026-09-16&fechaHasta=2026-10-11')
 const l=await get('/api/liquidaciones?localId=cmm9arii40000on1r1znffzhv&desde=2026-09-16&hasta=2026-10-11')
 const f=await get('/api/facturas'),g=await get('/api/gastos'),tr=await get('/api/transferencias-caja')
 const inside=(v:string)=>v.slice(0,10)>='2026-09-16'&&v.slice(0,10)<='2026-10-11'
 const diary=f.filter((x:any)=>x.estado==='PAGADA'&&x.metodoPago==='EFECTIVO'&&inside(x.fechaPago||x.fecha)).reduce((a:number,x:any)=>a+x.total,0)-g.filter((x:any)=>x.metodoPago==='EFECTIVO'&&inside(x.fecha)).reduce((a:number,x:any)=>a+x.importe,0)-tr.filter((x:any)=>x.origenLocalId===headers['x-selected-local-id']&&inside(x.fecha)).reduce((a:number,x:any)=>a+x.importe,0)
 if(Math.abs(s.efectivoEnCaja-diary)>.005||l.resumen.totalComisiones!==0||l.reparto.numPartes!==3)throw Error('No coincide')
 console.log(JSON.stringify({facturacion:s.efectivoEnCaja,diario:Math.round(diary*100)/100,salida:s.transferenciasSalida,reparto:l.reparto,resumen:l.resumen,comisiones:l.liquidaciones.map((x:any)=>x.comisionNeta)}))
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect())
