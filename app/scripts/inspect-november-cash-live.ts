import { prisma } from '../lib/db'
import { encode } from 'next-auth/jwt'
async function main() {
 const u=await prisma.user.findFirstOrThrow({where:{role:'SUPER_ADMIN'},select:{id:true,email:true,role:true}})
 const token=await encode({token:{sub:u.id,id:u.id,email:u.email,role:u.role},secret:process.env.NEXTAUTH_SECRET!})
 const local='cmm9arii40000on1r1znffzhv'
 const headers={cookie:'servyauto.session-token='+token,'x-selected-local-id':local}
 const get=async(path:string)=>{const r=await fetch('https://app.servyauto.com'+path,{headers});if(!r.ok)throw Error(path+' HTTP '+r.status);return r.json()}
 const f=await get('/api/facturas'),g=await get('/api/gastos'),p=await get('/api/pagos-parciales'),i=await get('/api/ingresos-adicionales'),t=await get('/api/transferencias-caja')
 const day=(x:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(x))
 const sumC:Record<string,number>={},sumA:Record<string,number>={}
 for(const x of p){if(x.citaId)sumC[x.citaId]=(sumC[x.citaId]||0)+x.importe;if(x.facturaAgrupadaId)sumA[x.facturaAgrupadaId]=(sumA[x.facturaAgrupadaId]||0)+x.importe}
 const rows:any[]=[]
 for(const x of f.filter((x:any)=>x.estado==='PAGADA')){const sp=x.citaId?(sumC[x.citaId]||0):(sumA[x.id]||0);const total=x.totalLocal??x.total??0;const amount=sp>0?Math.round((total-sp)*100)/100:total;if(sp>0&&amount<=.01)continue;rows.push({ref:x.numero,date:x.fechaPago||x.fecha,amount,method:x.metodoPago})}
 for(const x of p)rows.push({ref:x.id,date:x.fecha,amount:x.importe,method:x.metodoPago})
 for(const x of i)rows.push({ref:x.id,date:x.fecha,amount:x.importe,method:x.metodoPago})
 for(const x of g)rows.push({ref:x.id,date:x.fecha,amount:-(x.importe||x.total),method:x.metodoPago})
 for(const x of t){if(x.origenLocalId===local)rows.push({ref:x.id,date:x.fecha,amount:-x.importe,method:'EFECTIVO',transfer:true});if(x.destinoLocalId===local)rows.push({ref:x.id,date:x.fecha,amount:x.importe,method:'EFECTIVO',transfer:true});if(x.estado==='DEVUELTO'&&x.fechaDevolucion){if(x.origenLocalId===local)rows.push({ref:x.id,date:x.fechaDevolucion,amount:x.importe,method:'EFECTIVO',transfer:true});if(x.destinoLocalId===local)rows.push({ref:x.id,date:x.fechaDevolucion,amount:-x.importe,method:'EFECTIVO',transfer:true})}}
 const round=(n:number)=>Math.round(n*100)/100
 const periods=[['2026-11-02','2026-11-08'],['2026-11-09','2026-11-15'],['2026-11-16','2026-11-22']].map(([from,to])=>{const selected=rows.filter(x=>x.method==='EFECTIVO'&&day(x.date)>=from&&day(x.date)<=to);return {from,to,ingresos:round(selected.filter(x=>x.amount>0).reduce((s,x)=>s+x.amount,0)),salidas:round(-selected.filter(x=>x.amount<0).reduce((s,x)=>s+x.amount,0)),neto:round(selected.reduce((s,x)=>s+x.amount,0)),maria:selected.filter(x=>x.ref==='FAC-2026-0013'),transferencias:selected.filter(x=>x.transfer)}})
 console.log(JSON.stringify({source:'API publicada; calculo de Diario sin escrituras',periods,transfer240:t.filter((x:any)=>x.importe===240).map((x:any)=>({id:x.id,fecha:x.fecha,importe:x.importe,concepto:x.concepto,origen:x.origenLocal.nombre,destino:x.destinoLocal.nombre})),factura:f.filter((x:any)=>x.numero==='FAC-2026-0013').map((x:any)=>({id:x.id,fecha:x.fecha,fechaPago:x.fechaPago,total:x.total,estado:x.estado}))},null,2))
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect())
