
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext, buildLocalFilter } from '@/lib/local-context'

export const dynamic = 'force-dynamic'

// Función para obtener el lunes de la semana actual
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Ajuste cuando es domingo
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

// Función para obtener el domingo de la semana actual
function getSunday(date: Date): Date {
  const monday = getMonday(date)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sunday
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'hoy'

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let startDate: Date
    let endDate: Date

    // Determinar el rango de fechas según el período
    switch (period) {
      case 'hoy':
        startDate = new Date(today)
        endDate = new Date(today)
        endDate.setHours(23, 59, 59, 999)
        break
      
      case 'semanal':
        startDate = getMonday(today)
        endDate = getSunday(today)
        break
      
      case 'mensual':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1)
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
        break
      
      case 'anual':
        startDate = new Date(today.getFullYear(), 0, 1)
        endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999)
        break
      
      default:
        startDate = new Date(today)
        endDate = new Date(today)
        endDate.setHours(23, 59, 59, 999)
    }

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

    // Obtener contexto de local para filtrado
    const localContext = await getLocalContext()
    const localFilter = localContext ? buildLocalFilter(localContext) : {}

    // Obtener IDs de citas que ya tienen factura asociada (para evitar duplicados)
    const citasConFactura = await prisma.factura.findMany({
      where: {
        citaId: { not: null },
        ...localFilter
      },
      select: {
        citaId: true
      }
    })
    const citasConFacturaIds = citasConFactura
      .map((f: any) => f.citaId)
      .filter((id): id is string => id !== null && id !== undefined)

    // Obtener estadísticas básicas según el período seleccionado
    const [citasPeriodo, clientesPeriodo, citasPendientes] = await Promise.all([
      prisma.cita.count({
        where: {
          fecha: {
            gte: startDate,
            lte: endDate,
          },
          ...localFilter
        },
      }),
      prisma.cliente.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          ...localFilter
        },
      }),
      prisma.cita.count({
        where: {
          estado: 'PENDIENTE',
          ...localFilter
        },
      }),
    ])

    // Obtener facturas pagadas del período
    const facturasDelPeriodo = await prisma.factura.aggregate({
      where: {
        fecha: {
          gte: startDate,
          lte: endDate,
        },
        estado: 'PAGADA',
        ...localFilter
      },
      _sum: {
        total: true,
      },
    })

    // Obtener citas completadas SIN factura del período (evita duplicados)
    const citasCompletadasSinFactura = await prisma.cita.aggregate({
      where: {
        fecha: {
          gte: startDate,
          lte: endDate,
        },
        estado: 'COMPLETADA',
        id: { notIn: citasConFacturaIds },
        ...localFilter
      },
      _sum: {
        total: true,
      },
    })

    // Gastos del período seleccionado
    const gastosPeriodo = await prisma.gasto.aggregate({
      where: {
        fecha: {
          gte: startDate,
          lte: endDate,
        },
        ...localFilter
      },
      _sum: {
        importe: true,
      },
    })

    // Ingresos adicionales del período (parking, máquinas, etc.)
    const ingresosAdicionalesPeriodo = await prisma.ingresoAdicional.aggregate({
      where: {
        fecha: {
          gte: startDate,
          lte: endDate,
        },
        ...localFilter
      },
      _sum: {
        importe: true,
      },
    })

    // Facturación total = facturas pagadas + citas completadas sin factura + ingresos adicionales
    const facturacionTotal = (facturasDelPeriodo._sum?.total || 0) + 
                             (citasCompletadasSinFactura._sum?.total || 0) + 
                             (ingresosAdicionalesPeriodo._sum?.importe || 0)
    const gastosTotal = gastosPeriodo._sum?.importe || 0
    const balancePeriodo = facturacionTotal - gastosTotal

    // Ingresos vs Gastos por mes (año actual)
    const currentYear = today.getFullYear()
    const monthlyData = []

    for (let month = 0; month < 12; month++) {
      const startDateMonth = new Date(currentYear, month, 1)
      const endDateMonth = new Date(currentYear, month + 1, 0, 23, 59, 59)

      const [facturasDelMes, citasDelMes, ingresosAdicionalesDelMes, gastos] = await Promise.all([
        prisma.factura.aggregate({
          where: {
            fecha: {
              gte: startDateMonth,
              lte: endDateMonth,
            },
            estado: 'PAGADA',
            ...localFilter
          },
          _sum: {
            total: true,
          },
        }),
        prisma.cita.aggregate({
          where: {
            fecha: {
              gte: startDateMonth,
              lte: endDateMonth,
            },
            estado: 'COMPLETADA',
            id: { notIn: citasConFacturaIds },
            ...localFilter
          },
          _sum: {
            total: true,
          },
        }),
        prisma.ingresoAdicional.aggregate({
          where: {
            fecha: {
              gte: startDateMonth,
              lte: endDateMonth,
            },
            ...localFilter
          },
          _sum: {
            importe: true,
          },
        }),
        prisma.gasto.aggregate({
          where: {
            fecha: {
              gte: startDateMonth,
              lte: endDateMonth,
            },
            ...localFilter
          },
          _sum: {
            importe: true,
          },
        }),
      ])

      const ingresosDelMes = (facturasDelMes._sum?.total || 0) + 
                             (citasDelMes._sum?.total || 0) + 
                             (ingresosAdicionalesDelMes._sum?.importe || 0)

      monthlyData.push({
        mes: new Date(currentYear, month, 1).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase(),
        ingresos: ingresosDelMes,
        gastos: gastos._sum.importe || 0,
      })
    }

    // Top conceptos de ingresos (por servicios más facturados del año actual)
    // Solo mostrar servicios que ACTUALMENTE existen en el sistema
    
    // Obtener IDs de facturas del año actual (no solo del mes)
    const startOfYear = new Date(currentYear, 0, 1)
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59)
    
    const facturasDelAnio = await prisma.factura.findMany({
      where: {
        createdAt: {
          gte: startOfYear,
          lte: endOfYear,
        },
        ...localFilter
      },
      select: {
        id: true,
      },
    })

    const facturasIds = facturasDelAnio.map((f: any) => f.id)

    let topConceptos: { concepto: string; total: number }[] = []

    // Si hay facturas del año, obtener los servicios facturados
    if (facturasIds.length > 0) {
      // Primero obtener todos los servicios que ACTUALMENTE existen en el sistema
      const serviciosActuales = await prisma.servicio.findMany({
        select: {
          nombre: true,
        },
      })
      
      const nombresServiciosActuales = serviciosActuales.map((s: any) => s.nombre)
      
      // Obtener items de esas facturas agrupados por descripción
      // Solo servicios que todavía existen en el sistema
      const serviciosFacturados = await prisma.factura_items.groupBy({
        by: ['descripcion'],
        where: {
          facturaId: {
            in: facturasIds,
          },
          descripcion: {
            in: nombresServiciosActuales,
          },
        },
        _sum: {
          total: true,
        },
        orderBy: {
          _sum: {
            total: 'desc',
          },
        },
        take: 5, // Top 5 servicios más facturados
      })

      // Convertir a formato del gráfico
      topConceptos = serviciosFacturados.map(item => ({
        concepto: item.descripcion,
        total: item._sum.total || 0,
      }))
    }

    return NextResponse.json({
      citasHoy: citasPeriodo || 0,
      facturacionMensual: facturacionTotal,
      gastosMensual: gastosTotal,
      balanceMensual: balancePeriodo,
      clientesTotal: clientesPeriodo || 0,
      citasPendientes: citasPendientes || 0,
      monthlyData,
      topConceptos,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
