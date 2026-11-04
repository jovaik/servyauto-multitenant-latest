import { facturasPorLocal } from '@/lib/factura-local'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

function getQuarterDates(year: number, quarter: number): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 3, 0, 23, 59, 59, 999)
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = (session.user as any).role
    if (!['SUPER_ADMIN', 'GRUPO_ADMIN', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const periodo = searchParams.get('periodo') || 'diario' // diario, semanal, mensual, trimestral, anual
    const localId = searchParams.get('localId') || '' // '' = todos
    const fechaStr = searchParams.get('fecha') || new Date().toISOString().split('T')[0]
    const fecha = new Date(fechaStr + 'T00:00:00')

    let startDate: Date
    let endDate: Date
    let periodoLabel: string

    switch (periodo) {
      case 'diario':
        startDate = new Date(fecha)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(fecha)
        endDate.setHours(23, 59, 59, 999)
        periodoLabel = fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        break
      case 'semanal':
        startDate = getMonday(fecha)
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6)
        endDate.setHours(23, 59, 59, 999)
        periodoLabel = `${startDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
        break
      case 'mensual':
        startDate = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
        endDate = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0, 23, 59, 59, 999)
        periodoLabel = fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
        break
      case 'trimestral': {
        const quarter = Math.floor(fecha.getMonth() / 3) + 1
        const qDates = getQuarterDates(fecha.getFullYear(), quarter)
        startDate = qDates.start
        endDate = qDates.end
        periodoLabel = `T${quarter} ${fecha.getFullYear()}`
        break
      }
      case 'anual':
        startDate = new Date(fecha.getFullYear(), 0, 1)
        endDate = new Date(fecha.getFullYear(), 11, 31, 23, 59, 59, 999)
        periodoLabel = `Año ${fecha.getFullYear()}`
        break
      default:
        startDate = new Date(fecha)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(fecha)
        endDate.setHours(23, 59, 59, 999)
        periodoLabel = fecha.toLocaleDateString('es-ES')
    }

    // Build local filter
    const localFilter: any = {}
    if (localId && localId !== 'todos') {
      localFilter.localId = localId
    }

    // IDs de citas con factura para evitar duplicar ingresos
    const citasConFactura = await facturasPorLocal.findMany({
      where: { citaId: { not: null }, ...localFilter },
      select: { citaId: true }
    })
    const citasConFacturaIds = citasConFactura.map((f: any) => f.citaId).filter(Boolean) as string[]

    // === CONSULTAS PARALELAS ===
    const [
      facturasPagadas,
      facturasPendientes,
      citasCompletadasSinFactura,
      totalGastos,
      ingresosAdicionales,
      totalCitas,
      citasCompletadas,
      citasCanceladas,
      totalClientes,
      facturasDetalle,
      facturasTpvDetalle,
      citasTpvDetalle,
      gastosDetalle,
      gastosPorProveedor,
      gastosPorColaboradorRaw,
      ingresosAdicionalesDetalle,
    ] = await Promise.all([
      // Facturas pagadas
      facturasPorLocal.aggregate({
        where: { fecha: { gte: startDate, lte: endDate }, estado: 'PAGADA', ...localFilter },
        _sum: { total: true },
        _count: true,
      }),
      // Facturas pendientes
      facturasPorLocal.aggregate({
        where: { fecha: { gte: startDate, lte: endDate }, estado: 'PENDIENTE', ...localFilter },
        _sum: { total: true },
        _count: true,
      }),
      // Citas completadas sin factura
      prisma.cita.aggregate({
        where: {
          fecha: { gte: startDate, lte: endDate },
          estado: 'COMPLETADA',
          facturaAgrupadaId: null, cobroDiferido: false, metodoPago: { not: null },
          id: { notIn: citasConFacturaIds.length > 0 ? citasConFacturaIds : ['__none__'] },
          ...localFilter
        },
        _sum: { total: true },
        _count: true,
      }),
      // Gastos
      prisma.gasto.aggregate({
        where: { fecha: { gte: startDate, lte: endDate }, ...localFilter },
        _sum: { importe: true },
        _count: true,
      }),
      // Ingresos adicionales
      prisma.ingresoAdicional.aggregate({
        where: { fecha: { gte: startDate, lte: endDate }, ...localFilter },
        _sum: { importe: true },
        _count: true,
      }),
      // Total citas
      prisma.cita.count({
        where: { fecha: { gte: startDate, lte: endDate }, ...localFilter }
      }),
      // Citas completadas
      prisma.cita.count({
        where: { fecha: { gte: startDate, lte: endDate }, estado: 'COMPLETADA', ...localFilter }
      }),
      // Citas canceladas
      prisma.cita.count({
        where: { fecha: { gte: startDate, lte: endDate }, estado: 'CANCELADA', ...localFilter }
      }),
      // Clientes nuevos
      prisma.cliente.count({
        where: { createdAt: { gte: startDate, lte: endDate }, ...localFilter }
      }),
      // Detalle facturas por método de pago
      facturasPorLocal.groupBy({
        by: ['metodoPago'],
        where: { fecha: { gte: startDate, lte: endDate }, estado: 'PAGADA', ...localFilter },
        _sum: { total: true },
        _count: true,
      }),
      // Detalle facturas por TPV (autónomo)
      facturasPorLocal.groupBy({
        by: ['tpvNombre'],
        where: { fecha: { gte: startDate, lte: endDate }, estado: 'PAGADA', tpvNombre: { not: null }, ...localFilter },
        _sum: { total: true },
        _count: true,
      }),
      // Detalle citas sin factura por TPV (autónomo)
      prisma.cita.groupBy({
        by: ['tpvNombre'],
        where: {
          fecha: { gte: startDate, lte: endDate },
          estado: 'COMPLETADA',
          facturaAgrupadaId: null, cobroDiferido: false, metodoPago: { not: null },
          tpvNombre: { not: null },
          id: { notIn: citasConFacturaIds.length > 0 ? citasConFacturaIds : ['__none__'] },
          ...localFilter
        },
        _sum: { total: true },
        _count: true,
      }),
      // Detalle gastos por tipo
      prisma.gasto.groupBy({
        by: ['tipoGasto'],
        where: { fecha: { gte: startDate, lte: endDate }, ...localFilter },
        _sum: { importe: true },
        _count: true,
        orderBy: { _sum: { importe: 'desc' } },
      }),
      // Detalle gastos por proveedor
      prisma.gasto.groupBy({
        by: ['proveedor'],
        where: { fecha: { gte: startDate, lte: endDate }, proveedor: { not: null }, ...localFilter },
        _sum: { importe: true },
        _count: true,
        orderBy: { _sum: { importe: 'desc' } },
      }),
      // Detalle gastos por colaborador
      prisma.gasto.groupBy({
        by: ['colaboradorId'],
        where: { fecha: { gte: startDate, lte: endDate }, colaboradorId: { not: null }, ...localFilter },
        _sum: { importe: true },
        _count: true,
        orderBy: { _sum: { importe: 'desc' } },
      }),
      // Detalle ingresos adicionales por concepto
      prisma.ingresoAdicional.groupBy({
        by: ['concepto'],
        where: { fecha: { gte: startDate, lte: endDate }, ...localFilter },
        _sum: { importe: true },
        _count: true,
        orderBy: { _sum: { importe: 'desc' } },
      }),
    ])

    // Resolver nombres de colaboradores para el desglose
    const colabIds = (gastosPorColaboradorRaw as any[]).map((g: any) => g.colaboradorId).filter(Boolean)
    let colabMap: Record<string, { nombre: string; rol: string }> = {}
    if (colabIds.length > 0) {
      const colabs = await prisma.colaborador.findMany({
        where: { id: { in: colabIds } },
        select: { id: true, nombre: true, rol: true },
      })
      colabMap = Object.fromEntries(colabs.map((c: any) => [c.id, { nombre: c.nombre, rol: c.rol }]))
    }

    // Listado detallado de gastos individuales
    const gastosListado = await prisma.gasto.findMany({
      where: { fecha: { gte: startDate, lte: endDate }, ...localFilter },
      select: {
        id: true,
        concepto: true,
        fecha: true,
        proveedor: true,
        tipoGasto: true,
        importe: true,
        metodoPago: true,
        beneficiario: true,
        colaborador: { select: { nombre: true, rol: true } },
        local: { select: { nombre: true, nombreComercial: true } },
      },
      orderBy: [{ fecha: 'asc' }],
    })

    // Top servicios del periodo
    const facturasIdsPeriodo = await facturasPorLocal.findMany({
      where: { fecha: { gte: startDate, lte: endDate }, estado: 'PAGADA', ...localFilter },
      select: { id: true },
    })
    const fIds = facturasIdsPeriodo.map((f: any) => f.id)

    let topServicios: any[] = []
    if (fIds.length > 0) {
      topServicios = await (prisma.factura_items.groupBy as any)({
        by: ['descripcion'],
        where: { facturaId: { in: fIds } },
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      })
    }

    // Detalle de citas (vehículos lavados con servicios)
    const citasDetalle = await prisma.cita.findMany({
      where: { fecha: { gte: startDate, lte: endDate }, estado: 'COMPLETADA', ...localFilter },
      select: {
        id: true,
        fecha: true,
        horaInicio: true,
        total: true,
        metodoPago: true,
        completadoPorNombre: true,
        vehiculo: {
          select: {
            matricula: true,
            marca: true,
            modelo: true,
            color: true,
          }
        },
        cliente: {
          select: {
            nombre: true,
            apellido: true,
          }
        },
        local: {
          select: {
            nombre: true,
            nombreComercial: true,
          }
        },
        cita_servicios: {
          select: {
            precio: true,
            servicios: {
              select: {
                nombre: true,
              }
            }
          }
        },
      },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
    })

    const detalleCitas = citasDetalle.map((c: any) => ({
      id: c.id,
      fecha: c.fecha,
      hora: c.horaInicio,
      matricula: c.vehiculo?.matricula || '',
      vehiculo: `${c.vehiculo?.marca || ''} ${c.vehiculo?.modelo || ''}`.trim(),
      color: c.vehiculo?.color || '',
      cliente: `${c.cliente?.nombre || ''} ${c.cliente?.apellido || ''}`.trim(),
      servicios: c.cita_servicios?.map((cs: any) => cs.servicios?.nombre || '').filter(Boolean) || [],
      total: c.total || 0,
      metodoPago: c.metodoPago || null,
      operario: c.completadoPorNombre || '',
      local: c.local?.nombreComercial || c.local?.nombre || '',
    }))

    // Datos por local (solo si no se filtró por uno específico)
    let datosLocales: any[] = []
    if (!localId || localId === 'todos') {
      const locales = await prisma.local.findMany({
        select: { id: true, nombre: true, nombreComercial: true }
      })

      datosLocales = await Promise.all(locales.map(async (local: any) => {
        const [facturasLocal, gastosLocal, ingresosAdLocal, citasLocal] = await Promise.all([
          facturasPorLocal.aggregate({
            where: { fecha: { gte: startDate, lte: endDate }, estado: 'PAGADA', localId: local.id },
            _sum: { total: true },
          }),
          prisma.gasto.aggregate({
            where: { fecha: { gte: startDate, lte: endDate }, localId: local.id },
            _sum: { importe: true },
          }),
          prisma.ingresoAdicional.aggregate({
            where: { fecha: { gte: startDate, lte: endDate }, localId: local.id },
            _sum: { importe: true },
          }),
          prisma.cita.count({
            where: { fecha: { gte: startDate, lte: endDate }, localId: local.id, estado: 'COMPLETADA' }
          }),
        ])

        // Citas completadas sin factura de este local
        const citasSinFacturaLocal = await prisma.cita.aggregate({
          where: {
            fecha: { gte: startDate, lte: endDate },
            estado: 'COMPLETADA',
            facturaAgrupadaId: null, cobroDiferido: false, metodoPago: { not: null },
            localId: local.id,
            id: { notIn: citasConFacturaIds.length > 0 ? citasConFacturaIds : ['__none__'] },
          },
          _sum: { total: true },
        })

        const ingresos = (facturasLocal._sum?.total || 0) + 
                         (citasSinFacturaLocal._sum?.total || 0) + 
                         (ingresosAdLocal._sum?.importe || 0)
        const gastos = gastosLocal._sum?.importe || 0

        return {
          localId: local.id,
          localNombre: local.nombreComercial || local.nombre,
          ingresos,
          gastos,
          balance: ingresos - gastos,
          citas: citasLocal,
        }
      }))

      // Ordenar por ingresos desc
      datosLocales.sort((a: any, b: any) => b.ingresos - a.ingresos)
    }

    // Locales disponibles para el filtro
    const localesDisponibles = await prisma.local.findMany({
      select: { id: true, nombre: true, nombreComercial: true },
      orderBy: { nombre: 'asc' },
    })

    // Totales
    const totalIngresos = (facturasPagadas._sum?.total || 0) + 
                          (citasCompletadasSinFactura._sum?.total || 0) + 
                          (ingresosAdicionales._sum?.importe || 0)
    const totalGastosVal = totalGastos._sum?.importe || 0
    const balance = totalIngresos - totalGastosVal

    return NextResponse.json({
      periodoLabel,
      periodo,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      resumen: {
        totalIngresos,
        totalGastos: totalGastosVal,
        balance,
        facturasPagadas: facturasPagadas._count || 0,
        facturasPendientes: facturasPendientes._count || 0,
        importePendiente: facturasPendientes._sum?.total || 0,
        ingresosAdicionales: ingresosAdicionales._sum?.importe || 0,
        totalCitas,
        citasCompletadas,
        citasCanceladas,
        clientesNuevos: totalClientes,
        numGastos: totalGastos._count || 0,
      },
      desglosePagos: facturasDetalle.map((f: any) => ({
        metodo: f.metodoPago || 'SIN ESPECIFICAR',
        total: f._sum?.total || 0,
        count: f._count || 0,
      })),
      desgloseTPV: (() => {
        const map: { [key: string]: { tpv: string; total: number; count: number } } = {}
        for (const f of facturasTpvDetalle as any[]) {
          const k = f.tpvNombre || 'SIN TPV'
          if (!map[k]) map[k] = { tpv: k, total: 0, count: 0 }
          map[k].total += f._sum?.total || 0
          map[k].count += f._count || 0
        }
        for (const c of citasTpvDetalle as any[]) {
          const k = c.tpvNombre || 'SIN TPV'
          if (!map[k]) map[k] = { tpv: k, total: 0, count: 0 }
          map[k].total += c._sum?.total || 0
          map[k].count += c._count || 0
        }
        return Object.values(map).sort((a, b) => b.total - a.total)
      })(),
      desgloseGastos: gastosDetalle.map((g: any) => ({
        tipo: g.tipoGasto,
        total: g._sum?.importe || 0,
        count: g._count || 0,
      })),
      desgloseIngresosAdicionales: ingresosAdicionalesDetalle.map((i: any) => ({
        concepto: i.concepto,
        total: i._sum?.importe || 0,
        count: i._count || 0,
      })),
      gastosPorProveedor: (gastosPorProveedor as any[]).map((g: any) => ({
        proveedor: g.proveedor || 'Sin proveedor',
        total: g._sum?.importe || 0,
        count: g._count || 0,
      })),
      gastosPorColaborador: (gastosPorColaboradorRaw as any[]).map((g: any) => {
        const info = colabMap[g.colaboradorId] || { nombre: g.colaboradorId, rol: '' }
        return {
          colaborador: info.nombre,
          rol: info.rol,
          total: g._sum?.importe || 0,
          count: g._count || 0,
        }
      }),
      detalleGastos: gastosListado.map((g: any) => ({
        id: g.id,
        fecha: g.fecha,
        concepto: g.concepto,
        proveedor: g.proveedor || '',
        tipoGasto: g.tipoGasto,
        importe: g.importe,
        metodoPago: g.metodoPago || '',
        beneficiario: g.beneficiario || '',
        colaborador: g.colaborador?.nombre || '',
        rolColaborador: g.colaborador?.rol || '',
        local: g.local?.nombreComercial || g.local?.nombre || '',
      })),
      topServicios: topServicios.map((s: any) => ({
        servicio: s.descripcion,
        total: s._sum?.total || 0,
        count: s._count || 0,
      })),
      detalleCitas,
      datosLocales,
      localesDisponibles: localesDisponibles.map((l: any) => ({
        id: l.id,
        nombre: l.nombreComercial || l.nombre,
      })),
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Error al generar el reporte' },
      { status: 500 }
    )
  }
}
