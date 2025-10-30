require('dotenv').config()

async function testGSControlSync() {
  const apiKey = process.env.GSCONTROL_API_KEY
  const endpoint = 'https://gscontrol.abacusai.app/api/integrations/sync'
  
  console.log('\n=== TEST DE SINCRONIZACIÓN GSCONTROL ===\n')
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NO CONFIGURADA')
  console.log('Endpoint:', endpoint)
  
  // Test de conexión
  try {
    const testData = {
      type: 'INVOICE',
      servyautoId: 'test-123',
      data: {
        amount: 100.00,
        description: 'Test de conexión',
        date: new Date().toISOString()
      }
    }
    
    console.log('\nEnviando test de conexión...')
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(testData)
    })
    
    console.log('Status:', response.status, response.statusText)
    
    if (response.ok) {
      const data = await response.json()
      console.log('\n✅ CONEXIÓN EXITOSA CON GSCONTROL')
      console.log('Respuesta:', JSON.stringify(data, null, 2))
    } else {
      const error = await response.text()
      console.log('\n❌ ERROR EN LA CONEXIÓN')
      console.log('Error:', error)
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
  }
}

testGSControlSync()
