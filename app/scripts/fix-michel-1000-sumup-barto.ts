import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
const p = new PrismaClient();
(async () => {
  const citaId = 'cmv5dh5y4001jlg07bb13im1h'; // MICHEL - Lexus 2260
  const bartoUserId = 'cmuhfckti000imu081cic5qs1';
  const bartoTpv = 'TPV BARTO';

  const antes = await p.pagoParcial.findMany({ where: { citaId }, orderBy: { fecha: 'asc' } });
  const cita = await p.cita.findUnique({ where: { id: citaId }, include: { facturas: true } });
  const backup = { citaId, total: cita?.total, factura: cita?.facturas, pagosAntes: antes };
  const bpath = `./scripts/michel-1000-before-${Date.now()}.json`;
  fs.writeFileSync(bpath, JSON.stringify(backup, null, 2));
  console.log('Backup escrito en', bpath);

  // Idempotencia: si ya existe un pago de 1000 TPV_SUMUP para esta cita, no duplicar.
  const yaExiste = antes.find(x => x.importe === 1000 && x.metodoPago === 'TPV_SUMUP');
  if (yaExiste) {
    console.log('Ya existe el pago de 1000 TPV_SUMUP (', yaExiste.id, ') -> no se duplica. Actualizo cuenta.');
    const upd = await p.pagoParcial.update({ where: { id: yaExiste.id }, data: { tpvUserId: bartoUserId, tpvNombre: bartoTpv, concepto: 'SEÑAL A CUENTA - SUMUP BARTO' } });
    console.log('Actualizado', upd.id);
  } else {
    const nuevo = await p.pagoParcial.create({
      data: {
        citaId,
        importe: 1000,
        metodoPago: 'TPV_SUMUP',
        fecha: new Date('2026-10-12T12:00:00'),
        concepto: 'SEÑAL A CUENTA - SUMUP BARTO',
        tpvUserId: bartoUserId,
        tpvNombre: bartoTpv,
        creadoPorId: null,
        creadoPorNombre: 'SISTEMA',
      },
    });
    console.log('Creado pago parcial', nuevo.id, '1000 TPV_SUMUP -> TPV BARTO');
  }

  const despues = await p.pagoParcial.findMany({ where: { citaId }, orderBy: { fecha: 'asc' } });
  const sum = despues.reduce((s, x) => s + x.importe, 0);
  console.log('=== PAGOS DESPUES ===');
  for (const x of despues) console.log(x.importe, x.metodoPago, x.tpvNombre ?? '-', x.fecha.toISOString().slice(0,10), x.concepto);
  console.log('Suma pagos:', sum, '| total cita:', cita?.total);
  await p.$disconnect();
})();
