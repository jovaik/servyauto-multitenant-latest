import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const servicios = await prisma.servicioTaller.findMany({
    select: { id:true, concepto:true, fecha:true, costeProducto:true, costeManoObra:true, importe:true, citaId:true,
      cita: { select: { localId:true } } },
    orderBy: { fecha:'asc' }
  })
  const conCoste = servicios.filter(s => (s.costeProducto||0) + (s.costeManoObra||0) > 0)
  console.log('Total servicios taller:', servicios.length)
  console.log('Con coste>0:', conCoste.length)
  const porLocal: Record<string,number> = {}
  for (const s of conCoste) { const k = s.cita?.localId || 'NULL'; porLocal[k]=(porLocal[k]||0)+1 }
  console.log('Con coste, por local de la cita:', JSON.stringify(porLocal))
  let posiblesDuplicados = 0
  for (const s of conCoste) {
    const coste = (s.costeProducto||0)+(s.costeManoObra||0)
    const d = new Date(s.fecha); const ini = new Date(d); ini.setHours(0,0,0,0); const fin=new Date(d); fin.setHours(23,59,59,999)
    const g = await prisma.gasto.findFirst({ where: { importe: { gte: coste-0.01, lte: coste+0.01 }, fecha: { gte: ini, lte: fin } }, select:{id:true} })
    if (g) posiblesDuplicados++
  }
  console.log('Servicios con coste cuyo importe+fecha coincide con gasto existente (posible dup manual):', posiblesDuplicados)
  conCoste.slice(0,10).forEach(s=>console.log('  ', new Date(s.fecha).toISOString().slice(0,10), '| coste', (s.costeProducto||0)+(s.costeManoObra||0), '| local', s.cita?.localId||'NULL', '|', s.concepto))
}
main().finally(()=>prisma.$disconnect())
