import { prisma } from '../lib/db'
import { encode } from 'next-auth/jwt'
import assert from 'node:assert/strict'

async function main() {
  const localId = 'cmm9arii40000on1r1znffzhv'
  const user = await prisma.user.findFirstOrThrow({ where: { role: 'SUPER_ADMIN' }, select: { id: true, email: true, role: true } })
  const token = await encode({ token: { sub: user.id, id: user.id, email: user.email, role: user.role }, secret: process.env.NEXTAUTH_SECRET! })
  const headers = { cookie: 'servyauto.session-token=' + token, 'x-selected-local-id': localId }
  const get = async (desde: string, hasta: string, local = localId) => {
    const params = new URLSearchParams({ desde, hasta })
    if (local) params.set('localId', local)
    const r = await fetch('http://localhost:3000/api/liquidaciones?' + params, { headers })
    assert.equal(r.status, 200)
    return r.json()
  }
  const configured = await prisma.colaborador.findMany({ where: { localId, activo: true } })
  for (const [desde, hasta] of [['2026-09-16', '2026-10-11'], ['2026-10-12', '2026-10-15'], ['2099-01-01', '2099-01-02']]) {
    const d = await get(desde, hasta)
    const expected = Math.round(d.resumen.netoLocal / 3 * 100) / 100
    assert.equal(d.reparto.numPartes, 3)
    assert.equal(d.resumen.totalComisiones, 0)
    assert.equal(d.resumen.resultadoPropietario, expected)
    assert.equal(d.liquidaciones.length, configured.length)
    for (const l of d.liquidaciones) {
      const c = configured.find(c => c.id === l.colaborador.id)!
      const participant = c.rol === 'RESPONSABLE' && c.comisionPct > 0
      assert.equal(l.colaborador.comisionPct, c.comisionPct)
      assert.equal(l.participacionNeto, participant ? expected : 0)
      assert.equal(l.importeLiquidacion, l.participacionNeto)
      assert.equal(l.comisionNeta, 0)
      for (const role of ['prescriptor', 'operario', 'responsable']) assert.equal(l.desglose[role].comision, 0)
    }
    const aggregate = await get(desde, hasta, '')
    for (const l of aggregate.liquidaciones) {
      if (configured.some(c => c.id === l.colaborador.id)) {
        assert.equal(l.importeLiquidacion, d.liquidaciones.find((c: any) => c.colaborador.id === l.colaborador.id).importeLiquidacion)
      } else if (!l.reparto) {
        assert.equal(l.importeLiquidacion, l.comisionNeta)
        assert.equal(l.participacionNeto, 0)
      }
    }
    console.log(JSON.stringify({ periodo: { desde, hasta }, neto: d.resumen.netoLocal, propietario: expected, colaboradores: d.liquidaciones.map((l: any) => ({ nombre: l.colaborador.nombre, porcentajeGuardado: l.colaborador.comisionPct, participacion: l.participacionNeto, comisiones: l.comisionNeta })), agregadoYOtrosLocales: 'OK' }))
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
