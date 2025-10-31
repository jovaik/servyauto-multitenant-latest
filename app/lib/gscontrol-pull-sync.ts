
/**
 * Sistema de sincronización PULL bidireccional con GSControl
 * GSControl consultará periódicamente a ServyAuto para mantener datos sincronizados
 */

import { prisma } from './db'

const GSCONTROL_API_KEY = process.env.GSCONTROL_API_KEY || ''
const GSCONTROL_PULL_ENDPOINT = 'https://gscontrol.abacusai.app/api/integrations/pull'

interface TransactionFormatted {
  externalId: string
  type: 'INGRESO' | 'GASTO'
  date: string
  amount: number
  description: string
  ivaRate: number
  metadata?: {
    numeroFactura?: string
    cliente?: string
    metodoPago?: string
    tipo?: string
    categoria?: string
    proveedor?: string
  }
}

/**
 * Obtiene todas las transacciones del año actual y las envía a GSControl
 */
export async function syncAllTransactionsWithGSControl(): Promise<void> {
  try {
    console.log('🔄 [PULL SYNC] Iniciando sincronización con GSControl...')
    
    const currentYear = new Date().getFullYear()
    const startOfYear = new Date(currentYear, 0, 1, 0, 0, 0, 0)
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999)

    // 1. OBTENER TODAS LAS FACTURAS DEL AÑO
    const facturas = await prisma.factura.findMany({
      where: {
        createdAt: {
          gte: startOfYear,
          lte: endOfYear
        }
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            apellido: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // 2. OBTENER TODOS LOS GASTOS DEL AÑO
    const gastos = await prisma.gasto.findMany({
      where: {
        fecha: {
          gte: startOfYear,
          lte: endOfYear
        }
      },
      orderBy: {
        fecha: 'asc'
      }
    })

    // 3. FORMATEAR TRANSACCIONES SEGÚN ESQUEMA DE GSCONTROL
    const transactions: TransactionFormatted[] = []

    // Formatear FACTURAS como INGRESOS
    for (const factura of facturas) {
      const clienteNombre = factura.cliente 
        ? `${factura.cliente.nombre} ${factura.cliente.apellido || ''}`.trim()
        : 'Cliente sin nombre'

      transactions.push({
        externalId: factura.id,
        type: 'INGRESO',
        date: factura.createdAt.toISOString(),
        amount: factura.total,
        description: `${factura.tipo}: ${factura.numero} - ${clienteNombre}`,
        ivaRate: 21, // IVA estándar en España
        metadata: {
          numeroFactura: factura.numero,
          cliente: clienteNombre,
          metodoPago: factura.metodoPago || undefined,
          tipo: factura.tipo
        }
      })
    }

    // Formatear GASTOS como GASTOS
    for (const gasto of gastos) {
      transactions.push({
        externalId: gasto.id,
        type: 'GASTO',
        date: gasto.fecha.toISOString(),
        amount: gasto.importe,
        description: `${gasto.concepto}${gasto.proveedor ? ` - ${gasto.proveedor}` : ''}`,
        ivaRate: gasto.iva || 21,
        metadata: {
          numeroFactura: gasto.numeroFactura || undefined,
          categoria: gasto.tipoGasto,
          proveedor: gasto.proveedor || undefined,
          metodoPago: gasto.metodoPago || undefined,
          tipo: gasto.tipo
        }
      })
    }

    console.log(`📊 [PULL SYNC] Total transacciones a sincronizar: ${transactions.length}`)
    console.log(`   💰 Facturas/Tickets: ${facturas.length}`)
    console.log(`   💸 Gastos: ${gastos.length}`)

    // 4. ENVIAR A GSCONTROL
    if (!GSCONTROL_API_KEY) {
      console.warn('⚠️  [PULL SYNC] No se encontró GSCONTROL_API_KEY, saltando sincronización')
      return
    }

    const response = await fetch(GSCONTROL_PULL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GSCONTROL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        transactions,
        source: 'ServyAuto',
        syncTimestamp: new Date().toISOString()
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`GSControl respondió con error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ [PULL SYNC] Sincronización completada exitosamente')
    console.log(`   📥 Resultado:`, result)

  } catch (error) {
    console.error('❌ [PULL SYNC] Error en sincronización:', error)
    throw error
  }
}

/**
 * Función para ejecutar la sincronización manualmente
 */
export async function manualPullSync(): Promise<{ success: boolean; message: string; stats?: any }> {
  try {
    await syncAllTransactionsWithGSControl()
    return {
      success: true,
      message: 'Sincronización PULL completada exitosamente'
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}
