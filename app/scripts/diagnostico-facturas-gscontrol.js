
/**
 * 🔍 SCRIPT DE DIAGNÓSTICO DE SINCRONIZACIÓN GSCONTROL
 * 
 * Este script:
 * 1. Lista TODAS las facturas pagadas en ServyAuto
 * 2. Calcula el total de ingresos esperado
 * 3. Intenta resincronizar cada factura
 * 4. Genera un reporte detallado
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GSCONTROL_API_KEY = 'gs_dff763d23624a595fe081d0359066facc50968fe407ef239236c8f3ee5750f0a';
const GSCONTROL_INGEST_ENDPOINT = 'https://gscontrol.abacusai.app/api/integrations/ingest';

/**
 * Envía una factura a GSControl
 */
async function sincronizarFactura(factura) {
  try {
    const descripcionFactura = `${factura.tipo}: ${factura.numero} - ${factura.cliente.nombre} ${factura.cliente.apellido || ''}`;
    const clienteNombreCompleto = `${factura.cliente.nombre} ${factura.cliente.apellido || ''}`.trim();

    const payload = {
      externalId: factura.id,
      type: "INGRESO",
      date: factura.createdAt.toISOString(),
      amount: factura.total,
      description: descripcionFactura,
      ivaRate: 21,
      documentType: factura.tipo, // "FACTURA" o "TICKET"
      invoiceNumber: factura.tipo === 'FACTURA' ? factura.numero : undefined,
      clientName: clienteNombreCompleto || undefined,
      clientDni: factura.cliente.documento || undefined
    };

    console.log(`\n🔄 Sincronizando: ${factura.numero} (€${factura.total.toFixed(2)})`);
    console.log(`   Cliente: ${clienteNombreCompleto}`);
    console.log(`   Fecha: ${factura.createdAt.toLocaleDateString('es-ES')}`);

    const response = await fetch(GSCONTROL_INGEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GSCONTROL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    if (!response.ok) {
      // Si es un 409 (duplicado), es OK - ya estaba sincronizada
      if (response.status === 409) {
        console.log(`   ✅ Ya sincronizada (duplicada en GSControl)`);
        return { success: true, yaSincronizada: true };
      }
      
      console.error(`   ❌ ERROR ${response.status}: ${responseText}`);
      return { success: false, error: responseText, status: response.status };
    }

    console.log(`   ✅ Sincronizada correctamente`);
    return { success: true, yaSincronizada: false };

  } catch (error) {
    console.error(`   ❌ Error de red: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Script principal
 */
async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔍 DIAGNÓSTICO DE SINCRONIZACIÓN GSCONTROL');
  console.log('   Analizando facturas de ServyAuto...');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // 1. OBTENER TODAS LAS FACTURAS PAGADAS
    const facturas = await prisma.factura.findMany({
      where: {
        estado: 'PAGADA'
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            apellido: true,
            documento: true
          }
        },
        factura_items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 TOTAL DE FACTURAS PAGADAS: ${facturas.length}\n`);

    // 2. CALCULAR TOTAL ESPERADO
    const totalIngresos = facturas.reduce((sum, f) => sum + f.total, 0);
    console.log(`💰 TOTAL ESPERADO: €${totalIngresos.toFixed(2)}`);
    console.log(`   (Este es el ingreso total que DEBERÍA estar en GSControl)\n`);

    // 3. LISTAR FACTURAS POR TIPO
    const facturasTipo = facturas.filter(f => f.tipo === 'FACTURA');
    const tickets = facturas.filter(f => f.tipo === 'TICKET');
    
    console.log(`📄 Facturas: ${facturasTipo.length} (€${facturasTipo.reduce((s, f) => s + f.total, 0).toFixed(2)})`);
    console.log(`🎫 Tickets: ${tickets.length} (€${tickets.reduce((s, f) => s + f.total, 0).toFixed(2)})\n`);

    // 4. MOSTRAR LAS 10 FACTURAS MÁS RECIENTES
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 ÚLTIMAS 10 FACTURAS:');
    console.log('═══════════════════════════════════════════════════\n');

    const ultimas10 = facturas.slice(0, 10);
    ultimas10.forEach((f, idx) => {
      const fecha = f.createdAt.toLocaleDateString('es-ES');
      const cliente = `${f.cliente.nombre} ${f.cliente.apellido || ''}`.trim();
      console.log(`${idx + 1}. ${f.numero} - €${f.total.toFixed(2)}`);
      console.log(`   📅 ${fecha} | 👤 ${cliente}`);
      console.log(`   📦 Items: ${f.factura_items.map(i => i.descripcion).join(', ')}\n`);
    });

    // 5. PREGUNTAR SI QUIERE RESINCRONIZAR
    console.log('═══════════════════════════════════════════════════');
    console.log('🔄 INICIANDO RESINCRONIZACIÓN...');
    console.log('   (Esto enviará TODAS las facturas a GSControl)');
    console.log('   (Las duplicadas serán detectadas automáticamente)');
    console.log('═══════════════════════════════════════════════════\n');

    // Esperar 3 segundos antes de empezar
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 6. RESINCRONIZAR TODAS
    let sincronizadas = 0;
    let yaSincronizadas = 0;
    let errores = 0;
    const facturasConError = [];

    for (const factura of facturas) {
      const resultado = await sincronizarFactura(factura);
      
      if (resultado.success) {
        if (resultado.yaSincronizada) {
          yaSincronizadas++;
        } else {
          sincronizadas++;
        }
      } else {
        errores++;
        facturasConError.push({
          numero: factura.numero,
          total: factura.total,
          error: resultado.error,
          status: resultado.status
        });
      }

      // Pequeña pausa entre facturas para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 7. REPORTE FINAL
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 REPORTE FINAL DE SINCRONIZACIÓN');
    console.log('═══════════════════════════════════════════════════\n');

    console.log(`✅ Facturas sincronizadas correctamente: ${sincronizadas}`);
    console.log(`♻️  Facturas ya sincronizadas (duplicadas): ${yaSincronizadas}`);
    console.log(`❌ Facturas con errores: ${errores}\n`);

    if (facturasConError.length > 0) {
      console.log('⚠️  FACTURAS CON ERRORES:\n');
      facturasConError.forEach(f => {
        console.log(`   ${f.numero} - €${f.total.toFixed(2)}`);
        console.log(`   Error: ${f.error}`);
        console.log(`   Status: ${f.status}\n`);
      });
    }

    const totalSincronizado = sincronizadas + yaSincronizadas;
    const porcentaje = ((totalSincronizado / facturas.length) * 100).toFixed(1);

    console.log(`🎯 TASA DE ÉXITO: ${porcentaje}% (${totalSincronizado}/${facturas.length})`);
    console.log(`💰 TOTAL SINCRONIZADO: €${totalIngresos.toFixed(2)}\n`);

    if (errores === 0) {
      console.log('✅ ¡PERFECTO! Todas las facturas están sincronizadas con GSControl\n');
    } else {
      console.log(`⚠️  ATENCIÓN: ${errores} facturas necesitan revisión manual\n`);
    }

  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
main();
