/**
 * Script de sincronización histórica a autodetail4u.
 * Itera todas las citas con estado COMPLETADA o PENDIENTE y las envía al endpoint de importación.
 * Usa lotes de 5 con delay entre cada uno para no saturar.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const AD4U_URL = process.env.AD4U_SYNC_URL;
const AD4U_API_KEY = process.env.AD4U_SYNC_API_KEY;
const AD4U_TENANT = process.env.AD4U_TENANT_SLUG || 'quick-shine';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function sendToAD4U(payload) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(AD4U_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AD4U_API_KEY,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await res.text();
    if (res.ok) {
      return { ok: true, status: res.status, body: text };
    } else {
      return { ok: false, status: res.status, body: text };
    }
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, status: 0, body: err.message };
  }
}

async function main() {
  if (!AD4U_URL || !AD4U_API_KEY) {
    console.error('❌ Falta AD4U_SYNC_URL o AD4U_SYNC_API_KEY en .env');
    process.exit(1);
  }

  console.log('=== SYNC HISTÓRICO A AUTODETAIL4U ===');
  console.log('URL:', AD4U_URL);
  console.log('Tenant:', AD4U_TENANT);
  console.log('');

  // Traer todas las citas (no canceladas) con cliente, vehículo y servicios
  const citas = await prisma.cita.findMany({
    where: {
      estado: { in: ['COMPLETADA', 'PENDIENTE', 'EN_PROCESO'] },
    },
    include: {
      cliente: true,
      vehiculo: true,
      cita_servicios: {
        include: {
          servicios: true,
        },
      },
    },
    orderBy: { fecha: 'asc' },
  });

  console.log(`Total citas a sincronizar: ${citas.length}`);
  console.log('');

  let ok = 0;
  let fail = 0;
  let skip = 0;

  for (let i = 0; i < citas.length; i++) {
    const cita = citas[i];

    // Validar datos mínimos
    if (!cita.cliente || !cita.vehiculo) {
      console.log(`[${i + 1}/${citas.length}] ⏭️ SKIP (sin cliente/vehículo): cita ${cita.id}`);
      skip++;
      continue;
    }

    // Formatear fecha
    const fechaStr = cita.fecha instanceof Date
      ? cita.fecha.toISOString().split('T')[0]
      : new Date(cita.fecha).toISOString().split('T')[0];

    // Extraer servicios
    const servicios = (cita.cita_servicios || [])
      .map(cs => cs.servicios?.nombre)
      .filter(Boolean);

    const payload = {
      nombre: cita.cliente.nombre || '',
      apellido: cita.cliente.apellido || '',
      telefono: cita.cliente.telefono || '',
      email: cita.cliente.email || '',
      fecha: fechaStr,
      hora: cita.horaInicio || '',
      servicios: servicios,
      vehiculoMarca: cita.vehiculo.marca || '',
      vehiculoModelo: cita.vehiculo.modelo || '',
      matricula: (cita.vehiculo.matricula || '').toUpperCase(),
      localId: cita.localId || undefined,
      tenantSlug: AD4U_TENANT,
    };

    const result = await sendToAD4U(payload);

    if (result.ok) {
      ok++;
      console.log(`[${i + 1}/${citas.length}] ✅ ${fechaStr} ${cita.horaInicio} | ${cita.cliente.nombre} | ${cita.vehiculo.matricula} | ${servicios.join(', ') || 'sin servicio'}`);
    } else {
      fail++;
      console.log(`[${i + 1}/${citas.length}] ❌ ${fechaStr} ${cita.horaInicio} | ${cita.cliente.nombre} | HTTP ${result.status}: ${result.body.substring(0, 100)}`);
    }

    // Delay cada 5 requests para no saturar
    if ((i + 1) % 5 === 0) {
      await sleep(500);
    }
  }

  console.log('');
  console.log('=== RESUMEN ===');
  console.log(`✅ Enviadas OK: ${ok}`);
  console.log(`❌ Fallidas: ${fail}`);
  console.log(`⏭️ Skipped: ${skip}`);
  console.log(`📊 Total procesadas: ${ok + fail + skip} / ${citas.length}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
