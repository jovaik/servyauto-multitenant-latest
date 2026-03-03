import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function repararFacturasMigradas() {
  console.log('=== REPARACIÓN DE FACTURAS PARA CITAS MIGRADAS ===\n')
  
  // 1. Buscar citas COMPLETADAS que NO tienen factura asociada
  const citasSinFactura = await prisma.cita.findMany({
    where: {
      estado: 'COMPLETADA',
      total: { not: null },
      metodoPago: { not: null },
      facturas: null // No tienen factura asociada
    },
    include: {
      cliente: true,
      vehiculo: true,
      cita_servicios: {
        include: {
          servicios: true
        }
      },
      local: true
    },
    orderBy: {
      fecha: 'desc'
    }
  })
  
  console.log(`📋 Encontradas ${citasSinFactura.length} citas COMPLETADAS sin factura/ticket\n`)
  
  if (citasSinFactura.length === 0) {
    console.log('✅ No hay citas que reparar.')
    return
  }
  
  // Mostrar detalle
  for (const cita of citasSinFactura) {
    console.log(`- ${cita.vehiculo?.matricula || 'Sin matrícula'} | ${cita.cliente.nombre} ${cita.cliente.apellido || ''} | ${cita.metodoPago} | €${cita.total} | Local: ${cita.local?.nombre || 'Sin local'}`)
  }
  
  console.log('\n🔧 Generando documentos...\n')
  
  let ticketsCreados = 0
  let facturasCreadas = 0
  let errores = 0
  
  for (const cita of citasSinFactura) {
    try {
      // Determinar tipo según método de pago
      // EFECTIVO o TPV_SUMUP → TICKET
      // TPV_UNICAJA → FACTURA
      const esTicket = cita.metodoPago === 'EFECTIVO' || cita.metodoPago === 'TPV_SUMUP'
      const tipoDocumento = esTicket ? 'TICKET' : 'FACTURA'
      const prefijo = esTicket ? 'TICK' : 'FAC'
      
      // Generar número de documento
      const año = new Date(cita.fecha).getFullYear()
      
      const ultimoDocumento = await prisma.factura.findFirst({
        where: { 
          numero: {
            startsWith: `${prefijo}-${año}-`
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      let numeroSecuencia = 1
      if (ultimoDocumento) {
        const partes = ultimoDocumento.numero.split('-')
        if (partes.length === 3 && partes[0] === prefijo) {
          const ultimoNumero = parseInt(partes[2]) || 0
          numeroSecuencia = ultimoNumero + 1
        }
      }

      const numeroDocumento = `${prefijo}-${año}-${numeroSecuencia.toString().padStart(4, '0')}`
      
      // Calcular subtotal e IVA
      const total = cita.total || 0
      const subtotal = total / 1.21
      const iva = total - subtotal
      
      // Crear el documento
      const factura = await prisma.factura.create({
        data: {
          numero: numeroDocumento,
          tipo: tipoDocumento,
          fecha: cita.fecha,
          estado: 'PAGADA',
          subtotal: Math.round(subtotal * 100) / 100,
          iva: Math.round(iva * 100) / 100,
          total: total,
          metodoPago: cita.metodoPago,
          clienteId: cita.clienteId,
          citaId: cita.id,
          localId: cita.localId // Importante: asignar el mismo local que la cita
        }
      })
      
      // Crear los items de la factura
      if (cita.cita_servicios && cita.cita_servicios.length > 0) {
        const facturaItems = cita.cita_servicios.map((cs: any, index: number) => ({
          id: `${factura.id}_item_${index}`,
          facturaId: factura.id,
          descripcion: cs.servicios.nombre,
          cantidad: 1,
          precio: cs.servicios.precio,
          total: cs.servicios.precio,
        }))
        
        await prisma.factura_items.createMany({
          data: facturaItems
        })
      }
      
      if (esTicket) {
        ticketsCreados++
      } else {
        facturasCreadas++
      }
      
      console.log(`✅ ${tipoDocumento} ${numeroDocumento} creado para ${cita.vehiculo?.matricula || cita.cliente.nombre}`)
      
    } catch (error: any) {
      errores++
      console.error(`❌ Error con cita ${cita.id}: ${error.message}`)
    }
  }
  
  console.log('\n=== RESUMEN ===')
  console.log(`📄 Tickets creados: ${ticketsCreados}`)
  console.log(`📄 Facturas creadas: ${facturasCreadas}`)
  console.log(`❌ Errores: ${errores}`)
}

repararFacturasMigradas()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
