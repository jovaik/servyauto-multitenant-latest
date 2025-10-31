
/**
 * ⚠️ TAREA 2: SINCRONIZACIÓN PERIÓDICA COMPLETA
 * ACTUALIZADO: 31 de octubre de 2025
 * Este código debe ejecutarse EN EL SERVIDOR BACKEND
 * NO en el navegador del usuario
 */

const { PrismaClient } = require('@prisma/client')
const fetch = require('node-fetch')

const prisma = new PrismaClient()

const GSCONTROL_API_KEY = 'gs_dff763d23624a595fe081d0359066facc50968fe407ef239236c8f3ee5750f0a'
const GSCONTROL_PULL_ENDPOINT = 'https://gscontrol.abacusai.app/api/integrations/pull'

/**
 * Mapea las categorías de gasto de ServyAuto a las categorías válidas de GSControl
 * CATEGORÍAS VÁLIDAS: ALQUILER, AUTONOMOS, GESTORIA, COMBUSTIBLE, 
 * GASTOS FIJOS, TALLERES, REPUESTOS, SEGUROS, OTROS GASTOS
 */
function mapearCategoriaGasto(tipoGasto) {
  const categoria = tipoGasto.toUpperCase().trim()
  
  // Mapeo directo - "GASTOS FIJOS" con espacio, no guion bajo
  const mapeo = {
    'ALQUILER': 'ALQUILER',
    'AUTONOMO': 'AUTONOMOS',
    'AUTONOMOS': 'AUTONOMOS',
    'GESTORIA': 'GESTORIA',
    'GESTORÍA': 'GESTORIA',
    'COMBUSTIBLE': 'COMBUSTIBLE',
    'GASOLINA': 'COMBUSTIBLE',
    'DIESEL': 'COMBUSTIBLE',
    'GASTOS FIJOS': 'GASTOS FIJOS',
    'GASTOS_FIJOS': 'GASTOS FIJOS',
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
  return 'OTROS GASTOS'
}

/**
 * Función actualizada con nuevos campos según PDF 31/10/2025
 */
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

    // Formatear facturas como INGRESOS - CON NUEVOS CAMPOS
    for (const factura of todasLasFacturas) {
      const descripcionFactura = `${factura.tipo}: ${factura.numero} - ${factura.cliente.nombre} ${factura.cliente.apellido || ''}`
      const clienteNombreCompleto = `${factura.cliente.nombre} ${factura.cliente.apellido || ''}`.trim()
      
      const payload = {
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

// EJECUTAR CADA 5 MINUTOS
setInterval(sincronizacionCompletaGSControl, 5 * 60 * 1000)

// EJECUTAR INMEDIATAMENTE al iniciar el servidor
sincronizacionCompletaGSControl()
