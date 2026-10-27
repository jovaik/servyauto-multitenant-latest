import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main(){
  const c = await prisma.citaCosteInterno.findFirst({ where:{ descripcion:'PRUEBA FECHA COSTE' }, orderBy:{createdAt:'desc'} })
  console.log('COSTE:', c?.descripcion, c?.importe, 'fecha=', c?.fecha?.toISOString().slice(0,10))
  const g = await prisma.gasto.findFirst({ where:{ citaCosteInternoId: c?.id } })
  console.log('GASTO:', g?.concepto, g?.importe, 'fecha=', g?.fecha?.toISOString().slice(0,10), 'local=', g?.localId)
}
main().finally(()=>prisma.$disconnect())
