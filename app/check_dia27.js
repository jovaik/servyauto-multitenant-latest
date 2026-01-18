require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    // Buscar servicios del día 27
    const servicios = await prisma.servicioTaller.findMany({
      where: {
        createdAt: {
          gte: new Date('2025-01-27T00:00:00'),
          lt: new Date('2025-01-28T00:00:00')
        }
      },
      include: {
        cliente: true,
        factura: true
      }
    });
    
    console.log('=== SERVICIOS DEL 27 ===');
    servicios.forEach(s => {
      console.log('ID:', s.id);
      console.log('Cliente:', s.cliente?.nombre);
      console.log('Concepto:', s.concepto);
      console.log('Total:', s.total);
      console.log('FacturaId:', s.facturaId);
      console.log('Factura:', s.factura?.numero, s.factura?.estado);
      console.log('---');
    });

    // Buscar facturas del día 27
    const facturas = await prisma.factura.findMany({
      where: {
        fecha: {
          gte: new Date('2025-01-27T00:00:00'),
          lt: new Date('2025-01-28T00:00:00')
        }
      },
      include: {
        cliente: true
      }
    });
    
    console.log('\n=== FACTURAS DEL 27 ===');
    facturas.forEach(f => {
      console.log('ID:', f.id);
      console.log('Numero:', f.numero);
      console.log('Cliente:', f.cliente?.nombre);
      console.log('Total:', f.total);
      console.log('Estado:', f.estado);
      console.log('---');
    });

    // Buscar cliente ANA FLORA
    const cliente = await prisma.cliente.findFirst({
      where: {
        nombre: { contains: 'ANA FLORA', mode: 'insensitive' }
      }
    });
    console.log('\n=== CLIENTE ANA FLORA ===');
    console.log(cliente);

    // Buscar todas las facturas de ANA FLORA
    if (cliente) {
      const facturasCliente = await prisma.factura.findMany({
        where: { clienteId: cliente.id },
        orderBy: { fecha: 'desc' }
      });
      console.log('\n=== FACTURAS DE ANA FLORA ===');
      facturasCliente.forEach(f => {
        console.log('Numero:', f.numero, 'Fecha:', f.fecha, 'Total:', f.total, 'Estado:', f.estado);
      });

      // Buscar servicios de ANA FLORA
      const serviciosCliente = await prisma.servicioTaller.findMany({
        where: { clienteId: cliente.id },
        include: { factura: true },
        orderBy: { createdAt: 'desc' }
      });
      console.log('\n=== SERVICIOS DE ANA FLORA ===');
      serviciosCliente.forEach(s => {
        console.log('ID:', s.id, 'Concepto:', s.concepto, 'Total:', s.total, 'FacturaId:', s.facturaId, 'Factura:', s.factura?.numero);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}
check();
