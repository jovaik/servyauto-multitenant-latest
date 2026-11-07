import assert from 'node:assert/strict'
import { prisma } from '../lib/db'
import { detectVehicleCategory, filterServicesByCategory, getServiceSizeTag } from '../lib/vehicle-categories'

// Solo lectura: no crea fixtures, usuarios, documentos ni pagos.
const base = process.env.OPENWEB_TEST_BASE_URL || 'http://localhost:3000'
const key = process.env.OPENWEB_CATALOG_API_KEY
assert(key, 'Falta la clave de integración')
const headers = { Authorization: `Bearer ${key}` }
let checks = 0
const check = (ok: unknown, description: string) => { assert(ok, description); checks++ }
async function query(params: Record<string, string>) {
  const response = await fetch(`${base}/api/openweb/catalogo?${new URLSearchParams(params)}`, { headers })
  return { response, body: await response.json() }
}
async function main() {
  for (const auth of [undefined, 'Bearer clave-invalida']) {
    const r = await fetch(`${base}/api/openweb/catalogo`, { headers: auth ? { Authorization: auth } : {} })
    check(r.status === 401, 'Rechaza clave ausente o incorrecta')
  }
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const r = await fetch(`${base}/api/openweb/catalogo`, { method, headers })
    check(r.status === 405, `Bloquea ${method}`)
  }
  const help = await query({ accion: 'ayuda' })
  check(help.response.status === 200 && help.body.acceso === 'SOLO LECTURA', 'Ayuda accesible')
  check(help.response.headers.get('cache-control')?.includes('no-store'), 'Sin caché pública')
  check(!help.response.headers.has('access-control-allow-origin'), 'No habilita acceso desde navegador externo')
  const locals = await query({ accion: 'locales' })
  check(locals.response.status === 200 && locals.body.locales.length > 0, 'Locales disponibles')
  for (const local of locals.body.locales) {
    check(Object.keys(local).sort().join(',') === 'id,nombre,nombreComercial', 'Local sin secretos ni datos fiscales')
    const context = { localId: local.id }
    const brands = await query({ ...context, accion: 'marcas' })
    check(brands.response.status === 200 && brands.body.marcas.includes('BMW'), 'Marcas disponibles')
    const models = await query({ ...context, accion: 'modelos', marca: 'BMW' })
    check(models.response.status === 200 && models.body.modelos.some((m: any) => m.modelo === 'X3'), 'Modelos disponibles')
    const catalog = await query({ ...context, accion: 'servicios' })
    const source = await prisma.servicio.findMany({ where: { activo: true }, select: { id: true, nombre: true, precio: true, duracion: true } })
    const overrides = await prisma.precioOverrideLocal.findMany({ where: context, select: { servicioId: true, precio: true } })
    check(catalog.response.status === 200 && catalog.body.servicios.length === source.length, 'Solo catálogo activo')
    for (const service of catalog.body.servicios) {
      const original = source.find(s => s.id === service.id)!
      const override = overrides.find(o => o.servicioId === service.id)
      const expected = override?.precio ?? original.precio
      check(service.precio === (expected > 0 ? expected : null), 'Precio respeta ajuste del local')
      check(service.requiereValoracion === (expected <= 0), 'No anuncia precio cero como gratuito')
      check(Object.keys(service).sort().join(',') === 'categoriaServicio,duracionMinutos,id,nombre,origenPrecio,precio,requiereValoracion', 'Campos permitidos del servicio')
    }
    const categoryOverrides = await prisma.categoriaOverrideLocal.findMany({ where: context, select: { marca: true, modelo: true, categoria: true } })
    for (const vehicle of [{ marca: 'BMW', modelo: 'X3' }, { marca: 'FIAT', modelo: '500' }, ...categoryOverrides]) {
      const override = categoryOverrides.find(o => o.marca === vehicle.marca && o.modelo === vehicle.modelo)
      const category = override?.categoria || detectVehicleCategory(vehicle.marca, vehicle.modelo)
      const prices = await query({ ...context, accion: 'precios', marca: vehicle.marca, modelo: vehicle.modelo })
      check(prices.response.status === 200 && prices.body.vehiculo.categoria === category, 'Categoría coincide con agenda y override local')
      const expectedServices = filterServicesByCategory(source, category as any).map(s => s.id).sort()
      assert.deepEqual(prices.body.servicios.map((s: any) => s.id).sort(), expectedServices)
      checks++
      const invalidService = source.find(s => getServiceSizeTag(s.nombre) && getServiceSizeTag(s.nombre) !== category)
      if (invalidService) {
        const invalid = await query({ ...context, accion: 'precios', marca: vehicle.marca, modelo: vehicle.modelo, servicioId: invalidService.id })
        check(invalid.response.status === 404, 'Rechaza servicio de otro tamaño')
      }
    }
    const unknown = await query({ ...context, accion: 'precios', marca: 'DESCONOCIDA', modelo: 'DESCONOCIDO' })
    check(unknown.response.status === 422 && unknown.body.requiereValoracion, 'Desconocidos no reciben precio inventado')
  }
  for (const params of [{ accion: 'servicios' }, { accion: 'borrar' }, { accion: 'ayuda', incluirCostes: 'true' }]) {
    check((await query(params as Record<string, string>)).response.status === 400, 'Valida parámetros')
  }
  check((await query({ accion: 'servicios', localId: 'local-inexistente' })).response.status === 404, 'Rechaza local inexistente')
  const privateResponse = await fetch(`${base}/api/clientes`, { headers, redirect: 'manual' })
  check(privateResponse.status === 401, 'La clave no da acceso a clientes')
  console.log(JSON.stringify({ resultado: 'OK', comprobaciones: checks, locales: locals.body.locales.length, escrituras: 0 }))
}
main().catch(error => { console.error('Verificación fallida:', error.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
