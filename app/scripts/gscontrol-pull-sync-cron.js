
/**
 * ⚠️ CÓDIGO EXACTO DEL PDF - TAREA 2
 * Este código debe ejecutarse EN EL SERVIDOR BACKEND
 * NO en el navegador del usuario
 */

const { PrismaClient } = require('@prisma/client')
const fetch = require('node-fetch')

const prisma = new PrismaClient()

const GSCONTROL_API_KEY = 'gs_dff763d23624a595fe081d0359066facc50968fe407ef239236c8f3ee5750f0a'
const GSCONTROL_PULL_ENDPOINT = 'https://gscontrol.abacusai.app/api/integrations/pull'

async function sincronizacionCompletaGSControl() {
  try {
    console.log('🔄 Iniciando sincronización completa con GS Control...')
    
    // 1. OBTENER TODAS las transacciones de ServyAuto
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

    const todosLosGastos = await prisma.gasto.findMany({
      where: {
        fecha: {
          gte: new Date('2025-01-01')
        }
      }
    })
    
    // 2. FORMATEAR al formato de GS Control
    const transaccionesFormateadas = []

    // Formatear facturas como INGRESOS
    for (const factura of todasLasFacturas) {
      const descripcionFactura = `${factura.tipo}: ${factura.numero} - ${factura.cliente.nombre} ${factura.cliente.apellido || ''}`
      transaccionesFormateadas.push({
        externalId: factura.id.toString(),
        type: "INGRESO",
        date: factura.createdAt.toISOString(),
        amount: factura.total,
        description: descripcionFactura,
        ivaRate: 21
      })
    }

    // Formatear gastos como GASTOS
    for (const gasto of todosLosGastos) {
      const descripcionGasto = `${gasto.concepto}${gasto.proveedor ? ` - ${gasto.proveedor}` : ''}`
      transaccionesFormateadas.push({
        externalId: gasto.id.toString(),
        type: "GASTO",
        date: gasto.fecha.toISOString(),
        amount: gasto.importe,
        description: descripcionGasto,
        ivaRate: 21
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

// EJECUTAR CADA 5 MINUTOS
setInterval(sincronizacionCompletaGSControl, 5 * 60 * 1000)

// EJECUTAR INMEDIATAMENTE al iniciar el servidor
sincronizacionCompletaGSControl()
