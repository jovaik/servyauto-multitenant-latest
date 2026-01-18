require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    // Buscar citas recientes
    const citas = await prisma.cita.findMany({
      include: {
        cliente: true,
        vehiculo: true,
        facturas: true
      },
      orderBy: { fecha: 'desc' },
      take: 20
    });
    
    console.log('=== ÚLTIMAS 20 CITAS ===');
    citas.forEach(c => {
      console.log('ID:', c.id);
      console.log('Fecha:', c.fecha);
      console.log('Cliente:', c.cliente?.nombre);
      console.log('Vehículo:', c.vehiculo?.matricula);
      console.log('Estado:', c.estado);
      console.log('Precio:', c.precioFinal);
      console.log('Factura:', c.facturas?.numero);
      console.log('---');
    });

    // Buscar citas del cliente ANGEL
    const citasAngel = await prisma.cita.findMany({
      where: {
        cliente: { nombre: { contains: 'ANGEL', mode: 'insensitive' } }
      },
      include: { cliente: true, facturas: true },
      orderBy: { fecha: 'desc' },
      take: 5
    });
    console.log('\n=== CITAS DE ANGEL ===');
    citasAngel.forEach(c => {
      console.log('ID:', c.id, 'Fecha:', c.fecha, 'Cliente:', c.cliente?.nombre, 'Estado:', c.estado, 'Factura:', c.facturas?.numero);
    });

    // Buscar citas del cliente ANA
    const citasAna = await prisma.cita.findMany({
      where: {
        cliente: { nombre: { contains: 'ANA', mode: 'insensitive' } }
      },
      include: { cliente: true, facturas: true },
      orderBy: { fecha: 'desc' },
      take: 5
    });
    console.log('\n=== CITAS DE ANA ===');
    citasAna.forEach(c => {
      console.log('ID:', c.id, 'Fecha:', c.fecha, 'Cliente:', c.cliente?.nombre, 'Estado:', c.estado, 'Factura:', c.facturas?.numero);
    });

    // Buscar citas completadas sin factura
    const citasSinFactura = await prisma.cita.findMany({
      where: {
        estado: 'COMPLETADA',
        facturas: null
      },
      include: { cliente: true },
      orderBy: { fecha: 'desc' }
    });
    console.log('\n=== CITAS COMPLETADAS SIN FACTURA ===');
    citasSinFactura.forEach(c => {
      console.log('ID:', c.id, 'Fecha:', c.fecha, 'Cliente:', c.cliente?.nombre, 'Estado:', c.estado, 'Precio:', c.precioFinal);
    });
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}
check();
