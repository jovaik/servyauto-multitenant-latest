/**
 * SumUp Integration - Cloud API + Payment Links
 * 
 * Soporta dos modos de cobro:
 * 1. Cloud API: Para SumUp Solo (pantalla táctil) - cobro directo al terminal
 * 2. Payment Links: Para Solo Lite y Air - genera link que el cliente paga en su móvil
 * 
 * Modos de asignación de terminales:
 * - COMPARTIDO: Todos los terminales accesibles desde cualquier local
 * - POR_LOCAL: Cada terminal asignado a un local específico
 */

const SUMUP_API_BASE = 'https://api.sumup.com'

export type ModoAsignacion = 'COMPARTIDO' | 'POR_LOCAL'
export type MetodoCobro = 'TERMINAL' | 'LINK'

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
  hosted_checkout_url?: string  // URL de pago hospedada por SumUp
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
  
  const data = await response.json()
  console.log('SumUp Merchant Info:', JSON.stringify(data, null, 2))
  return data
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
  
  // El merchant_code puede estar en diferentes lugares según la respuesta de SumUp
  const merchantCode = merchantInfo.merchant_code || 
                       merchantInfo.merchant_profile?.merchant_code ||
                       merchantInfo.account?.merchant_code
  
  // El email también puede estar en diferentes lugares
  const merchantEmail = merchantInfo.email || 
                        merchantInfo.merchant_profile?.email ||
                        merchantInfo.account?.email
  
  if (!merchantCode) {
    console.error('Estructura de merchantInfo:', Object.keys(merchantInfo))
    throw new Error(`No se pudo obtener el merchant_code. Campos disponibles: ${Object.keys(merchantInfo).join(', ')}`)
  }

  const checkoutData = {
    checkout_reference: reference || `SERVY-${Date.now()}`,
    amount: amount,
    currency: 'EUR',
    pay_to_email: merchantEmail,
    merchant_code: merchantCode,
    description: description,
    // Activar hosted checkout para obtener URL de pago
    hosted_checkout: { enabled: true },
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


// ==================== PAYMENT LINKS ====================
// Para Solo Lite, Air y otros terminales que no soportan Cloud API

export interface PaymentLink {
  id: string
  checkout_reference?: string
  amount: number
  currency: string
  pay_to_email?: string
  description?: string
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED'
  payment_url?: string
  valid_until?: string
}

/**
 * Crear un Payment Link (para Solo Lite/Air)
 * El cliente recibe un link y paga en su móvil
 */
export async function createPaymentLink(
  amount: number,
  description: string,
  reference: string,
  redirectUrl?: string
): Promise<PaymentLink> {
  const apiKey = process.env.SUMUP_API_KEY
  if (!apiKey) throw new Error('SUMUP_API_KEY no configurada')

  // Crear checkout - ahora incluye hosted_checkout habilitado
  const checkout = await createCheckout(amount, description, reference)
  
  // Usar la URL que devuelve SumUp
  const paymentUrl = checkout.hosted_checkout_url || `https://checkout.sumup.com/pay/${checkout.id}`
  
  console.log('Payment Link creado:', paymentUrl)
  
  return {
    id: checkout.id,
    checkout_reference: checkout.checkout_reference,
    amount: checkout.amount,
    currency: checkout.currency,
    description: description,
    status: checkout.status,
    payment_url: paymentUrl,
  }
}

