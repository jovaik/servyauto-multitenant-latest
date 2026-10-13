import { prisma } from '../lib/db'
import { encode } from 'next-auth/jwt'
import assert from 'node:assert/strict'

async function main() {
  const user = await prisma.user.findFirstOrThrow({ where: { role: 'SUPER_ADMIN' }, select: { id: true, email: true, role: true } })
  const token = await encode({ token: { sub: user.id, id: user.id, email: user.email, role: user.role }, secret: process.env.NEXTAUTH_SECRET! })
  const localId = 'cmm9arii40000on1r1znffzhv'
  const headers = { cookie: 'servyauto.session-token=' + token, 'Content-Type': 'application/json' }
  const call = async (path: string, method = 'GET', body?: object) => {
    const r = await fetch('http://localhost:3000' + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
    if (!r.ok) throw Error(`${method} ${path}: ${r.status}`)
    return r.json()
  }
  let id: string | undefined
  try {
    const created = await call('/api/colaboradores', 'POST', { nombre: 'PRUEBA TEMPORAL PORCENTAJE ' + Date.now(), rol: 'PRESCRIPTOR', localId, comisionPct: 25 })
    id = created.id
    const updated = await call(`/api/colaboradores/${id}`, 'PUT', { comisionPct: 33.33, localId })
    const listed = (await call('/api/colaboradores?localId=' + localId)).find((c: any) => c.id === id)
    const stored = await prisma.colaborador.findUniqueOrThrow({ where: { id } })
    console.log(JSON.stringify({ creacionSolicitada: 25, creacionDevuelta: created.comisionPct, edicionSolicitada: 33.33, edicionDevuelta: updated.comisionPct, lectura: listed.comisionPct, guardado: stored.comisionPct }))
    if (process.argv.includes('--before')) {
      assert.equal(updated.comisionPct, 0)
      assert.equal(listed.comisionPct, 0)
      console.log('REPRODUCIDO: EL PORCENTAJE SE SUSTITUYE POR CERO')
      return
    }
    assert.equal(created.comisionPct, 25)
    assert.equal(updated.comisionPct, 33.33)
    assert.equal(listed.comisionPct, 33.33)
    assert.equal(stored.comisionPct, 33.33)
    await call(`/api/colaboradores/${id}`, 'PUT', { activo: false })
    const unchanged = await prisma.colaborador.findUniqueOrThrow({ where: { id } })
    assert.equal(unchanged.comisionPct, 33.33)
    await call(`/api/colaboradores/${id}`, 'PUT', { comisionPct: 0 })
    const zero = (await call('/api/colaboradores?localId=' + localId)).find((c: any) => c.id === id)
    assert.equal(zero.comisionPct, 0)
    console.log('OK: ALTA, EDICIÓN, LECTURA, CAMBIO DE ESTADO Y GUARDADO DE CERO')
  } finally {
    if (id) {
      await call(`/api/colaboradores/${id}`, 'DELETE')
      assert.equal(await prisma.colaborador.count({ where: { id } }), 0)
      console.log('REGISTRO TEMPORAL ELIMINADO; COLABORADORES REALES SIN CAMBIOS')
    }
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
