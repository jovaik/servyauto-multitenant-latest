import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const s = await prisma.servicioTaller.findMany({ include: { cita: { select: { localId:true, estado:true } } }, orderBy:{fecha:'asc'} })
  s.forEach(x=>console.log(JSON.stringify({ fecha:new Date(x.fecha).toISOString().slice(0,10), concepto:x.concepto, tipoGasto:x.tipoGasto, costeProducto:x.costeProducto, costeManoObra:x.costeManoObra, precioProducto:x.precioProducto, precioManoObra:x.precioManoObra, importe:x.importe, margen:x.margen, metodoPago:x.metodoPago, citaLocal:x.cita?.localId, citaEstado:x.cita?.estado })))
  console.log('Total gastos en BD:', await prisma.gasto.count())
}
main().finally(()=>prisma.$disconnect())
