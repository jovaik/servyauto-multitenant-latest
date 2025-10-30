require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    const facturas = await prisma.factura.count();
    const gastos = await prisma.gasto.count();
    const cierres = await prisma.cierreCaja.count();
    
    console.log('\n📊 DATOS HISTÓRICOS EN SERVYAUTO:');
    console.log('================================');
    console.log(`💰 Facturas: ${facturas}`);
    console.log(`💸 Gastos: ${gastos}`);
    console.log(`📦 Cierres de Caja: ${cierres}`);
    console.log(`\n📍 TOTAL: ${facturas + gastos + cierres} registros por sincronizar\n`);
    
    // Mostrar algunas facturas recientes
    if (facturas > 0) {
      const recentFacturas = await prisma.factura.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          numero: true,
          total: true,
          createdAt: true,
          estado: true
        }
      });
      console.log('📄 Últimas 3 facturas:');
      recentFacturas.forEach(f => {
        console.log(`   - ${f.numero}: €${f.total} (${f.estado}) - ${f.createdAt.toLocaleDateString('es-ES')}`);
      });
    }
    
    // Mostrar algunos gastos recientes
    if (gastos > 0) {
      const recentGastos = await prisma.gasto.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          concepto: true,
          importe: true,
          createdAt: true
        }
      });
      console.log('\n💸 Últimos 3 gastos:');
      recentGastos.forEach(g => {
        console.log(`   - ${g.concepto}: €${g.importe} - ${g.createdAt.toLocaleDateString('es-ES')}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
