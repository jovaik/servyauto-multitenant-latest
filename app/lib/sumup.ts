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

import { prisma } from '@/lib/db'

const SUMUP_API_BASE = 'https://api.sumup.com'

// Cache del merchant_code por API key (cada local puede tener su propia cuenta SumUp).
const _merchantCodeCache = new Map<string, string>()

/**
 * Obtener el merchant_code real (ej: "MCZ42XNC") llamando a /v0.1/me.
 * Necesario porque la API key puede NO tener permiso sobre el alias "me"
 * en endpoints de readers; hay que usar el merchant_code explícito.
 * Se cachea por API key (cada local puede usar una cuenta distinta).
 */
async function getMerchantCode(overrideApiKey?: string): Promise<string> {
  const apiKey = overrideApiKey || process.env.SUMUP_API_KEY
  if (!apiKey) throw new Error('SUMUP_API_KEY no configurada')

  const cached = _merchantCodeCache.get(apiKey)
  if (cached) return cached

  const res = await fetch(`${SUMUP_API_BASE}/v0.1/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) {
    throw new Error(`Error obteniendo merchant_code: ${await res.text()}`)
  }
  const data = await res.json()
  const code = data.merchant_code
    || data.merchant_profile?.merchant_code
    || data.account?.merchant_code
  if (!code) {
    throw new Error('No se encontró merchant_code en respuesta de /v0.1/me')
  }
  _merchantCodeCache.set(apiKey, code)
  return code
}

/**
 * Obtener las API keys de SumUp para un local específico.
 * Si el local tiene su propia key, la devuelve. Si no, devuelve undefined (usa la central del .env).
 */
export async function getLocalSumUpKeys(localId: string | null | undefined): Promise<{
  apiKey?: string
  affiliateKey?: string
}> {
  if (!localId) return {}
  
  const local = await prisma.local.findUnique({
    where: { id: localId },
    select: { sumupApiKey: true, sumupAffiliateKey: true, nombre: true },
  })
  
  if (!local) return {}
  
  const result: { apiKey?: string; affiliateKey?: string } = {}
  if (local.sumupApiKey) {
    result.apiKey = local.sumupApiKey
    console.log(`[SumUp] Usando API key del local: ${local.nombre}`)
  }
  if (local.sumupAffiliateKey) {
    result.affiliateKey = local.sumupAffiliateKey
  }
  
  return result
}

/**
 * Resolver las claves SumUp a usar para un cobro/consulta.
 * Prioridad: clave propia de la CuentaTpv seleccionada (p.ej. SUMUP BARTO) ->
 * clave del local -> clave central del .env.
 * Esto permite que el dinero vaya a la cuenta correcta (la del colaborador
 * dueño del datafono) aunque se cobre desde cualquier local.
 */
export async function resolveSumUpKeys(opts: {
  cuentaTpvId?: string | null
  localId?: string | null
}): Promise<{ apiKey?: string; affiliateKey?: string }> {
  if (opts.cuentaTpvId) {
    const cuenta = await prisma.cuentaTpv.findUnique({
      where: { id: opts.cuentaTpvId },
      select: { sumupApiKey: true, sumupAffiliateKey: true, nombre: true },
    })
    if (cuenta?.sumupApiKey) {
      console.log(`[SumUp] Usando API key de la cuenta TPV: ${cuenta.nombre}`)
      return {
        apiKey: cuenta.sumupApiKey,
        affiliateKey: cuenta.sumupAffiliateKey || undefined,
      }
    }
  }
  return getLocalSumUpKeys(opts.localId)
}

/**
 * El local de la venta NO identifica la cuenta propietaria del terminal.
 * Comprueba la pertenencia del reader con consultas de solo lectura antes de
 * elegir credenciales. Nunca reintenta un POST de cobro con otra cuenta.
 */
export async function resolveReaderSumUpKeys(opts: {
  readerId: string
  cuentaTpvId?: string | null
  localId?: string | null
}): Promise<{ apiKey: string }> {
  const reader = await prisma.sumUpReader.findUnique({
    where: { sumupReaderId: opts.readerId },
    select: { localId: true, cuentaTpvId: true },
  })
  const cuentaId = reader?.cuentaTpvId || opts.cuentaTpvId
  const cuenta = cuentaId ? await prisma.cuentaTpv.findUnique({
    where: { id: cuentaId },
    select: { sumupApiKey: true, localId: true },
  }) : null
  const ownerLocalId = cuenta?.localId || reader?.localId
  const ownerKeys = ownerLocalId ? await getLocalSumUpKeys(ownerLocalId) : {}
  const saleKeys = opts.localId && opts.localId !== ownerLocalId
    ? await getLocalSumUpKeys(opts.localId) : {}
  const candidates = Array.from(new Set([
    cuenta?.sumupApiKey,
    ownerKeys.apiKey,
    process.env.SUMUP_API_KEY,
    saleKeys.apiKey,
  ].filter((key): key is string => !!key)))

  for (const apiKey of candidates) {
    const merchantCode = await getMerchantCode(apiKey)
    const response = await fetch(
      `${SUMUP_API_BASE}/v0.1/merchants/${merchantCode}/readers/${encodeURIComponent(opts.readerId)}`,
      { headers: getHeaders(apiKey), cache: 'no-store' }
    )
    if (response.ok) return { apiKey }
    if (response.status === 404) continue
    // Un fallo de permisos o de red no autoriza probar otras credenciales.
    throw new Error(`No se pudo verificar el terminal en SumUp (HTTP ${response.status}). Revisa los permisos de la cuenta.`)
  }
  throw new Error('El terminal no está vinculado a las cuentas SumUp configuradas. Actualiza los terminales y revisa su cuenta en Configuración → SumUp.')
}

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
// Si se pasa overrideApiKey (key del local), se usa esa. Si no, la central del .env
function getHeaders(overrideApiKey?: string) {
  const apiKey = overrideApiKey || process.env.SUMUP_API_KEY
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
export async function getMerchantInfo(overrideApiKey?: string) {
  const response = await fetch(`${SUMUP_API_BASE}/v0.1/me`, {
    method: 'GET',
    headers: getHeaders(overrideApiKey),
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
export async function listReaders(overrideApiKey?: string): Promise<SumUpReader[]> {
  const merchantCode = await getMerchantCode(overrideApiKey)
  const response = await fetch(`${SUMUP_API_BASE}/v0.1/merchants/${merchantCode}/readers`, {
    method: 'GET',
    headers: getHeaders(overrideApiKey),
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
export async function pairReader(pairingCode: string, readerName: string, overrideApiKey?: string): Promise<SumUpReader> {
  const merchantCode = await getMerchantCode(overrideApiKey)
  const response = await fetch(`${SUMUP_API_BASE}/v0.1/merchants/${merchantCode}/readers`, {
    method: 'POST',
    headers: getHeaders(overrideApiKey),
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
export async function unpairReader(readerId: string, overrideApiKey?: string): Promise<void> {
  const merchantCode = await getMerchantCode(overrideApiKey)
  const response = await fetch(`${SUMUP_API_BASE}/v0.1/merchants/${merchantCode}/readers/${readerId}`, {
    method: 'DELETE',
    headers: getHeaders(overrideApiKey),
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
  reference?: string,
  overrideApiKey?: string,
  overrideAffiliateKey?: string
): Promise<SumUpCheckout> {
  const affiliateKey = overrideAffiliateKey || process.env.SUMUP_AFFILIATE_KEY
  if (!affiliateKey) {
    throw new Error('SUMUP_AFFILIATE_KEY no configurada')
  }

  // Primero obtener el merchant_code
  const merchantInfo = await getMerchantInfo(overrideApiKey)
  
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
      ...getHeaders(overrideApiKey),
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
  amount: number,
  description?: string,
  overrideApiKey?: string
): Promise<{ checkout_id: string | null; client_transaction_id: string | null }> {
  const merchantCode = await getMerchantCode(overrideApiKey)

  // La Cloud API de SumUp (cobro en terminal) pide el importe en 'total_amount'
  // con 'value' en unidades menores (céntimos) como entero. Enviar checkout_id
  // devuelve el error {"total_amount":["can't be blank"]}.
  const body: any = {
    total_amount: {
      currency: 'EUR',
      minor_unit: 2,
      value: Math.round(amount * 100),
    },
  }
  if (description) body.description = description

  const response = await fetch(
    `${SUMUP_API_BASE}/v0.1/merchants/${merchantCode}/readers/${readerId}/checkout`,
    {
      method: 'POST',
      headers: getHeaders(overrideApiKey),
      body: JSON.stringify(body),
    }
  )
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Error iniciando cobro en lector: ${error}`)
  }

  // La Cloud API devuelve { data: { checkout_id, client_transaction_id } }.
  // Ese checkout_id es el del cobro REAL en el terminal; lo devolvemos para
  // guardarlo y poder consultar su estado / conciliarlo al instante.
  const json: any = await response.json()
  return {
    checkout_id: json?.data?.checkout_id ?? null,
    client_transaction_id: json?.data?.client_transaction_id ?? null,
  }
}

/**
 * Consultar estado de un checkout
 */
export async function getCheckoutStatus(checkoutId: string, overrideApiKey?: string): Promise<SumUpCheckout> {
  const response = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts/${checkoutId}`, {
    method: 'GET',
    headers: getHeaders(overrideApiKey),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Error consultando checkout: ${error}`)
  }
  
  return response.json()
}

/**
 * Consultar el estado de un cobro iniciado en un TERMINAL (Cloud API).
 * El cobro en el lector NO se puede consultar por /checkouts/{id} (devuelve
 * NOT_FOUND); hay que buscar la transacción por su client_transaction_id.
 * Devuelve un objeto compatible con SumUpCheckout (status normalizado a
 * PAID/FAILED/CANCELLED/PENDING) para reutilizar la lógica de conciliación.
 */
export async function getReaderTransactionStatus(
  clientTransactionId: string,
  overrideApiKey?: string
): Promise<SumUpCheckout | null> {
  const response = await fetch(
    `${SUMUP_API_BASE}/v0.1/me/transactions?client_transaction_id=${encodeURIComponent(clientTransactionId)}`,
    { method: 'GET', headers: getHeaders(overrideApiKey) }
  )

  if (response.status === 404) return null
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Error consultando transacción de terminal: ${error}`)
  }

  const txn: any = await response.json()
  if (!txn || !txn.status) return null

  // Estados de transacción SumUp: SUCCESSFUL / FAILED / CANCELLED / PENDING.
  const raw = String(txn.status).toUpperCase()
  const status = raw === 'SUCCESSFUL' ? 'PAID' : raw

  return {
    id: txn.id,
    checkout_reference: txn.transaction_code,
    amount: txn.amount,
    currency: txn.currency,
    status,
    transaction_code: txn.transaction_code,
    transaction_id: txn.id,
  } as any
}

/**
 * Cancelar un checkout/cobro pendiente
 */
export async function cancelCheckout(checkoutId: string, overrideApiKey?: string): Promise<void> {
  const response = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts/${checkoutId}`, {
    method: 'DELETE',
    headers: getHeaders(overrideApiKey),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Error cancelando checkout: ${error}`)
  }
}

/**
 * Terminar transacción en curso en un lector
 */
export async function terminateReaderTransaction(readerId: string, overrideApiKey?: string): Promise<void> {
  const merchantCode = await getMerchantCode(overrideApiKey)
  const response = await fetch(
    `${SUMUP_API_BASE}/v0.1/merchants/${merchantCode}/readers/${readerId}/terminate`,
    {
      method: 'POST',
      headers: getHeaders(overrideApiKey),
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
  redirectUrl?: string,
  overrideApiKey?: string,
  overrideAffiliateKey?: string
): Promise<PaymentLink> {
  const apiKey = overrideApiKey || process.env.SUMUP_API_KEY
  if (!apiKey) throw new Error('SUMUP_API_KEY no configurada')

  // Crear checkout - ahora incluye hosted_checkout habilitado
  const checkout = await createCheckout(amount, description, reference, overrideApiKey, overrideAffiliateKey)
  
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

