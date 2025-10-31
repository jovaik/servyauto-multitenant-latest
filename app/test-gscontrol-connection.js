const fetch = require('node-fetch');
require('dotenv').config();

const GSCONTROL_ENDPOINT = 'https://gscontrol.abacusai.app/api/integrations/sync';
const API_KEY = process.env.GSCONTROL_API_KEY;

async function testConnection() {
  console.log('🔍 Probando conexión con GSControl...\n');
  console.log('Endpoint:', GSCONTROL_ENDPOINT);
  console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 15)}...` : 'NO CONFIGURADA');
  console.log('\n');

  if (!API_KEY) {
    console.error('❌ GSCONTROL_API_KEY no está configurada');
    return;
  }

  // Test 1: Crear una transacción de prueba
  console.log('📤 Test 1: Creando transacción de prueba...');
  const testTransaction = {
    transactions: [{
      externalId: `SERVYAUTO-TEST-${Date.now()}`,
      type: 'INGRESO',
      date: new Date().toISOString(),
      amount: 10.50,
      description: 'Test de sincronización ServyAuto',
      documentType: 'NO APLICA',
      metadata: {
        test: true,
        timestamp: Date.now()
      }
    }]
  };

  const startTime = Date.now();
  
  try {
    const response = await fetch(GSCONTROL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testTransaction),
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    console.log('⏱️  Tiempo de respuesta:', responseTime, 'ms');
    console.log('📊 Status HTTP:', response.status);
    console.log('📝 Respuesta:', JSON.stringify(data, null, 2));

    if (response.status === 200) {
      console.log('\n✅ Sincronización exitosa!');
      
      // Test 2: Eliminar la transacción de prueba
      console.log('\n🗑️  Test 2: Eliminando transacción de prueba...');
      const deleteStartTime = Date.now();
      
      const deleteResponse = await fetch(GSCONTROL_ENDPOINT, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          externalIds: [testTransaction.transactions[0].externalId]
        }),
      });

      const deleteResponseTime = Date.now() - deleteStartTime;
      const deleteData = await deleteResponse.json();

      console.log('⏱️  Tiempo de respuesta:', deleteResponseTime, 'ms');
      console.log('📊 Status HTTP:', deleteResponse.status);
      console.log('📝 Respuesta:', JSON.stringify(deleteData, null, 2));

      if (deleteResponse.status === 200) {
        console.log('\n✅ Eliminación exitosa!');
      } else {
        console.log('\n⚠️  Error en eliminación');
      }
    } else {
      console.log('\n❌ Error en sincronización');
      console.log('Detalles del error:', data);
    }

  } catch (error) {
    console.error('\n❌ Error de conexión:', error.message);
    console.error('Stack:', error.stack);
  }
}

testConnection().catch(console.error);
