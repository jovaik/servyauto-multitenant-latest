import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Campos que se guardan SIEMPRE en MAYÚSCULAS, se escriban como se escriban
const UPPER_FIELDS: Record<string, string[]> = {
  Cliente: ['nombre', 'apellido'],
  Vehiculo: ['marca', 'modelo', 'matricula'],
  Presupuesto: ['clienteNombre'],
}
// Relaciones anidadas por las que también se crean/actualizan clientes o vehículos
const NESTED: Record<string, string> = {
  cliente: 'Cliente',
  vehiculo: 'Vehiculo',
  vehiculos: 'Vehiculo',
}
const WRITE_KEYS = ['create', 'update', 'upsert', 'connectOrCreate', 'createMany', 'updateMany']

function upperValue(v: any): any {
  if (typeof v === 'string') return v.toLocaleUpperCase('es-ES')
  if (v && typeof v === 'object' && typeof v.set === 'string') return { ...v, set: v.set.toLocaleUpperCase('es-ES') }
  return v
}

function upperData(model: string, data: any): any {
  if (!data || typeof data !== 'object') return data
  if (Array.isArray(data)) return data.map((d) => upperData(model, d))
  const fields = UPPER_FIELDS[model] || []
  const out: any = { ...data }
  for (const f of fields) if (f in out) out[f] = upperValue(out[f])
  for (const [rel, relModel] of Object.entries(NESTED)) {
    if (out[rel] && typeof out[rel] === 'object') out[rel] = upperNested(relModel, out[rel])
  }
  return out
}

function upperUpsert(model: string, u: any) {
  return { ...u, create: upperData(model, u.create), update: upperData(model, u.update) }
}

function upperNested(model: string, op: any): any {
  const out: any = { ...op }
  for (const k of WRITE_KEYS) {
    if (!(k in out)) continue
    const v = out[k]
    const each = (fn: (x: any) => any) => (Array.isArray(v) ? v.map(fn) : fn(v))
    if (k === 'upsert') out[k] = each((u) => upperUpsert(model, u))
    else if (k === 'connectOrCreate') out[k] = each((u) => ({ ...u, create: upperData(model, u.create) }))
    else if (k === 'createMany') out[k] = { ...v, data: upperData(model, v.data) }
    else if (k === 'update' || k === 'updateMany') out[k] = each((u) => (u && u.where && u.data ? { ...u, data: upperData(model, u.data) } : upperData(model, u)))
    else out[k] = upperData(model, v)
  }
  return out
}

function createClient() {
  const client = new PrismaClient()
  client.$use(async (params, next) => {
    const model = params.model as string | undefined
    if (model && params.args && ['create', 'update', 'upsert', 'createMany', 'updateMany', 'createManyAndReturn'].includes(params.action)) {
      if (params.action === 'upsert') params.args = upperUpsert(model, params.args)
      else params.args = { ...params.args, data: upperData(model, params.args.data) }
    }
    return next(params)
  })
  return client
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
