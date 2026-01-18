require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    // Buscar todos los servicios
    const servicios = await prisma.servicioTaller.findMany({
      include: {
        cliente: true,
        factura: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    console.log('=== ÚLTIMOS 20 SERVICIOS ===');
    servicios.forEach(s => {
      console.log('ID:', s.id);
      console.log('Fecha:', s.createdAt);
      console.log('Cliente:', s.cliente?.nombre);
      console.log('Concepto:', s.concepto);
      console.log('Total:', s.total);
      console.log('FacturaId:', s.facturaId);
      console.log('Factura:', s.factura?.numero, s.factura?.estado);
      console.log('---');
    });

    // Buscar clientes que contengan ANGEL o ANA
    const clientes = await prisma.cliente.findMany({
      where: {
        OR: [
          { nombre: { contains: 'ANGEL', mode: 'insensitive' } },
          { nombre: { contains: 'ANA', mode: 'insensitive' } },
          { nombre: { contains: 'FLORA', mode: 'insensitive' } },
          { nombre: { contains: 'RINCON', mode: 'insensitive' } }
        ]
      }
    });
    console.log('\n=== CLIENTES ANGEL/ANA/FLORA/RINCON ===');
    clientes.forEach(c => {
      console.log('ID:', c.id, 'Nombre:', c.nombre);
    });

    // Buscar últimas 10 facturas
    const facturas = await prisma.factura.findMany({
      include: { cliente: true },
      orderBy: { fecha: 'desc' },
      take: 10
    });
    console.log('\n=== ÚLTIMAS 10 FACTURAS ===');
    facturas.forEach(f => {
      console.log('Numero:', f.numero, 'Cliente:', f.cliente?.nombre, 'Total:', f.total, 'Estado:', f.estado, 'Fecha:', f.fecha);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}
check();
