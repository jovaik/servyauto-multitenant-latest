const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      nombre: true,
      createdAt: true,
      _count: {
        select: { citas: true, facturas: true, vehiculos: true }
      }
    }
  });
  
  console.log('ANÁLISIS POR FECHA:\n');
  
  const porMes = {};
  clientes.forEach(c => {
    const mes = c.createdAt.toISOString().substring(0, 7);
    if (!porMes[mes]) porMes[mes] = [];
    porMes[mes].push(c);
  });
  
  Object.keys(porMes).sort().forEach(mes => {
    console.log(`\n--- ${mes} (${porMes[mes].length} clientes) ---`);
    porMes[mes].slice(0, 3).forEach(c => {
      console.log(`  ${c.nombre} - ${c.createdAt.toISOString()} - Citas:${c._count.citas} Facturas:${c._count.facturas} Vehículos:${c._count.vehiculos}`);
    });
    if (porMes[mes].length > 3) {
      console.log(`  ... y ${porMes[mes].length - 3} más`);
    }
  });
  
  console.log('\n\nRESUMEN:');
  Object.keys(porMes).sort().forEach(mes => {
    const total = porMes[mes].length;
    const conDatos = porMes[mes].filter(c => c._count.citas > 0 || c._count.facturas > 0 || c._count.vehiculos > 0).length;
    console.log(`${mes}: ${total} clientes (${conDatos} con datos relacionados, ${total-conDatos} sin datos)`);
  });
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
