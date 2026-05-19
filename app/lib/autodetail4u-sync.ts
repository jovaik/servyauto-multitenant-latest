/**
 * Sincronización en tiempo real con autodetail4u.
 * Replica cada reserva/cita nueva al tenant quick-shine.
 * Fire-and-forget: no bloquea la operación principal.
 */

const AD4U_URL = process.env.AD4U_SYNC_URL || ''
const AD4U_API_KEY = process.env.AD4U_SYNC_API_KEY || ''
const AD4U_TENANT = process.env.AD4U_TENANT_SLUG || 'quick-shine'

interface AD4UReservaPayload {
  nombre: string
  apellido: string
  telefono: string
  email: string
  fecha: string       // YYYY-MM-DD
  hora: string        // HH:MM
  servicios: string[]
  vehiculoMarca: string
  vehiculoModelo: string
  matricula: string
  localId?: string
  tenantSlug: string
}

/**
 * Envía una reserva a autodetail4u.
 * Reintenta 1 vez si falla por timeout/red.
 * Nunca lanza excepción — logea y sigue.
 */
export async function syncReservaToAD4U(data: AD4UReservaPayload): Promise<void> {
  if (!AD4U_URL || !AD4U_API_KEY) {
    console.log('[AD4U-Sync] ⚠️ No configurado (faltan AD4U_SYNC_URL o AD4U_SYNC_API_KEY)')
    return
  }

  const payload = {
    ...data,
    tenantSlug: AD4U_TENANT,
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[AD4U-Sync] Enviando reserva (intento ${attempt}):`, {
        nombre: payload.nombre,
        matricula: payload.matricula,
        fecha: payload.fecha,
        hora: payload.hora,
      })

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

      const res = await fetch(AD4U_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': AD4U_API_KEY,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (res.ok) {
        const result = await res.json().catch(() => ({}))
        console.log(`[AD4U-Sync] ✅ Reserva replicada OK:`, result)
        return
      }

      const errorText = await res.text().catch(() => 'Sin respuesta')
      console.error(`[AD4U-Sync] ❌ Error HTTP ${res.status}:`, errorText)

      // No reintentar en errores 4xx (dato malo, no vale la pena)
      if (res.status >= 400 && res.status < 500) return

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error(`[AD4U-Sync] ⏱️ Timeout en intento ${attempt}`)
      } else {
        console.error(`[AD4U-Sync] ❌ Error de red en intento ${attempt}:`, err.message)
      }
    }
  }

  console.error('[AD4U-Sync] ❌ Falló tras 2 intentos — se continuará sin bloquear')
}

/**
 * Helper: construye el payload desde los datos de una reserva pública.
 */
export function buildAD4UPayloadFromReserva(params: {
  nombre: string
  apellido?: string
  telefono: string
  email?: string
  fecha: Date | string
  hora: string
  servicio: string
  marcaModelo: string
  matricula: string
  localId?: string
}): AD4UReservaPayload {
  const { nombre, apellido, telefono, email, fecha, hora, servicio, marcaModelo, matricula, localId } = params

  // Separar marca/modelo: "MERCEDES GLE" → marca=MERCEDES, modelo=GLE
  const parts = (marcaModelo || '').trim().split(/\s+/)
  const vehiculoMarca = parts[0] || ''
  const vehiculoModelo = parts.slice(1).join(' ') || ''

  // Formatear fecha a YYYY-MM-DD
  let fechaStr: string
  if (fecha instanceof Date) {
    fechaStr = fecha.toISOString().split('T')[0]
  } else {
    // Ya viene como string, intentar parsear
    const d = new Date(fecha)
    fechaStr = isNaN(d.getTime()) ? String(fecha) : d.toISOString().split('T')[0]
  }

  return {
    nombre: nombre || '',
    apellido: apellido || '',
    telefono: telefono || '',
    email: email || '',
    fecha: fechaStr,
    hora: hora || '',
    servicios: servicio ? [servicio] : [],
    vehiculoMarca,
    vehiculoModelo,
    matricula: (matricula || '').toUpperCase(),
    localId: localId || undefined,
    tenantSlug: AD4U_TENANT,
  }
}

/**
 * Helper: construye el payload desde los datos de una cita creada desde agenda.
 */
export function buildAD4UPayloadFromCita(cita: {
  cliente: { nombre: string; apellido?: string | null; telefono: string; email?: string | null }
  vehiculo: { marca: string; modelo: string; matricula: string }
  fecha: Date | string
  horaInicio: string
  cita_servicios?: Array<{ servicios: { nombre: string } }>
  localId?: string | null
}): AD4UReservaPayload {
  // Formatear fecha a YYYY-MM-DD
  let fechaStr: string
  const d = new Date(cita.fecha)
  fechaStr = isNaN(d.getTime()) ? String(cita.fecha) : d.toISOString().split('T')[0]

  // Extraer nombres de servicios
  const servicios = (cita.cita_servicios || []).map(cs => cs.servicios?.nombre).filter(Boolean) as string[]

  return {
    nombre: cita.cliente.nombre || '',
    apellido: cita.cliente.apellido || '',
    telefono: cita.cliente.telefono || '',
    email: cita.cliente.email || '',
    fecha: fechaStr,
    hora: cita.horaInicio || '',
    servicios,
    vehiculoMarca: cita.vehiculo.marca || '',
    vehiculoModelo: cita.vehiculo.modelo || '',
    matricula: (cita.vehiculo.matricula || '').toUpperCase(),
    localId: cita.localId || undefined,
    tenantSlug: AD4U_TENANT,
  }
}
