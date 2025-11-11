const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConfig() {
  try {
    console.log('\n=== VERIFICANDO CONFIGURACIÓN EN LA BASE DE DATOS ===\n');
    
    const allConfigs = await prisma.configuracion.findMany();
    
    console.log('Total de registros de configuración:', allConfigs.length);
    console.log('\n--- Todos los registros ---');
    allConfigs.forEach((config, index) => {
      console.log(`\n${index + 1}. Key: "${config.key}"`);
      console.log(`   Value: "${config.value}"`);
    });
    
    // Buscar específicamente los valores públicos
    console.log('\n\n=== CONFIGURACIÓN PÚBLICA ESPECÍFICA ===');
    const telefono = await prisma.configuracion.findUnique({
      where: { key: 'publica.telefono' }
    });
    
    const color = await prisma.configuracion.findUnique({
      where: { key: 'publica.color_fondo' }
    });
    
    console.log('\nTeléfono en DB:');
    console.log(telefono ? `  Key: "${telefono.key}", Value: "${telefono.value}"` : '  NO ENCONTRADO');
    
    console.log('\nColor en DB:');
    console.log(color ? `  Key: "${color.key}", Value: "${color.value}"` : '  NO ENCONTRADO');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConfig();
