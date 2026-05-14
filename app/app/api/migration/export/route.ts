export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * API de exportación read-only para migración a autodetail4u.
 * Protegida por MIGRATION_API_KEY (header Authorization: Bearer <key>).
 * 
 * GET /api/migration/export?tables=list
 *   → Lista tablas disponibles con conteo.
 * 
 * GET /api/migration/export?table=clientes
 *   → Devuelve todos los registros de esa tabla.
 * 
 * GET /api/migration/export
 *   → Devuelve TODAS las tablas en un solo JSON.
 */

const VALID_API_KEY = process.env.MIGRATION_API_KEY

function validateApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '').trim()
  return token === VALID_API_KEY
}

const EXPORTABLE_TABLES = [
  'locales', 'usuarios', 'user_locales', 'clientes', 'vehiculos',
  'servicios', 'tipos_servicio', 'citas', 'cita_servicios',
  'facturas', 'factura_items', 'gastos', 'proveedores',
  'configuraciones', 'cierres_caja', 'inventario_tickets',
  'ingresos_adicionales', 'reservas', 'categoria_override_local',
  'precio_override_local', 'sumup_transactions', 'servicios_taller',
] as const

async function fetchTable(table: string): Promise<any[] | null> {
  switch (table) {
    case 'locales':
      return prisma.local.findMany()
    case 'usuarios':
      return prisma.user.findMany({
        select: {
          id: true, name: true, email: true, role: true,
          localId: true, activo: true, createdAt: true, updatedAt: true,
        },
      })
    case 'user_locales':
      return prisma.userLocal.findMany()
    case 'clientes':
      return prisma.cliente.findMany({
        include: { vehiculos: { select: { id: true, matricula: true } } },
      })
    case 'vehiculos':
      return prisma.vehiculo.findMany({
        include: { cliente: { select: { id: true, nombre: true } } },
      })
    case 'servicios':
      return prisma.servicio.findMany()
    case 'tipos_servicio':
      return prisma.tipoServicio.findMany()
    case 'citas':
      return prisma.cita.findMany({ include: { cita_servicios: true } })
    case 'cita_servicios':
      return prisma.cita_servicios.findMany()
    case 'facturas':
      return prisma.factura.findMany({ include: { factura_items: true } })
    case 'factura_items':
      return prisma.factura_items.findMany()
    case 'gastos':
      return prisma.gasto.findMany()
    case 'proveedores':
      return prisma.proveedor.findMany()
    case 'configuraciones':
      return prisma.configuracion.findMany()
    case 'cierres_caja':
      return prisma.cierreCaja.findMany()
    case 'inventario_tickets':
      return prisma.inventarioTickets.findMany()
    case 'ingresos_adicionales':
      return prisma.ingresoAdicional.findMany()
    case 'reservas':
      return prisma.reservas.findMany()
    case 'categoria_override_local':
      return prisma.categoriaOverrideLocal.findMany()
    case 'precio_override_local':
      return prisma.precioOverrideLocal.findMany()
    case 'sumup_transactions':
      return prisma.sumUpTransaction.findMany()
    case 'servicios_taller':
      return prisma.servicioTaller.findMany()
    default:
      return null
  }
}

async function getTableCount(table: string): Promise<number> {
  try {
    switch (table) {
      case 'locales': return prisma.local.count()
      case 'usuarios': return prisma.user.count()
      case 'user_locales': return prisma.userLocal.count()
      case 'clientes': return prisma.cliente.count()
      case 'vehiculos': return prisma.vehiculo.count()
      case 'servicios': return prisma.servicio.count()
      case 'tipos_servicio': return prisma.tipoServicio.count()
      case 'citas': return prisma.cita.count()
      case 'cita_servicios': return prisma.cita_servicios.count()
      case 'facturas': return prisma.factura.count()
      case 'factura_items': return prisma.factura_items.count()
      case 'gastos': return prisma.gasto.count()
      case 'proveedores': return prisma.proveedor.count()
      case 'configuraciones': return prisma.configuracion.count()
      case 'cierres_caja': return prisma.cierreCaja.count()
      case 'inventario_tickets': return prisma.inventarioTickets.count()
      case 'ingresos_adicionales': return prisma.ingresoAdicional.count()
      case 'reservas': return prisma.reservas.count()
      case 'categoria_override_local': return prisma.categoriaOverrideLocal.count()
      case 'precio_override_local': return prisma.precioOverrideLocal.count()
      case 'sumup_transactions': return prisma.sumUpTransaction.count()
      case 'servicios_taller': return prisma.servicioTaller.count()
      default: return 0
    }
  } catch {
    return 0
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!VALID_API_KEY) {
      return NextResponse.json({ error: 'Migration API not configured' }, { status: 503 })
    }
    if (!validateApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')
    const tablesParam = searchParams.get('tables')

    // Listar tablas con conteo
    if (tablesParam === 'list') {
      const counts: Record<string, number> = {}
      for (const t of EXPORTABLE_TABLES) {
        counts[t] = await getTableCount(t)
      }
      return NextResponse.json({
        tables: counts,
        total_tables: EXPORTABLE_TABLES.length,
        total_rows: Object.values(counts).reduce((a, b) => a + b, 0),
      })
    }

    // Exportar una tabla específica
    if (table) {
      if (!EXPORTABLE_TABLES.includes(table as any)) {
        return NextResponse.json(
          { error: `Tabla '${table}' no disponible. Válidas: ${EXPORTABLE_TABLES.join(', ')}` },
          { status: 400 }
        )
      }
      const count = await getTableCount(table)
      const data = await fetchTable(table)
      return NextResponse.json({ table, total: count, data })
    }

    // Exportar TODO
    const allData: Record<string, { count: number; data: any[] }> = {}
    for (const t of EXPORTABLE_TABLES) {
      console.log(`[Migration Export] Fetching ${t}...`)
      const data = await fetchTable(t) || []
      allData[t] = { count: data.length, data }
    }

    return NextResponse.json({
      exported_at: new Date().toISOString(),
      source: 'servyauto-abacus',
      tables: allData,
    })

  } catch (error) {
    console.error('[Migration Export] Error:', error)
    return NextResponse.json(
      { error: 'Error interno', details: (error as Error).message },
      { status: 500 }
    )
  }
}
