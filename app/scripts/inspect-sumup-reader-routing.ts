import { prisma } from '../lib/db'
import { resolveSumUpKeys } from '../lib/sumup'

async function main() {
  const readers = await prisma.sumUpReader.findMany({ select: { id: true, sumupReaderId: true, nombre: true, localId: true, cuentaTpvId: true, activo: true } })
  const accounts = await prisma.cuentaTpv.findMany({ where: { proveedor: 'SUMUP', activo: true } })
  const locals = await prisma.local.findMany({ where: { sumupApiKey: { not: null } }, select: { id: true, nombre: true, sumupApiKey: true } })
  console.log(JSON.stringify({ readers, accounts: accounts.map(a => ({ id: a.id, nombre: a.nombre, localId: a.localId, hasKey: !!a.sumupApiKey })), locals: locals.map(l => ({ id: l.id, nombre: l.nombre, hasKey: !!l.sumupApiKey })) }, null, 2))
  const sources = [{ label: 'CENTRAL', key: process.env.SUMUP_API_KEY }, ...accounts.filter(a => a.sumupApiKey).map(a => ({ label: a.nombre, key: a.sumupApiKey! })), ...locals.filter(l => l.sumupApiKey).map(l => ({ label: l.nombre, key: l.sumupApiKey! }))]
  const seen = new Map<string, string>()
  for (const source of sources) {
    if (!source.key) continue
    if (seen.has(source.key)) { console.log(source.label, 'MISMA CUENTA QUE', seen.get(source.key)); continue }
    seen.set(source.key, source.label)
    const headers = { Authorization: `Bearer ${source.key}` }
    const me = await fetch('https://api.sumup.com/v0.1/me', { headers })
    if (!me.ok) { console.log(source.label, 'PROFILE HTTP', me.status); continue }
    const profile = await me.json()
    const merchant = profile.merchant_code || profile.merchant_profile?.merchant_code || profile.account?.merchant_code
    const response = await fetch(`https://api.sumup.com/v0.1/merchants/${merchant}/readers`, { headers })
    console.log(source.label, 'READERS HTTP', response.status)
    if (response.ok) { const data = await response.json(); console.log(JSON.stringify((data.items || data).map((r: any) => ({ id: r.id, name: r.name, status: r.status })))) }
  }
  const failed = readers.find(r => r.sumupReaderId === 'rdr_3YAFQXYFSK8K2BAW6FZRWH8FGC')
  if (failed) {
    const keys = await resolveSumUpKeys({ cuentaTpvId: failed.cuentaTpvId, localId: 'cmm9arii40000on1r1znffzhv' })
    console.log('RUTA_COBRO_FALLIDO_USA', seen.get(keys.apiKey || process.env.SUMUP_API_KEY || '') || 'OTRA')
  }
}
main().catch(() => { console.error('Diagnóstico interrumpido'); process.exitCode = 1 }).finally(() => prisma.$disconnect())
