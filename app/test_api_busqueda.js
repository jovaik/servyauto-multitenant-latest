const fetch = require('node-fetch')

async function testAPI() {
  try {
    const matricula = '1426 LZV'
    console.log(`🔍 Probando API con matrícula: ${matricula}`)
    
    const url = `http://localhost:3000/api/vehiculos/search/${encodeURIComponent(matricula)}`
    console.log(`URL: ${url}\n`)
    
    const response = await fetch(url, {
      headers: {
        'Cookie': 'next-auth.session-token=test' // Simular sesión
      }
    })
    
    console.log(`Status: ${response.status}`)
    const data = await response.json()
    console.log('Response:', JSON.stringify(data, null, 2))
    
  } catch (error) {
    console.error('Error:', error.message)
  }
}

testAPI()
