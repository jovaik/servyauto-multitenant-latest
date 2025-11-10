require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const configs = await prisma.configuracion.findMany({
      where: { categoria: 'publica' },
      orderBy: { clave: 'asc' }
    });
    
    console.log('\n=== CONFIGURACIONES PÚBLICAS EN BD ===\n');
    
    if (configs.length === 0) {
      console.log('❌ NO HAY CONFIGURACIONES PÚBLICAS EN LA BD\n');
      console.log('Esto significa que el panel de administración NO ha guardado la configuración.');
    } else {
      configs.forEach(c => {
        if (c.clave === 'publica.color_fondo') {
          console.log(`🎨 ${c.clave}: ${c.valor} ← COLOR CONFIGURADO`);
        } else {
          console.log(`✓ ${c.clave}: ${c.valor}`);
        }
      });
    }
    
    console.log(`\n📊 Total: ${configs.length} configuraciones\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
