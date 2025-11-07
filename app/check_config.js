require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('\n=== CONFIGURACIONES ACTUALES ===\n')
  const configs = await prisma.configuracion.findMany({
    orderBy: { categoria: 'asc' }
  })
  
  if (configs.length === 0) {
    console.log('No hay configuraciones guardadas aún')
  } else {
    configs.forEach(c => {
      console.log(`${c.categoria} -> ${c.clave}: ${c.valor}`)
    })
  }
  
  console.log('\n=== SERVICIOS ACTUALES ===\n')
  const servicios = await prisma.servicio.findMany({
    orderBy: { nombre: 'asc' }
  })
  
  if (servicios.length === 0) {
    console.log('No hay servicios guardados aún')
  } else {
    servicios.forEach(s => {
      console.log(`${s.nombre}:`)
      console.log(`  Precio Pequeño: ${s.precioPequeno}€`)
      console.log(`  Precio Medio: ${s.precioMedio}€`)
      console.log(`  Precio Grande: ${s.precioGrande}€`)
      console.log(`  Precio Super Grande: ${s.precioSuperGrande}€`)
      console.log(`  Duración: ${s.duracion} min`)
      console.log(`  Descripción: ${s.descripcion || 'N/A'}`)
      console.log('')
    })
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
