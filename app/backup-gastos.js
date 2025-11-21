require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function backupGastos() {
  try {
    const gastos = await prisma.gasto.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    const backup = {
      fecha_backup: new Date().toISOString(),
      total_gastos: gastos.length,
      gastos: gastos
    };
    
    const filename = `backup_gastos_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
    
    console.log('✅ Backup completado:');
    console.log('📁 Archivo:', filename);
    console.log('📊 Total gastos:', gastos.length);
    console.log('💰 Importe total:', gastos.reduce((sum, g) => sum + g.importe, 0).toFixed(2), '€');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error en backup:', error);
    process.exit(1);
  }
}

backupGastos();
