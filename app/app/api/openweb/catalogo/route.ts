import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/db'
import {
  CATEGORY_LABELS, detectVehicleCategory, filterServicesByCategory,
  getAvailableBrands, getModelsForBrand, getServiceSizeTag, type VehicleCategory,
} from '@/lib/vehicle-categories'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const headers = { 'Cache-Control': 'private, no-store', 'Vary': 'Authorization' }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers })
const actions = ['ayuda', 'locales', 'marcas', 'modelos', 'servicios', 'precios']

// Clave exclusiva para este endpoint. No concede sesión ni acceso a otras APIs.
export async function GET(request: NextRequest) {
  const expected = process.env.OPENWEB_CATALOG_API_KEY
  if (!expected) return json({ error: 'Integración deshabilitada' }, 503)
  const authorization = request.headers.get('authorization') || ''
  const supplied = /^Bearer ([^\s]+)$/i.exec(authorization)?.[1] || ''
  const digest = (value: string) => createHash('sha256').update(value).digest()
  if (!supplied || !timingSafeEqual(digest(supplied), digest(expected))) {
    return json({ error: 'No autorizado' }, 401)
  }

  const params = request.nextUrl.searchParams
  const accion = params.get('accion') || 'ayuda'
  const permitted = ['accion', 'localId', 'marca', 'modelo', 'servicioId']
  if (Array.from(params.keys()).some(k => !permitted.includes(k) || params.getAll(k).length !== 1) ||
      Array.from(params.values()).some(v => v.length > 160) || !actions.includes(accion)) {
    return json({ error: 'Parámetros no válidos', acciones: actions }, 400)
  }
  const localId = params.get('localId')?.trim()
  const marca = params.get('marca')?.trim().toUpperCase()
  const modelo = params.get('modelo')?.trim().toUpperCase()
  const servicioId = params.get('servicioId')?.trim()

  if (accion === 'ayuda') return json({
    version: 1,
    destinatario: 'Agente OpenWeb — web ServyAuto',
    acceso: 'SOLO LECTURA',
    autenticacion: 'Authorization: Bearer <OPENWEB_CATALOG_API_KEY>',
    instrucciones: [
      'Guardar la clave únicamente en el servidor de la nueva web. Nunca en el navegador, URLs, repositorios o registros.',
      'Consultar locales, después marcas y modelos; consultar precios indicando siempre localId, marca y modelo.',
      'Usar precios del endpoint, no mantener fórmulas o tarifas independientes. Los ajustes del local tienen prioridad.',
      'Los modelos son patrones del catálogo de clasificación, no vehículos ni matrículas de clientes.',
      'Un vehículo desconocido devuelve 422: solicitar valoración, nunca inventar categoría ni precio.',
      'Un servicio de precio cero se devuelve como precio=null y requiereValoracion=true; no anunciarlo gratis.',
      'Tarifas de catálogo en EUR, sin descuentos de clientes, empresas, parking, VIP ni negociaciones particulares.',
      'Esta API no permite reservas, cobros ni modificaciones. No da acceso a datos personales, fiscales, costes o proveedores.',
      'Revocación: eliminar OPENWEB_CATALOG_API_KEY en ServyAuto y publicar. Rotación: sustituirla y actualizar ambos servidores.',
    ],
    consultas: {
      locales: '?accion=locales',
      marcas: '?accion=marcas&localId=<LOCAL_ID>',
      modelos: '?accion=modelos&localId=<LOCAL_ID>&marca=BMW',
      servicios: '?accion=servicios&localId=<LOCAL_ID>',
      precios: '?accion=precios&localId=<LOCAL_ID>&marca=BMW&modelo=X3',
      servicioConcreto: '?accion=precios&localId=<LOCAL_ID>&marca=BMW&modelo=X3&servicioId=<SERVICIO_ID>',
    },
  })

  try {
    if (accion === 'locales') {
      const locales = await prisma.local.findMany({
        where: { activo: true }, select: { id: true, nombre: true, nombreComercial: true }, orderBy: { nombre: 'asc' },
      })
      return json({ locales })
    }
    if (!localId) return json({ error: 'localId es obligatorio; consultar accion=locales' }, 400)
    const local = await prisma.local.findFirst({
      where: { id: localId, activo: true }, select: { id: true, nombre: true, nombreComercial: true },
    })
    if (!local) return json({ error: 'Local no disponible' }, 404)

    if (accion === 'marcas' || accion === 'modelos') {
      if (accion === 'modelos' && !marca) return json({ error: 'marca es obligatoria' }, 400)
      const overrides = await prisma.categoriaOverrideLocal.findMany({
        where: { localId, ...(accion === 'modelos' ? { marca } : {}) },
        select: { marca: true, modelo: true, categoria: true },
      })
      if (accion === 'marcas') return json({ local, marcas: Array.from(new Set([
        ...getAvailableBrands(), ...overrides.map(o => o.marca),
      ])).sort() })
      const modelos = new Map(getModelsForBrand(marca!).map(m => [m.modelo, {
        modelo: m.modelo, categoria: detectVehicleCategory(marca!, m.modelo), origenCategoria: 'CATALOGO',
      }]))
      for (const override of overrides) {
        modelos.set(override.modelo, {
          modelo: override.modelo,
          categoria: Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, override.categoria) ? override.categoria as VehicleCategory : null,
          origenCategoria: 'LOCAL',
        })
      }
      return json({ local, marca, modelos: Array.from(modelos.values()) })
    }

    let categoria: VehicleCategory | null = null
    let origenCategoria: 'LOCAL' | 'CATALOGO' | null = null
    if (accion === 'precios') {
      if (!marca || !modelo) return json({ error: 'marca y modelo son obligatorios' }, 400)
      const override = await prisma.categoriaOverrideLocal.findUnique({
        where: { localId_marca_modelo: { localId, marca, modelo } }, select: { categoria: true },
      })
      categoria = override
        ? (Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, override.categoria) ? override.categoria as VehicleCategory : null)
        : detectVehicleCategory(marca, modelo)
      origenCategoria = override ? 'LOCAL' : 'CATALOGO'
      if (!categoria) return json({ error: 'Vehículo sin categoría reconocida; consultar con el local', requiereValoracion: true, precios: [] }, 422)
    }

    // Lista blanca explícita: nunca relaciones con citas, clientes, costes ni proveedores.
    const [catalogo, overrides] = await Promise.all([
      prisma.servicio.findMany({
        where: { activo: true, ...(servicioId ? { id: servicioId } : {}) },
        select: { id: true, nombre: true, precio: true, duracion: true },
        orderBy: [{ ordenPreferencia: 'asc' }, { nombre: 'asc' }],
      }),
      prisma.precioOverrideLocal.findMany({ where: { localId }, select: { servicioId: true, precio: true } }),
    ])
    const disponibles = filterServicesByCategory(catalogo, categoria)
    if (servicioId && !disponibles.length) return json({ error: 'Servicio no disponible para esta consulta' }, 404)
    const preciosLocales = new Map(overrides.map(o => [o.servicioId, o.precio]))
    const servicios = disponibles.map(s => {
      const precio = preciosLocales.get(s.id) ?? s.precio
      const requiereValoracion = !Number.isFinite(precio) || precio <= 0
      return {
        id: s.id, nombre: s.nombre, duracionMinutos: s.duracion,
        categoriaServicio: getServiceSizeTag(s.nombre),
        precio: requiereValoracion ? null : precio, requiereValoracion,
        origenPrecio: preciosLocales.has(s.id) ? 'LOCAL' : 'CATALOGO',
      }
    })
    return json({
      local, moneda: 'EUR', descuentosIncluidos: false,
      ...(accion === 'precios' ? { vehiculo: { marca, modelo, categoria, etiquetaCategoria: CATEGORY_LABELS[categoria!], origenCategoria } } : {}),
      servicios,
    })
  } catch (error) {
    console.error('Error de lectura del catálogo OpenWeb:', error instanceof Error ? error.name : 'Error')
    return json({ error: 'No se pudo consultar el catálogo' }, 500)
  }
}
