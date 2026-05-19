const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const AD4U_URL = 'https://app.autodetail4u.com/api/import/reservas'
const AD4U_API_KEY = 'ad4u-sync-2026-S9xK2mP7vL4nQ8wR'
const AD4U_TENANT = 'quick-shine'

async function main() {
  // Últimas 5 semanas
  const desde = new Date()
  desde.setDate(desde.getDate() - 35)
  
  console.log(`\n📅 Buscando citas desde ${desde.toISOString().split('T')[0]} hasta hoy...\n`)

  const citas = await prisma.cita.findMany({
    where: {
      fecha: { gte: desde },
      estado: { in: ['COMPLETADA', 'PENDIENTE', 'EN_PROCESO'] }
    },
    include: {
      cliente: true,
      vehiculo: true,
      cita_servicios: {
        include: { servicios: true }
      }
    },
    orderBy: { fecha: 'asc' }
  })

  console.log(`✅ Encontradas ${citas.length} citas\n`)

  let ok = 0, fail = 0, skip = 0

  for (const cita of citas) {
    if (!cita.cliente || !cita.vehiculo) {
      console.log(`⏭️  Cita ${cita.id.substring(0,8)} sin cliente/vehículo — skip`)
      skip++
      continue
    }

    const payload = {
      nombre: cita.cliente.nombre || '',
      apellido: cita.cliente.apellido || '',
      telefono: cita.cliente.telefono || '',
      email: cita.cliente.email || '',
      fecha: cita.fecha.toISOString().split('T')[0],
      hora: cita.horaInicio || '10:00',
      servicios: (cita.cita_servicios || []).map(cs => cs.servicios?.nombre).filter(Boolean),
      vehiculoMarca: cita.vehiculo.marca || '',
      vehiculoModelo: cita.vehiculo.modelo || '',
      matricula: (cita.vehiculo.matricula || '').toUpperCase(),
      tenantSlug: AD4U_TENANT
    }

    // Validar campos requeridos
    if (!payload.telefono || !payload.matricula || !payload.vehiculoMarca) {
      console.log(`⏭️  Cita ${cita.id.substring(0,8)} datos incompletos (tel:${payload.telefono} mat:${payload.matricula}) — skip`)
      skip++
      continue
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)

      const res = await fetch(AD4U_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': AD4U_API_KEY
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (res.ok) {
        const result = await res.json().catch(() => ({}))
        console.log(`✅ ${payload.fecha} ${payload.hora} | ${payload.nombre} | ${payload.matricula} | ${payload.servicios.join(', ') || 'sin servicio'} → OK`)
        ok++
      } else {
        const errText = await res.text().catch(() => '')
        console.log(`❌ ${payload.fecha} ${payload.hora} | ${payload.nombre} | ${payload.matricula} → HTTP ${res.status}: ${errText.substring(0,100)}`)
        fail++
      }
    } catch (err) {
      console.log(`❌ ${payload.fecha} ${payload.hora} | ${payload.nombre} | ${payload.matricula} → ${err.message}`)
      fail++
    }

    // Pequeña pausa para no saturar
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n${'='.repeat(50)}`)
  console.log(`📊 RESUMEN:`)
  console.log(`   ✅ Enviadas OK: ${ok}`)
  console.log(`   ❌ Fallidas: ${fail}`)
  console.log(`   ⏭️  Saltadas: ${skip}`)
  console.log(`   📋 Total citas: ${citas.length}`)
  console.log(`${'='.repeat(50)}\n`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
