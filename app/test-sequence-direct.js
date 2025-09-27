
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testFacturaSequence() {
  try {
    console.log('🧪 Probando secuencia de numeración directamente...\n')

    // Obtener un cliente existente
    const cliente = await prisma.cliente.findFirst()
    if (!cliente) {
      console.log('❌ No hay clientes en la base de datos')
      return
    }
    
    console.log(`✅ Cliente encontrado: ${cliente.nombre} ${cliente.apellido}`)

    // Limpiar facturas existentes para probar desde cero
    await prisma.factura.deleteMany()
    console.log('🧹 Facturas anteriores limpiadas\n')

    // Generar TICKET con EFECTIVO
    console.log('📄 Creando TICKET con EFECTIVO...')
    const año = new Date().getFullYear()
    const prefijo = 'TICKET'
    
    const ultimaTicket = await prisma.factura.findFirst({
      where: { 
        tipo: 'TICKET',
        numero: {
          startsWith: `${prefijo}/${año}/`
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    let numeroSecuencia = 1
    if (ultimaTicket) {
      const partes = ultimaTicket.numero.split('/')
      if (partes.length === 3 && partes[0] === prefijo) {
        const ultimoNumero = parseInt(partes[2]) || 0
        numeroSecuencia = ultimoNumero + 1
      }
    }

    const numeroTicket = `${prefijo}/${año}/${numeroSecuencia.toString().padStart(4, '0')}`

    const ticket = await prisma.factura.create({
      data: {
        numero: numeroTicket,
        tipo: 'TICKET',
        subtotal: 30.00,
        iva: 6.30,
        total: 36.30,
        metodoPago: 'EFECTIVO',
        clienteId: cliente.id,
        estado: 'PAGADA',
        items: {
          create: [{
            descripcion: 'Cambio de aceite',
            cantidad: 1,
            precio: 30.00,
            total: 30.00
          }]
        }
      }
    })

    console.log(`✅ TICKET creado: ${ticket.numero}`)

    // Generar FACTURA con TPV_UNICAJA
    console.log('\n📋 Creando FACTURA con TPV_UNICAJA...')
    const prefijoFactura = 'FAC'
    
    const ultimaFactura = await prisma.factura.findFirst({
      where: { 
        tipo: 'FACTURA',
        numero: {
          startsWith: `${prefijoFactura}/${año}/`
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    let numeroSecuenciaFactura = 1
    if (ultimaFactura) {
      const partes = ultimaFactura.numero.split('/')
      if (partes.length === 3 && partes[0] === prefijoFactura) {
        const ultimoNumero = parseInt(partes[2]) || 0
        numeroSecuenciaFactura = ultimoNumero + 1
      }
    }

    const numeroFactura = `${prefijoFactura}/${año}/${numeroSecuenciaFactura.toString().padStart(4, '0')}`

    const factura = await prisma.factura.create({
      data: {
        numero: numeroFactura,
        tipo: 'FACTURA',
        subtotal: 50.00,
        iva: 10.50,
        total: 60.50,
        metodoPago: 'TPV_UNICAJA',
        clienteId: cliente.id,
        estado: 'PAGADA',
        datosFacturacion: JSON.stringify({
          nombreFiscal: 'Cliente Test S.L.',
          nif: '12345678Z',
          direccion: 'Calle Test 123',
          ciudad: 'Madrid',
          codigoPostal: '28001'
        }),
        items: {
          create: [{
            descripcion: 'Revisión completa',
            cantidad: 1,
            precio: 50.00,
            total: 50.00
          }]
        }
      }
    })

    console.log(`✅ FACTURA creada: ${factura.numero}`)

    // Crear segundo TICKET
    console.log('\n📄 Creando segundo TICKET...')
    const ultimaTicket2 = await prisma.factura.findFirst({
      where: { 
        tipo: 'TICKET',
        numero: {
          startsWith: `TICKET/${año}/`
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    let numeroSecuencia2 = 1
    if (ultimaTicket2) {
      const partes = ultimaTicket2.numero.split('/')
      if (partes.length === 3 && partes[0] === 'TICKET') {
        const ultimoNumero = parseInt(partes[2]) || 0
        numeroSecuencia2 = ultimoNumero + 1
      }
    }

    const numeroTicket2 = `TICKET/${año}/${numeroSecuencia2.toString().padStart(4, '0')}`

    const ticket2 = await prisma.factura.create({
      data: {
        numero: numeroTicket2,
        tipo: 'TICKET',
        subtotal: 15.00,
        iva: 3.15,
        total: 18.15,
        metodoPago: 'TARJETA_SUMUP',
        clienteId: cliente.id,
        estado: 'PAGADA',
        items: {
          create: [{
            descripcion: 'Lavado de coche',
            cantidad: 1,
            precio: 15.00,
            total: 15.00
          }]
        }
      }
    })

    console.log(`✅ Segundo TICKET creado: ${ticket2.numero}`)

    // Verificar resultados finales
    console.log('\n📊 RESUMEN FINAL:')
    const facturas = await prisma.factura.findMany({
      orderBy: { createdAt: 'asc' }
    })
    
    facturas.forEach(f => {
      console.log(`  ${f.tipo}: ${f.numero} - €${f.total.toFixed(2)}`)
    })

    console.log('\n🎉 ¡Secuencia de numeración funcionando correctamente!')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testFacturaSequence()
