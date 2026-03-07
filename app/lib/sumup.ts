/**
 * SumUp Cloud API Integration
 * Permite cobrar directamente en el terminal Solo sin pasar por la app de SumUp
 * 
 * Modos de asignación:
 * - COMPARTIDO: Todos los terminales son accesibles desde cualquier local
 * - POR_LOCAL: Cada terminal está asignado a un local específico
 */

const SUMUP_API_BASE = 'https://api.sumup.com'

export type ModoAsignacion = 'COMPARTIDO' | 'POR_LOCAL'

export interface SumUpReader {
  id: string
  name: string
  status: 'paired' | 'unpaired' | 'unknown'
  pairedAt?: string
  localId?: string | null
  localNombre?: string | null
}

export interface SumUpCheckout {
  id: string
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED'
  amount: number
  currency: string
  checkout_reference?: string
  transaction_code?: string
  transaction_id?: string
}

// Headers comunes para todas las peticiones
function getHeaders() {
  const apiKey = process.env.SUMUP_API_KEY
  if (!apiKey) {
    throw new Error('SUMUP_API_KEY no configurada')
  }
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Obtener información del merchant actual
 */
export async function getMerchantInfo() {
  const response = await fetch(`${SUMUP_API_BASE}/v0.1/me`, {
    method: 'GET',
    headers: getHeaders(),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Error obteniendo info del merchant: ${error}`)
  }
  
  return response.json()
}

/**
 * Listar lectores emparejados
 */
export async function listReaders(): Promise<SumUpReader[]> {
  const response = await fetch(`${SUMUP_API_BASE}/v0.1/merchants/me/readers`, {
    method: 'GET',
    headers: getHeaders(),
  })
  
  if (!response.ok) {
    const error = await response.text()
    console.error('Error listando lectores:', error)
    return []
  }
  
  const data = await response.json()
  return data.items || data || []
}

/**
 * Emparejar un nuevo lector usando código de emparejamiento
 */
export async function pairReader(pairingCode: string, readerName: string): Promise<SumUpReader> {
  const response = await fetch(`${SUMUP_API_BASE}/v0.1/merchants/me/readers`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      pairing_code: pairingCode,
      name: readerName,
    }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Error emparejando lector: ${error}`)
  }
  
  return response.json()
}

/**
 * Eliminar/desemparejar un lector
 */
export async function unpairReader(readerId: string): Promise<void> {
  const response = await fetch(`${SUMUP_API_BASE}/v0.1/merchants/me/readers/${readerId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Error desemparejando lector: ${error}`)
  }
}

/**
 * Crear un checkout (preparar cobro)
 */
export async function createCheckout(
  amount: number,
  description: string,
  reference?: string
): Promise<SumUpCheckout> {
  const affiliateKey = process.env.SUMUP_AFFILIATE_KEY
  if (!affiliateKey) {
    throw new Error('SUMUP_AFFILIATE_KEY no configurada')
  }

  // Primero obtener el merchant_code
  const merchantInfo = await getMerchantInfo()
  const merchantCode = merchantInfo.merchant_code
  
  if (!merchantCode) {
    throw new Error('No se pudo obtener el merchant_code')
  }

  const checkoutData = {
    checkout_reference: reference || `SERVY-${Date.now()}`,
    amount: amount,
    currency: 'EUR',
    pay_to_email: merchantInfo.email,
    merchant_code: merchantCode,
    description: description,
  }

  console.log('Creando checkout SumUp:', checkoutData)

  const response = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts`, {
    method: 'POST',
    headers: {
      ...getHeaders(),
      'X-Affiliate-Key': affiliateKey,
    },
    body: JSON.stringify(checkoutData),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Error creando checkout: ${error}`)
  }
  
  return response.json()
}

/**
 * Iniciar cobro en un lector específico
 */
export async function initiateReaderPayment(
  readerId: string,
  checkoutId: string
): Promise<{ status: string }> {
  const response = await fetch(
    `${SUMUP_API_BASE}/v0.1/merchants/me/readers/${readerId}/checkout`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        checkout_id: checkoutId,
      }),
    }
  )
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Error iniciando cobro en lector: ${error}`)
  }
  
  return response.json()
}

/**
 * Consultar estado de un checkout
 */
export async function getCheckoutStatus(checkoutId: string): Promise<SumUpCheckout> {
  const response = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts/${checkoutId}`, {
    method: 'GET',
    headers: getHeaders(),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Error consultando checkout: ${error}`)
  }
  
  return response.json()
}

/**
 * Cancelar un checkout/cobro pendiente
 */
export async function cancelCheckout(checkoutId: string): Promise<void> {
  const response = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts/${checkoutId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Error cancelando checkout: ${error}`)
  }
}

/**
 * Terminar transacción en curso en un lector
 */
export async function terminateReaderTransaction(readerId: string): Promise<void> {
  const response = await fetch(
    `${SUMUP_API_BASE}/v0.1/merchants/me/readers/${readerId}/terminate`,
    {
      method: 'POST',
      headers: getHeaders(),
    }
  )
  
  if (!response.ok) {
    const error = await response.text()
    console.error('Error terminando transacción:', error)
  }
}
