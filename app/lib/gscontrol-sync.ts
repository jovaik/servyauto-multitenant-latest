
/**
 * ⚠️ INSTRUCCIONES EXACTAS DE GSCONTROL - NO MODIFICAR
 * Sistema de sincronización en tiempo real con GSControl
 */

const GSCONTROL_API_KEY = 'gs_dff763d23624a595fe081d0359066facc50968fe407ef239236c8f3ee5750f0a'
const GSCONTROL_INGEST_ENDPOINT = 'https://gscontrol.abacusai.app/api/integrations/ingest'

// ============================================
// TAREA 1: WEBHOOKS EN TIEMPO REAL
// ============================================

/**
 * 1.1 CUANDO CREEN UNA TRANSACCIÓN
 * Código EXACTO del PDF
 */
export async function notificarCreacionGSControl(transaccion: {
  id: string
  esIngreso: boolean
  fecha: string | Date
  importe: number
  descripcion: string
}) {
  try {
    const response = await fetch(GSCONTROL_INGEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GSCONTROL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        externalId: transaccion.id.toString(),
        type: transaccion.esIngreso ? "INGRESO" : "GASTO",
        date: typeof transaccion.fecha === 'string' ? transaccion.fecha : transaccion.fecha.toISOString(),
        amount: transaccion.importe,
        description: transaccion.descripcion,
        ivaRate: 21
      })
    })

    if (!response.ok) {
      console.error('Error sincronizando con GS Control:', await response.text())
    } else {
      console.log('✅ Transacción sincronizada con GS Control')
    }
  } catch (error) {
    console.error('Error enviando a GS Control:', error)
  }
}

/**
 * 1.2 CUANDO MODIFIQUEN UNA TRANSACCIÓN
 * Código EXACTO del PDF
 */
export async function notificarModificacionGSControl(transaccion: {
  id: string
  esIngreso: boolean
  fecha: string | Date
  importe: number
  descripcion: string
}) {
  try {
    const response = await fetch(GSCONTROL_INGEST_ENDPOINT, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GSCONTROL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        externalId: transaccion.id.toString(),
        type: transaccion.esIngreso ? "INGRESO" : "GASTO",
        date: typeof transaccion.fecha === 'string' ? transaccion.fecha : transaccion.fecha.toISOString(),
        amount: transaccion.importe,
        description: transaccion.descripcion,
        ivaRate: 21
      })
    })

    if (!response.ok) {
      console.error('Error sincronizando modificación con GS Control:', await response.text())
    } else {
      console.log('✅ Modificación sincronizada con GS Control')
    }
  } catch (error) {
    console.error('Error enviando modificación a GS Control:', error)
  }
}

/**
 * 1.3 CUANDO ELIMINEN UNA TRANSACCIÓN
 * Código EXACTO del PDF
 */
export async function notificarEliminacionGSControl(transaccionId: string) {
  try {
    const response = await fetch(GSCONTROL_INGEST_ENDPOINT, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${GSCONTROL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        externalId: transaccionId.toString()
      })
    })

    if (!response.ok) {
      console.error('Error sincronizando eliminación con GS Control:', await response.text())
    } else {
      console.log('✅ Eliminación sincronizada con GS Control')
    }
  } catch (error) {
    console.error('Error enviando eliminación a GS Control:', error)
  }
}
