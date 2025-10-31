
/**
 * Servicio de sincronización con GSControl
 * Sincroniza transacciones económicas en tiempo real
 */

interface Transaction {
  externalId?: string;
  type: 'INGRESO' | 'GASTO';
  date: string; // ISO 8601
  amount: number; // Monto BRUTO con IVA incluido
  ivaRate?: number; // Default 21
  description?: string;
  documentType?: 'FACTURA' | 'NO APLICA';
  invoiceNumber?: string;
  clientName?: string;
  clientDni?: string;
  costCategory?: string;
  metadata?: Record<string, any>;
}

interface SyncResponse {
  message: string;
  processed: number;
  errors: number;
  results: {
    success: string[];
    errors: Array<{
      externalId?: string;
      error: string;
    }>;
  };
}

interface SyncResult {
  success: boolean;
  message: string;
  response?: SyncResponse;
  error?: string;
}

const GSCONTROL_ENDPOINT = 'https://gscontrol.abacusai.app/api/integrations/sync';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 segundo

/**
 * Genera un ID externo único para la transacción
 */
function generateExternalId(type: 'ING' | 'GAS', id: string | number): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  // Usar solo los últimos 8 caracteres del ID para mantener el externalId corto
  const shortId = String(id).slice(-8);
  return `SERVYAUTO-${type}-${date}-${shortId}`;
}

/**
 * Espera un tiempo determinado
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sincroniza transacciones con GSControl
 */
export async function syncToGSControl(
  transactions: Transaction | Transaction[]
): Promise<SyncResult> {
  const apiKey = process.env.GSCONTROL_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ GSCONTROL_API_KEY no configurada - sincronización deshabilitada');
    return {
      success: false,
      message: 'API Key no configurada',
      error: 'GSCONTROL_API_KEY no está definida en las variables de entorno'
    };
  }

  const txArray = Array.isArray(transactions) ? transactions : [transactions];

  let lastError: Error | null = null;
  
  // Intentar con reintentos
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`📤 Sincronizando ${txArray.length} transacción(es) con GSControl (intento ${attempt}/${MAX_RETRIES})...`);

      const response = await fetch(GSCONTROL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactions: txArray }),
      });

      const data = await response.json();

      // Errores de autenticación o validación - NO reintentar
      if (response.status === 401 || response.status === 400) {
        console.error('❌ Error definitivo en sincronización GSControl:', data);
        return {
          success: false,
          message: data.error || 'Error de autenticación o validación',
          error: data.error,
        };
      }

      // Error del servidor - reintentar
      if (response.status === 500) {
        throw new Error(data.error || 'Error del servidor');
      }

      // Success (200)
      if (response.status === 200) {
        const syncResponse = data as SyncResponse;
        
        if (syncResponse.errors > 0) {
          console.warn(`⚠️ Sincronización parcial: ${syncResponse.processed} exitosas, ${syncResponse.errors} con errores`);
          syncResponse.results.errors.forEach(err => {
            console.warn(`  - ${err.externalId}: ${err.error}`);
          });
        } else {
          console.log(`✅ Sincronización exitosa: ${syncResponse.processed} transacciones procesadas`);
        }

        return {
          success: true,
          message: syncResponse.message,
          response: syncResponse,
        };
      }

      // Otro código de estado
      throw new Error(`Estado HTTP inesperado: ${response.status}`);

    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Error en intento ${attempt}/${MAX_RETRIES}:`, error);

      if (attempt < MAX_RETRIES) {
        const waitTime = RETRY_DELAY * attempt;
        console.log(`⏳ Reintentando en ${waitTime}ms...`);
        await delay(waitTime);
      }
    }
  }

  // Si llegamos aquí, todos los reintentos fallaron
  return {
    success: false,
    message: 'Error de sincronización después de múltiples intentos',
    error: lastError?.message || 'Error desconocido',
  };
}

/**
 * Sincroniza una factura (ingreso)
 */
export async function syncFactura(factura: {
  id: string;
  numeroFactura: string;
  fecha: Date;
  total: number;
  iva: number;
  cliente: { nombre: string; dni?: string | null };
  servicios?: Array<{ nombre: string; precio: number }>;
}): Promise<SyncResult> {
  const transaction: Transaction = {
    externalId: generateExternalId('ING', factura.id),
    type: 'INGRESO',
    date: factura.fecha.toISOString(),
    amount: factura.total,
    ivaRate: factura.iva,
    description: factura.servicios?.map(s => s.nombre).join(', ') || 'Servicio de taller',
    documentType: 'FACTURA',
    invoiceNumber: factura.numeroFactura,
    clientName: factura.cliente.nombre,
    clientDni: factura.cliente.dni || undefined,
    metadata: {
      facturaId: factura.id,
      servicios: factura.servicios?.length || 0,
    },
  };

  return syncToGSControl(transaction);
}

/**
 * Sincroniza un ticket (ingreso sin factura)
 */
export async function syncTicket(ticket: {
  id: string;
  fecha: Date;
  total: number;
  estado: string;
  servicios?: Array<{ nombre: string; precio: number }>;
}): Promise<SyncResult> {
  // Solo sincronizar tickets COBRADOS
  if (ticket.estado !== 'COBRADO') {
    return {
      success: false,
      message: 'Ticket no sincronizado - estado no es COBRADO',
    };
  }

  const transaction: Transaction = {
    externalId: generateExternalId('ING', `T${ticket.id}`),
    type: 'INGRESO',
    date: ticket.fecha.toISOString(),
    amount: ticket.total,
    description: ticket.servicios?.map(s => s.nombre).join(', ') || 'Servicio de taller',
    documentType: 'NO APLICA',
    metadata: {
      ticketId: ticket.id,
      servicios: ticket.servicios?.length || 0,
    },
  };

  return syncToGSControl(transaction);
}

/**
 * Sincroniza un gasto
 */
export async function syncGasto(gasto: {
  id: string;
  fecha: Date;
  monto: number;
  concepto: string;
  categoria?: string | null;
  numeroFactura?: string | null;
  proveedor?: string | null;
  tipoImpuesto?: string | null;
}): Promise<SyncResult> {
  const tieneFactura = !!gasto.numeroFactura;
  
  // Calcular IVA rate
  let ivaRate = 21; // default
  if (gasto.tipoImpuesto === 'IVA_10') ivaRate = 10;
  else if (gasto.tipoImpuesto === 'IVA_4') ivaRate = 4;
  else if (gasto.tipoImpuesto === 'SIN_IVA') ivaRate = 0;

  const transaction: Transaction = {
    externalId: generateExternalId('GAS', gasto.id),
    type: 'GASTO',
    date: gasto.fecha.toISOString(),
    amount: -Math.abs(gasto.monto), // GASTOS SIEMPRE NEGATIVOS
    ivaRate: ivaRate,
    description: gasto.concepto,
    documentType: tieneFactura ? 'FACTURA' : 'NO APLICA',
    invoiceNumber: gasto.numeroFactura || undefined,
    costCategory: gasto.categoria || 'OTROS',
    metadata: {
      gastoId: gasto.id,
      proveedor: gasto.proveedor,
    },
  };

  return syncToGSControl(transaction);
}

/**
 * Sincroniza un cierre de caja (múltiples transacciones)
 */
export async function syncCierreCaja(cierre: {
  id: string;
  fecha: Date;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  gastos: number;
  notas?: string | null;
}): Promise<SyncResult> {
  const transactions: Transaction[] = [];

  // Ingresos por método de pago
  if (cierre.efectivo > 0) {
    transactions.push({
      externalId: generateExternalId('ING', `CC${cierre.id}-EFE`),
      type: 'INGRESO',
      date: cierre.fecha.toISOString(),
      amount: cierre.efectivo,
      description: `Cierre de caja - Efectivo`,
      documentType: 'NO APLICA',
      metadata: {
        cierreCajaId: cierre.id,
        metodoPago: 'EFECTIVO',
      },
    });
  }

  if (cierre.tarjeta > 0) {
    transactions.push({
      externalId: generateExternalId('ING', `CC${cierre.id}-TAR`),
      type: 'INGRESO',
      date: cierre.fecha.toISOString(),
      amount: cierre.tarjeta,
      description: `Cierre de caja - Tarjeta`,
      documentType: 'NO APLICA',
      metadata: {
        cierreCajaId: cierre.id,
        metodoPago: 'TARJETA',
      },
    });
  }

  if (cierre.transferencia > 0) {
    transactions.push({
      externalId: generateExternalId('ING', `CC${cierre.id}-TRA`),
      type: 'INGRESO',
      date: cierre.fecha.toISOString(),
      amount: cierre.transferencia,
      description: `Cierre de caja - Transferencia`,
      documentType: 'NO APLICA',
      metadata: {
        cierreCajaId: cierre.id,
        metodoPago: 'TRANSFERENCIA',
      },
    });
  }

  // Gastos del cierre
  if (cierre.gastos > 0) {
    transactions.push({
      externalId: generateExternalId('GAS', `CC${cierre.id}`),
      type: 'GASTO',
      date: cierre.fecha.toISOString(),
      amount: -Math.abs(cierre.gastos), // GASTOS SIEMPRE NEGATIVOS
      description: `Gastos del día - ${cierre.notas || 'Sin detalles'}`,
      documentType: 'NO APLICA',
      costCategory: 'CAJA',
      metadata: {
        cierreCajaId: cierre.id,
      },
    });
  }

  if (transactions.length === 0) {
    return {
      success: false,
      message: 'No hay transacciones para sincronizar en este cierre',
    };
  }

  return syncToGSControl(transactions);
}

/**
 * ========================================
 * ACTUALIZAR TRANSACCIONES EN GSCONTROL
 * ========================================
 */

interface UpdateResponse {
  message: string;
  updated: number;
  errors: number;
  results: {
    updated: string[];
    errors: Array<{
      externalId?: string;
      error: string;
    }>;
  };
}

/**
 * Actualiza transacciones en GSControl (método PUT)
 */
export async function updateInGSControl(
  transactions: Partial<Transaction> & { externalId: string }[]
): Promise<SyncResult> {
  const apiKey = process.env.GSCONTROL_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ GSCONTROL_API_KEY no configurada - actualización deshabilitada');
    return {
      success: false,
      message: 'API Key no configurada',
      error: 'GSCONTROL_API_KEY no está definida',
    };
  }

  try {
    console.log(`📝 Actualizando ${transactions.length} transacción(es) en GSControl...`);

    const response = await fetch(GSCONTROL_ENDPOINT, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transactions }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error al actualizar en GSControl:', data);
      return {
        success: false,
        message: data.error || 'Error al actualizar',
        error: data.error,
      };
    }

    const updateResponse = data as UpdateResponse;

    if (updateResponse.errors > 0) {
      console.warn(`⚠️ Actualización parcial: ${updateResponse.updated} exitosas, ${updateResponse.errors} con errores`);
      updateResponse.results.errors.forEach(err => {
        console.warn(`  - ${err.externalId}: ${err.error}`);
      });
    } else {
      console.log(`✅ Actualización exitosa: ${updateResponse.updated} transacciones actualizadas`);
    }

    return {
      success: true,
      message: updateResponse.message,
      response: updateResponse as any,
    };
  } catch (error) {
    console.error('❌ Error al actualizar en GSControl:', error);
    return {
      success: false,
      message: 'Error de actualización',
      error: (error as Error).message,
    };
  }
}

/**
 * ========================================
 * ELIMINAR TRANSACCIONES EN GSCONTROL
 * ========================================
 */

interface DeleteResponse {
  message: string;
  deleted: number;
  errors: number;
  results: {
    deleted: string[];
    errors: Array<{
      externalId: string;
      error: string;
    }>;
  };
}

/**
 * Elimina transacciones en GSControl (método DELETE)
 */
export async function deleteFromGSControl(
  externalIds: string[]
): Promise<SyncResult> {
  const apiKey = process.env.GSCONTROL_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ GSCONTROL_API_KEY no configurada - eliminación deshabilitada');
    return {
      success: false,
      message: 'API Key no configurada',
      error: 'GSCONTROL_API_KEY no está definida',
    };
  }

  try {
    console.log(`🗑️ Eliminando ${externalIds.length} transacción(es) en GSControl...`);

    const response = await fetch(GSCONTROL_ENDPOINT, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ externalIds }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error al eliminar en GSControl:', data);
      return {
        success: false,
        message: data.error || 'Error al eliminar',
        error: data.error,
      };
    }

    const deleteResponse = data as DeleteResponse;

    if (deleteResponse.errors > 0) {
      console.warn(`⚠️ Eliminación parcial: ${deleteResponse.deleted} exitosas, ${deleteResponse.errors} con errores`);
      deleteResponse.results.errors.forEach(err => {
        console.warn(`  - ${err.externalId}: ${err.error}`);
      });
    } else {
      console.log(`✅ Eliminación exitosa: ${deleteResponse.deleted} transacciones eliminadas`);
    }

    return {
      success: true,
      message: deleteResponse.message,
      response: deleteResponse as any,
    };
  } catch (error) {
    console.error('❌ Error al eliminar en GSControl:', error);
    return {
      success: false,
      message: 'Error de eliminación',
      error: (error as Error).message,
    };
  }
}

/**
 * Función auxiliar: Genera el externalId para un registro existente
 * (para actualizar/eliminar registros que ya existen en GSControl)
 * 
 * IMPORTANTE: Usa la fecha de creación del registro, NO la fecha actual
 */
export function getExternalIdFromDate(type: 'FAC' | 'TICK' | 'GAS' | 'CIE', id: string, createdDate: Date, suffix?: string): string {
  const date = createdDate.toISOString().split('T')[0].replace(/-/g, '');
  const shortId = String(id).slice(-8);
  const fullId = suffix ? `${shortId}-${suffix}` : shortId;
  return `SERVYAUTO-${type}-${date}-${fullId}`;
}
