import { prisma } from '../lib/db'
async function main() {
 const rows = await prisma.cita.findMany({where:{OR:[{cliente:{nombre:{contains:'STEFANO'}}},{id:'cmv57b7o7000xlg0711sg4zij'}]},select:{id:true,fecha:true,estado:true,total:true,metodoPago:true,localId:true,cliente:{select:{nombre:true}},vehiculo:{select:{marca:true,modelo:true,matricula:true}},lineasManuales:true,cita_servicios:true,facturas:{include:{factura_items:true}}},orderBy:{fecha:'desc'},take:12})
 console.log(JSON.stringify(rows,null,2))
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>prisma.$disconnect())
