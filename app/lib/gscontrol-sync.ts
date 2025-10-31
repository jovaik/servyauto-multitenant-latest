
/**
 * ⚠️ INSTRUCCIONES EXACTAS DE GSCONTROL - NO MODIFICAR
 * Sistema de sincronización en tiempo real con GSControl
 */

const GSCONTROL_API_KEY = 'gs_dff763d23624a595fe081d0359066facc50968fe407ef239236c8f3ee5750f0a'
const GSCONTROL_INGEST_ENDPOINT = 'https://gscontrol.abacusai.app/api/integrations/ingest'

// ============================================
// MAPEO DE CATEGORÍAS DE GASTO
// ============================================

/**
 * Mapea las categorías de gasto de ServyAuto a las categorías válidas de GSControl
 * 
 * CATEGORÍAS VÁLIDAS SEGÚN PDF 31/10/2025:
 * ALQUILER, AUTONOMOS, GESTORIA, COMBUSTIBLE, 
 * GASTOS FIJOS, TALLERES, REPUESTOS, SEGUROS, OTROS GASTOS
 */
export function mapearCategoriaGasto(tipoGasto: string): string {
  const categoria = tipoGasto.toUpperCase().trim()
  
  // Mapeo directo - CORREGIDO: "GASTOS FIJOS" con espacio, no guion bajo
  const mapeo: { [key: string]: string } = {
    'ALQUILER': 'ALQUILER',
    'AUTONOMO': 'AUTONOMOS',
    'AUTONOMOS': 'AUTONOMOS',
    'GESTORIA': 'GESTORIA',
    'GESTORÍA': 'GESTORIA',
    'COMBUSTIBLE': 'COMBUSTIBLE',
    'GASOLINA': 'COMBUSTIBLE',
    'DIESEL': 'COMBUSTIBLE',
    'GASTOS FIJOS': 'GASTOS FIJOS',        // ✅ CORREGIDO: con espacio
    'GASTOS_FIJOS': 'GASTOS FIJOS',       // ✅ CORREGIDO: con espacio
    'TALLER': 'TALLERES',
    'TALLERES': 'TALLERES',
    'REPARACION': 'TALLERES',
    'REPARACIÓN': 'TALLERES',
    'REPUESTO': 'REPUESTOS',
    'REPUESTOS': 'REPUESTOS',
    'PIEZAS': 'REPUESTOS',
    'MATERIALES': 'REPUESTOS',
    'SEGURO': 'SEGUROS',
    'SEGUROS': 'SEGUROS'
  }
  
  // Buscar coincidencia exacta
  if (mapeo[categoria]) {
    return mapeo[categoria]
  }
  
  // Buscar coincidencia parcial
  for (const [clave, valor] of Object.entries(mapeo)) {
    if (categoria.includes(clave) || clave.includes(categoria)) {
      return valor
    }
  }
  
  // Si no se encuentra coincidencia, usar OTROS GASTOS (con espacio)
  return 'OTROS GASTOS'  // ✅ CORREGIDO: con espacio
}

// ============================================
// TAREA 1: WEBHOOKS EN TIEMPO REAL
// ============================================

/**
 * 1.1 CUANDO CREEN UNA TRANSACCIÓN
 * Código ACTUALIZADO con nuevos campos según PDF 31/10/2025
 */
export async function notificarCreacionGSControl(transaccion: {
  id: string
  esIngreso: boolean
  fecha: string | Date
  importe: number
  descripcion: string
  // Nuevos campos opcionales para INGRESOS
  documentType?: 'FACTURA' | 'TICKET'
  invoiceNumber?: string
  clientName?: string
  clientDni?: string
  // Nuevos campos opcionales para GASTOS
  costCategory?: string
}) {
  try {
    const payload: any = {
      externalId: transaccion.id.toString(),
      type: transaccion.esIngreso ? "INGRESO" : "GASTO",
      date: typeof transaccion.fecha === 'string' ? transaccion.fecha : transaccion.fecha.toISOString(),
      amount: transaccion.importe,
      description: transaccion.descripcion,
      ivaRate: 21
    }

    // Agregar campos específicos para INGRESOS
    if (transaccion.esIngreso) {
      if (transaccion.documentType) {
        payload.documentType = transaccion.documentType
      }
      if (transaccion.invoiceNumber) {
        payload.invoiceNumber = transaccion.invoiceNumber
      }
      if (transaccion.clientName) {
        payload.clientName = transaccion.clientName
      }
      if (transaccion.clientDni) {
        payload.clientDni = transaccion.clientDni
      }
    }

    // Agregar campos específicos para GASTOS
    if (!transaccion.esIngreso && transaccion.costCategory) {
      payload.costCategory = transaccion.costCategory
    }

    const response = await fetch(GSCONTROL_INGEST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GSCONTROL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
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
 * Código ACTUALIZADO con nuevos campos según PDF 31/10/2025
 */
export async function notificarModificacionGSControl(transaccion: {
  id: string
  esIngreso: boolean
  fecha: string | Date
  importe: number
  descripcion: string
  // Nuevos campos opcionales para INGRESOS
  documentType?: 'FACTURA' | 'TICKET'
  invoiceNumber?: string
  clientName?: string
  clientDni?: string
  // Nuevos campos opcionales para GASTOS
  costCategory?: string
}) {
  try {
    const payload: any = {
      externalId: transaccion.id.toString(),
      type: transaccion.esIngreso ? "INGRESO" : "GASTO",
      date: typeof transaccion.fecha === 'string' ? transaccion.fecha : transaccion.fecha.toISOString(),
      amount: transaccion.importe,
      description: transaccion.descripcion,
      ivaRate: 21
    }

    // Agregar campos específicos para INGRESOS
    if (transaccion.esIngreso) {
      if (transaccion.documentType) {
        payload.documentType = transaccion.documentType
      }
      if (transaccion.invoiceNumber) {
        payload.invoiceNumber = transaccion.invoiceNumber
      }
      if (transaccion.clientName) {
        payload.clientName = transaccion.clientName
      }
      if (transaccion.clientDni) {
        payload.clientDni = transaccion.clientDni
      }
    }

    // Agregar campos específicos para GASTOS
    if (!transaccion.esIngreso && transaccion.costCategory) {
      payload.costCategory = transaccion.costCategory
    }

    const response = await fetch(GSCONTROL_INGEST_ENDPOINT, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GSCONTROL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
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
