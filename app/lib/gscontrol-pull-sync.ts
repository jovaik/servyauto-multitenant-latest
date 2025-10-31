
/**
 * ⚠️ TAREA 2: SINCRONIZACIÓN PERIÓDICA COMPLETA
 * ACTUALIZADO: 31 de octubre de 2025
 * Este código debe ejecutarse EN EL SERVIDOR BACKEND
 * NO en el navegador del usuario
 */

import { prisma } from './db'
import { mapearCategoriaGasto } from './gscontrol-sync'

const GSCONTROL_API_KEY = 'gs_dff763d23624a595fe081d0359066facc50968fe407ef239236c8f3ee5750f0a'
const GSCONTROL_PULL_ENDPOINT = 'https://gscontrol.abacusai.app/api/integrations/pull'

/**
 * Función actualizada con nuevos campos según PDF 31/10/2025
 */
export async function sincronizacionCompletaGSControl() {
  try {
    console.log('🔄 Iniciando sincronización completa con GS Control...')
    
    // 1. OBTENER TODAS las transacciones de ServyAuto
    // Facturas (INGRESOS)
    const todasLasFacturas = await prisma.factura.findMany({
      where: {
        createdAt: {
          gte: new Date('2025-01-01')
        }
      },
      include: {
        cliente: true
      }
    })

    // Gastos (GASTOS)
    const todosLosGastos = await prisma.gasto.findMany({
      where: {
        fecha: {
          gte: new Date('2025-01-01')
        }
      }
    })

    // 2. FORMATEAR al formato de GS Control
    const transaccionesFormateadas = []

    // Formatear facturas como INGRESOS - CON NUEVOS CAMPOS
    for (const factura of todasLasFacturas) {
      const descripcionFactura = `${factura.tipo}: ${factura.numero} - ${factura.cliente.nombre} ${factura.cliente.apellido || ''}`
      const clienteNombreCompleto = `${factura.cliente.nombre} ${factura.cliente.apellido || ''}`.trim()
      
      const payload: any = {
        externalId: factura.id.toString(),
        type: "INGRESO",
        date: factura.createdAt.toISOString(),
        amount: factura.total,
        description: descripcionFactura,
        ivaRate: 21,
        // ✅ NUEVOS CAMPOS SEGÚN PDF 31/10/2025
        documentType: factura.tipo // "FACTURA" o "TICKET"
      }

      // Si es FACTURA, agregar número de factura y datos de cliente
      if (factura.tipo === 'FACTURA') {
        payload.invoiceNumber = factura.numero
        if (clienteNombreCompleto) {
          payload.clientName = clienteNombreCompleto
        }
        if (factura.cliente.documento) {
          payload.clientDni = factura.cliente.documento
        }
      }

      transaccionesFormateadas.push(payload)
    }

    // Formatear gastos como GASTOS - CON NUEVO CAMPO costCategory
    for (const gasto of todosLosGastos) {
      const descripcionGasto = `${gasto.concepto}${gasto.proveedor ? ` - ${gasto.proveedor}` : ''}`
      const categoriaGSControl = mapearCategoriaGasto(gasto.tipoGasto)
      
      transaccionesFormateadas.push({
        externalId: gasto.id.toString(),
        type: "GASTO",
        date: gasto.fecha.toISOString(),
        amount: gasto.importe,
        description: descripcionGasto,
        ivaRate: 21,
        // ✅ NUEVO CAMPO SEGÚN PDF 31/10/2025
        costCategory: categoriaGSControl
      })
    }

    console.log(`📊 Total transacciones a sincronizar: ${transaccionesFormateadas.length}`)
    console.log(`   💰 Facturas: ${todasLasFacturas.length}`)
    console.log(`   💸 Gastos: ${todosLosGastos.length}`)

    // 3. ENVIAR TODO a GS Control
    const response = await fetch(GSCONTROL_PULL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GSCONTROL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactions: transaccionesFormateadas
      })
    })

    if (!response.ok) {
      console.error('❌ Error en sincronización completa:', await response.text())
    } else {
      const resultado = await response.json()
      console.log('✅ Sincronización completa exitosa:', resultado)
    }
  } catch (error) {
    console.error('❌ Error fatal en sincronización:', error)
  }
}
