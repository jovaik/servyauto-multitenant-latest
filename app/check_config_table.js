const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTable() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'configuraciones'
      ORDER BY ordinal_position;
    `;
    console.log('Estructura de la tabla configuraciones:');
    console.log(JSON.stringify(result, null, 2));
    
    const count = await prisma.$queryRaw`SELECT COUNT(*) FROM configuraciones`;
    console.log('\nRegistros en la tabla:', count);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTable();
