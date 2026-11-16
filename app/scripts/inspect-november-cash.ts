import { prisma } from '../lib/db'
async function main() {
 const f=await prisma.factura.findUnique({where:{numero:'FAC-2026-0013'},select:{id:true,numero:true,fecha:true,fechaPago:true,createdAt:true,updatedAt:true,total:true,estado:true,metodoPago:true,localId:true,citaId:true,citas:{select:{id:true,fecha:true,estado:true,metodoPago:true,total:true,pagosParciales:true}},factura_items:{select:{descripcion:true}}}})
 const t=await prisma.transferenciaCaja.findMany({where:{importe:240},include:{origenLocal:{select:{nombre:true}},destinoLocal:{select:{nombre:true}}}})
 const logs=f ? await prisma.activityLog.findMany({where:{entityId:{in:[f.id,...(f.citaId?[f.citaId]:[])]}},select:{action:true,description:true,details:true,createdAt:true},orderBy:{createdAt:'asc'}}):[]
 console.log(JSON.stringify({factura:f,transferencias:t,logs},null,2))
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect())
