
/**
 * Script para ejecutar la sincronización PULL con GSControl periódicamente
 * Puede ser ejecutado por:
 * 1. Cron job del sistema (crontab)
 * 2. PM2 con configuración de cron
 * 3. Manualmente desde la terminal
 * 
 * Uso:
 *   node scripts/gscontrol-pull-sync-cron.js
 */

const fetch = require('node-fetch')

const API_ENDPOINT = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const CRON_TOKEN = process.env.CRON_SECRET_TOKEN || 'change-this-in-production'

async function executePullSync() {
  try {
    console.log('🔄 [CRON] Ejecutando sincronización PULL con GSControl...')
    console.log('   📍 Endpoint:', `${API_ENDPOINT}/api/integrations/gscontrol-pull-sync`)
    
    const response = await fetch(`${API_ENDPOINT}/api/integrations/gscontrol-pull-sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ [CRON] Sincronización completada:', result)
    } else {
      console.error('❌ [CRON] Error en sincronización:', result)
    }

  } catch (error) {
    console.error('❌ [CRON] Error ejecutando sincronización:', error.message)
  }
}

// Ejecutar inmediatamente
executePullSync()

// Si se quiere ejecutar periódicamente desde Node.js (alternativa a cron del sistema)
// Descomentar estas líneas:
/*
const INTERVAL_MINUTES = 5
console.log(`⏱️  [CRON] Configurado para ejecutar cada ${INTERVAL_MINUTES} minutos`)
setInterval(executePullSync, INTERVAL_MINUTES * 60 * 1000)
*/
