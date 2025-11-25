const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testBuscarMatricula() {
  try {
    console.log('🔍 Buscando todos los vehículos en la base de datos...\n')
    
    const vehiculos = await prisma.vehiculo.findMany({
      include: {
        cliente: true
      },
      take: 5
    })
    
    console.log(`📊 Total de vehículos encontrados: ${vehiculos.length}\n`)
    
    if (vehiculos.length > 0) {
      console.log('Primeros 5 vehículos:')
      vehiculos.forEach((v, i) => {
        console.log(`\n${i + 1}. Matrícula: ${v.matricula}`)
        console.log(`   Marca: ${v.marca}`)
        console.log(`   Modelo: ${v.modelo}`)
        console.log(`   Cliente: ${v.cliente.nombre} ${v.cliente.apellido || ''}`)
      })
      
      // Probar búsqueda con la primera matrícula
      const primeraMatricula = vehiculos[0].matricula
      console.log(`\n\n🔍 Probando búsqueda con matrícula: ${primeraMatricula}`)
      
      const resultado = await prisma.vehiculo.findFirst({
        where: {
          matricula: {
            equals: primeraMatricula,
            mode: 'insensitive'
          }
        },
        include: {
          cliente: true
        }
      })
      
      if (resultado) {
        console.log('✅ Búsqueda exitosa!')
        console.log(`   Encontrado: ${resultado.marca} ${resultado.modelo}`)
        console.log(`   Cliente: ${resultado.cliente.nombre} ${resultado.cliente.apellido || ''}`)
      } else {
        console.log('❌ No se encontró el vehículo')
      }
    } else {
      console.log('⚠️  No hay vehículos en la base de datos')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testBuscarMatricula()
