require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const apiKey = process.env.GSCONTROL_API_KEY;
const endpoint = 'https://gscontrol.abacusai.app/api/integrations/sync';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🔧 LIMPIEZA Y RE-SINCRONIZACIÓN CON IDS CORRECTOS         ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Función para generar ID INCORRECTO (con fecha actual - como estaba antes)
function generateWrongExternalId(type, id) {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const shortId = String(id).slice(-8);
  return `SERVYAUTO-${type}-${date}-${shortId}`;
}

async function cleanupAndResync() {
  console.log('PASO 1: Obtener todos los registros de la base de datos...\n');
  
  // Obtener facturas pagadas
  const facturas = await prisma.factura.findMany({
    where: { estado: 'PAGADA' },
    select: { id: true, tipo: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  });
  
  // Obtener todos los gastos
  const gastos = await prisma.gasto.findMany({
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log(`📊 Facturas pagadas: ${facturas.length}`);
  console.log(`📊 Gastos: ${gastos.length}`);
  console.log(`📊 Total: ${facturas.length + gastos.length} registros\n`);
  
  // PASO 2: Eliminar IDs INCORRECTOS (con fecha actual)
  console.log('PASO 2: Eliminando transacciones con IDs incorrectos...\n');
  
  const wrongIds = [];
  
  facturas.forEach(f => {
    const prefix = f.tipo === 'TICKET' ? 'TICK' : 'FAC';
    wrongIds.push(generateWrongExternalId(prefix, f.id));
  });
  
  gastos.forEach(g => {
    wrongIds.push(generateWrongExternalId('GAS', g.id));
  });
  
  console.log(`🗑️  Eliminando ${wrongIds.length} IDs incorrectos...`);
  
  // Enviar en lotes de 50
  const batchSize = 50;
  let totalDeleted = 0;
  
  for (let i = 0; i < wrongIds.length; i += batchSize) {
    const batch = wrongIds.slice(i, i + batchSize);
    
    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ externalIds: batch }),
      });
      
      if (response.ok) {
        const data = await response.json();
        totalDeleted += data.deleted;
        
        if (data.deleted > 0) {
          console.log(`  ✅ Lote ${Math.floor(i / batchSize) + 1}: ${data.deleted} eliminadas`);
        }
      }
    } catch (err) {
      console.error(`  ❌ Error en lote:`, err.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n✅ Total eliminadas: ${totalDeleted}\n`);
  
  await prisma.$disconnect();
  
  console.log('═'.repeat(70));
  console.log('\n✅ LIMPIEZA COMPLETADA');
  console.log('\n📋 SIGUIENTE PASO: Ejecutar el script de sincronización histórica');
  console.log('   Comando: node scripts/sync-historico-gscontrol.js\n');
}

cleanupAndResync()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ ERROR:', err.message);
    process.exit(1);
  });
