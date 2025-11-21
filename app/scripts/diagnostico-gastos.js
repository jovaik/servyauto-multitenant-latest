
/**
 * 🔍 DIAGNÓSTICO DE GASTOS
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('💸 ANÁLISIS DE GASTOS');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    const gastos = await prisma.gasto.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    const totalGastos = gastos.reduce((sum, g) => sum + g.importe, 0);
    
    console.log(`📊 Total gastos registrados: ${gastos.length}`);
    console.log(`💸 Total importe: €${totalGastos.toFixed(2)}\n`);
    
    console.log('📋 ÚLTIMOS 10 GASTOS:\n');
    
    gastos.slice(0, 10).forEach((g, i) => {
      console.log(`${i+1}. €${g.importe.toFixed(2)} - ${g.concepto}`);
      console.log(`   📂 Categoría: ${g.tipoGasto || 'Sin categoría'}`);
      console.log(`   📅 Fecha: ${g.fecha.toLocaleDateString('es-ES')}`);
      console.log(`   ${g.numeroFactura ? `📄 Factura: ${g.numeroFactura}` : '🎫 Sin factura'}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
