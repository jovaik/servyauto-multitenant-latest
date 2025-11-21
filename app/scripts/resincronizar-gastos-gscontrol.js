
/**
 * 🔄 RESINCRONIZACIÓN DE GASTOS A GSCONTROL
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GSCONTROL_API_KEY = 'gs_dff763d23624a595fe081d0359066facc50968fe407ef239236c8f3ee5750f0a';
const GSCONTROL_INGEST_ENDPOINT = 'https://gscontrol.abacusai.app/api/integrations/ingest';

// Mapeo de categorías según el sistema
function mapearCategoriaGasto(tipoGasto) {
  const categoria = tipoGasto ? tipoGasto.toUpperCase().trim() : 'OTROS GASTOS';
  
  const mapeo = {
    'PRODUCTOS LAVADO': 'REPUESTOS',
    'PRODUCTOS LIMPIEZA': 'REPUESTOS',
    'SUMINISTROS': 'REPUESTOS',
    'ADELANTO': 'AUTONOMOS',
    'FIJO SEMANAL': 'AUTONOMOS',
    'LIMPIEZA': 'GASTOS FIJOS',
    'ALQUILER': 'ALQUILER',
    'GESTORIA': 'GESTORIA',
    'COMBUSTIBLE': 'COMBUSTIBLE',
    'TALLER': 'TALLERES',
    'REPARACION': 'TALLERES',
    'SEGURO': 'SEGUROS'
  };
  
  // Buscar coincidencia
  for (const [clave, valor] of Object.entries(mapeo)) {
    if (categoria.includes(clave) || clave.includes(categoria)) {
      return valor;
    }
  }
  
  return 'OTROS GASTOS';
}

/**
 * Sincroniza un gasto con GSControl
 */
async function sincronizarGasto(gasto) {
  try {
    const categoriaGSControl = mapearCategoriaGasto(gasto.tipoGasto);
    
    const payload = {
      externalId: gasto.id,
      type: "GASTO",
      date: gasto.fecha.toISOString(),
      amount: gasto.importe,
      description: gasto.concepto,
      ivaRate: gasto.iva || 21,
      costCategory: categoriaGSControl
    };

    console.log(`\n🔄 Sincronizando gasto: ${gasto.concepto} (€${gasto.importe.toFixed(2)})`);
    console.log(`   📂 Categoría: ${gasto.tipoGasto} → ${categoriaGSControl}`);
    console.log(`   📅 Fecha: ${gasto.fecha.toLocaleDateString('es-ES')}`);

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
      // Si es un 409 (duplicado), es OK - ya estaba sincronizado
      if (response.status === 409) {
        console.log(`   ✅ Ya sincronizado (duplicado en GSControl)`);
        return { success: true, yaSincronizado: true };
      }
      
      console.error(`   ❌ ERROR ${response.status}: ${responseText}`);
      return { success: false, error: responseText, status: response.status };
    }

    console.log(`   ✅ Sincronizado correctamente`);
    return { success: true, yaSincronizado: false };

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
  console.log('🔄 RESINCRONIZACIÓN DE GASTOS A GSCONTROL');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // 1. OBTENER TODOS LOS GASTOS
    const gastos = await prisma.gasto.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 TOTAL DE GASTOS: ${gastos.length}\n`);

    const totalGastos = gastos.reduce((sum, g) => sum + g.importe, 0);
    console.log(`💸 TOTAL ESPERADO: €${totalGastos.toFixed(2)}\n`);

    // 2. ESPERAR 2 SEGUNDOS
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. RESINCRONIZAR TODOS
    let sincronizados = 0;
    let yaSincronizados = 0;
    let errores = 0;
    const gastosConError = [];

    for (const gasto of gastos) {
      const resultado = await sincronizarGasto(gasto);
      
      if (resultado.success) {
        if (resultado.yaSincronizado) {
          yaSincronizados++;
        } else {
          sincronizados++;
        }
      } else {
        errores++;
        gastosConError.push({
          concepto: gasto.concepto,
          importe: gasto.importe,
          error: resultado.error,
          status: resultado.status
        });
      }

      // Pausa entre gastos
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 4. REPORTE FINAL
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 REPORTE FINAL DE SINCRONIZACIÓN DE GASTOS');
    console.log('═══════════════════════════════════════════════════\n');

    console.log(`✅ Gastos sincronizados correctamente: ${sincronizados}`);
    console.log(`♻️  Gastos ya sincronizados (duplicados): ${yaSincronizados}`);
    console.log(`❌ Gastos con errores: ${errores}\n`);

    if (gastosConError.length > 0) {
      console.log('⚠️  GASTOS CON ERRORES:\n');
      gastosConError.forEach(g => {
        console.log(`   ${g.concepto} - €${g.importe.toFixed(2)}`);
        console.log(`   Error: ${g.error}`);
        console.log(`   Status: ${g.status}\n`);
      });
    }

    const totalSincronizado = sincronizados + yaSincronizados;
    const porcentaje = ((totalSincronizado / gastos.length) * 100).toFixed(1);

    console.log(`🎯 TASA DE ÉXITO: ${porcentaje}% (${totalSincronizado}/${gastos.length})`);
    console.log(`💸 TOTAL SINCRONIZADO: €${totalGastos.toFixed(2)}\n`);

    if (errores === 0) {
      console.log('✅ ¡PERFECTO! Todos los gastos están sincronizados con GSControl\n');
    } else {
      console.log(`⚠️  ATENCIÓN: ${errores} gastos necesitan revisión manual\n`);
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
