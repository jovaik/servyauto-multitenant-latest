
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Importar funciones de sincronización
const GSCONTROL_API_KEY = process.env.GSCONTROL_API_KEY || 'servyauto_sk_a1b2c3d4e5f6g7h8i9j0';
const GSCONTROL_ENDPOINT = process.env.GSCONTROL_ENDPOINT || 'https://gscontrol.abacusai.app/api/integrations/sync';

/**
 * Sincroniza transacciones con GSControl
 */
async function syncToGSControl(transactions) {
  try {
    const response = await fetch(GSCONTROL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GSCONTROL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transactions }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Error ${response.status}:`, data);
      return { success: false, error: data };
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Genera ID externo único usando la fecha de creación del registro
 * IMPORTANTE: Usar la fecha REAL del registro, NO la fecha actual
 */
function generateExternalId(type, id, createdDate) {
  const date = createdDate.toISOString().split('T')[0].replace(/-/g, '');
  const shortId = String(id).slice(-8);
  return `SERVYAUTO-${type}-${date}-${shortId}`;
}

/**
 * Sincroniza todas las facturas
 */
async function syncFacturas() {
  console.log('\n📄 SINCRONIZANDO FACTURAS...');
  console.log('============================');
  
  const facturas = await prisma.factura.findMany({
    where: {
      estado: 'PAGADA' // Solo facturas pagadas
    },
    include: {
      cliente: true,
      factura_items: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log(`📊 Total facturas pagadas: ${facturas.length}`);

  const transactions = [];
  
  for (const factura of facturas) {
    const esTicket = factura.tipo === 'TICKET';
    
    transactions.push({
      externalId: generateExternalId(esTicket ? 'TICK' : 'FAC', factura.id, factura.createdAt),
      type: 'INGRESO',
      date: factura.createdAt.toISOString(),
      amount: factura.total,
      ivaRate: 21,
      description: factura.factura_items?.map(i => i.descripcion).join(', ') || 'Servicio de taller',
      documentType: esTicket ? 'NO APLICA' : 'FACTURA',
      invoiceNumber: esTicket ? undefined : factura.numero,
      clientName: factura.cliente?.nombre,
      clientDni: factura.cliente?.dni || undefined,
      metadata: {
        facturaId: factura.id,
        origen: 'HISTORICO'
      }
    });
  }

  // Enviar en lotes de 10
  const batchSize = 10;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    console.log(`\n📤 Enviando lote ${Math.floor(i / batchSize) + 1} (${batch.length} facturas)...`);
    
    const result = await syncToGSControl(batch);
    
    if (result.success) {
      successCount += batch.length;
      console.log(`✅ Lote sincronizado: ${result.data.processed} procesadas`);
      if (result.data.errors > 0) {
        console.warn(`⚠️ ${result.data.errors} con errores`);
        errorCount += result.data.errors;
      }
    } else {
      errorCount += batch.length;
      console.error(`❌ Error en lote:`, result.error);
    }

    // Pausa entre lotes para no saturar la API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n✅ Facturas sincronizadas: ${successCount}`);
  if (errorCount > 0) {
    console.log(`⚠️ Facturas con errores: ${errorCount}`);
  }

  return { success: successCount, errors: errorCount };
}

/**
 * Sincroniza todos los gastos
 */
async function syncGastos() {
  console.log('\n💸 SINCRONIZANDO GASTOS...');
  console.log('==========================');
  
  const gastos = await prisma.gasto.findMany({
    orderBy: {
      createdAt: 'asc'
    }
  });

  console.log(`📊 Total gastos: ${gastos.length}`);

  const transactions = gastos.map(gasto => {
    let ivaRate = 21;
    if (gasto.iva === 10) ivaRate = 10;
    else if (gasto.iva === 4) ivaRate = 4;
    else if (gasto.iva === 0) ivaRate = 0;

    const tieneFactura = !!gasto.numeroFactura;

    return {
      externalId: generateExternalId('GAS', gasto.id, gasto.createdAt),
      type: 'GASTO',
      date: gasto.fecha.toISOString(),
      amount: -Math.abs(gasto.importe), // GASTOS SIEMPRE NEGATIVOS
      ivaRate: ivaRate,
      description: gasto.concepto,
      documentType: tieneFactura ? 'FACTURA' : 'NO APLICA',
      invoiceNumber: gasto.numeroFactura || undefined,
      costCategory: gasto.tipoGasto || 'OTROS',
      metadata: {
        gastoId: gasto.id,
        proveedor: gasto.proveedor,
        origen: 'HISTORICO'
      }
    };
  });

  // Enviar en lotes de 10
  const batchSize = 10;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    console.log(`\n📤 Enviando lote ${Math.floor(i / batchSize) + 1} (${batch.length} gastos)...`);
    
    const result = await syncToGSControl(batch);
    
    if (result.success) {
      successCount += batch.length;
      console.log(`✅ Lote sincronizado: ${result.data.processed} procesados`);
      if (result.data.errors > 0) {
        console.warn(`⚠️ ${result.data.errors} con errores`);
        errorCount += result.data.errors;
      }
    } else {
      errorCount += batch.length;
      console.error(`❌ Error en lote:`, result.error);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n✅ Gastos sincronizados: ${successCount}`);
  if (errorCount > 0) {
    console.log(`⚠️ Gastos con errores: ${errorCount}`);
  }

  return { success: successCount, errors: errorCount };
}

/**
 * Sincroniza todos los cierres de caja
 */
async function syncCierres() {
  console.log('\n📦 SINCRONIZANDO CIERRES DE CAJA...');
  console.log('===================================');
  
  const cierres = await prisma.cierreCaja.findMany({
    orderBy: {
      fechaFin: 'asc'
    }
  });

  console.log(`📊 Total cierres: ${cierres.length}`);

  let successCount = 0;
  let errorCount = 0;

  for (const cierre of cierres) {
    const transactions = [];

    // Ingresos por método de pago
    if (cierre.totalEfectivo > 0) {
      transactions.push({
        externalId: generateExternalId('CIE-EFE', `${cierre.id}-EFE`, cierre.createdAt),
        type: 'INGRESO',
        date: cierre.fechaFin.toISOString(),
        amount: cierre.totalEfectivo,
        description: `Cierre de caja - Efectivo`,
        documentType: 'NO APLICA',
        metadata: {
          cierreCajaId: cierre.id,
          metodoPago: 'EFECTIVO',
          origen: 'HISTORICO'
        }
      });
    }

    if (cierre.totalTPVSumup > 0) {
      transactions.push({
        externalId: generateExternalId('CIE-SUM', `${cierre.id}-SUM`, cierre.createdAt),
        type: 'INGRESO',
        date: cierre.fechaFin.toISOString(),
        amount: cierre.totalTPVSumup,
        description: `Cierre de caja - TPV SumUp`,
        documentType: 'NO APLICA',
        metadata: {
          cierreCajaId: cierre.id,
          metodoPago: 'TPV_SUMUP',
          origen: 'HISTORICO'
        }
      });
    }

    if (cierre.totalTPVUnicaja > 0) {
      transactions.push({
        externalId: generateExternalId('CIE-UNI', `${cierre.id}-UNI`, cierre.createdAt),
        type: 'INGRESO',
        date: cierre.fechaFin.toISOString(),
        amount: cierre.totalTPVUnicaja,
        description: `Cierre de caja - TPV Unicaja`,
        documentType: 'NO APLICA',
        metadata: {
          cierreCajaId: cierre.id,
          metodoPago: 'TPV_UNICAJA',
          origen: 'HISTORICO'
        }
      });
    }

    // Gastos del cierre
    const totalGastos = cierre.gastosEfectivo + cierre.gastosTarjeta;
    if (totalGastos > 0) {
      transactions.push({
        externalId: generateExternalId('CIE-GAS', `${cierre.id}-GAS`, cierre.createdAt),
        type: 'GASTO',
        date: cierre.fechaFin.toISOString(),
        amount: totalGastos,
        description: `Gastos del día - ${cierre.observaciones || 'Sin detalles'}`,
        documentType: 'NO APLICA',
        costCategory: 'CAJA',
        metadata: {
          cierreCajaId: cierre.id,
          origen: 'HISTORICO'
        }
      });
    }

    if (transactions.length > 0) {
      console.log(`\n📤 Sincronizando cierre ${cierre.id} (${transactions.length} transacciones)...`);
      
      const result = await syncToGSControl(transactions);
      
      if (result.success) {
        successCount += transactions.length;
        console.log(`✅ Cierre sincronizado: ${result.data.processed} transacciones`);
        if (result.data.errors > 0) {
          console.warn(`⚠️ ${result.data.errors} con errores`);
          errorCount += result.data.errors;
        }
      } else {
        errorCount += transactions.length;
        console.error(`❌ Error en cierre:`, result.error);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n✅ Transacciones de cierres sincronizadas: ${successCount}`);
  if (errorCount > 0) {
    console.log(`⚠️ Transacciones con errores: ${errorCount}`);
  }

  return { success: successCount, errors: errorCount };
}

/**
 * Script principal
 */
async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🔄 SINCRONIZACIÓN MASIVA DE DATOS HISTÓRICOS');
  console.log('   ServyAuto → GSControl');
  console.log('   (SOLO INGRESOS Y GASTOS - SIN CIERRES DE CAJA)');
  console.log('═══════════════════════════════════════════════════');

  try {
    const facturasResult = await syncFacturas();
    const gastosResult = await syncGastos();
    // NO sincronizamos cierres de caja - GSControl solo necesita ingresos y gastos

    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 RESUMEN FINAL DE SINCRONIZACIÓN');
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Facturas sincronizadas: ${facturasResult.success}`);
    console.log(`✅ Gastos sincronizados: ${gastosResult.success}`);
    
    const totalSuccess = facturasResult.success + gastosResult.success;
    const totalErrors = facturasResult.errors + gastosResult.errors;
    
    console.log(`\n🎯 TOTAL: ${totalSuccess} transacciones sincronizadas`);
    
    if (totalErrors > 0) {
      console.log(`⚠️ Errores: ${totalErrors} transacciones no se pudieron sincronizar`);
      console.log('   (Probablemente duplicados - eso es normal)');
    }
    
    console.log('\n✅ SINCRONIZACIÓN COMPLETADA\n');
  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
