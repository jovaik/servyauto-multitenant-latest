
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

    // Obtener estadísticas básicas
    const [citasHoy, facturacionMensual, clientesTotal, citasPendientes] = await Promise.all([
      prisma.cita.count({
        where: {
          fecha: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.cita.aggregate({
        where: {
          fecha: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
          estado: 'COMPLETADA',
        },
        _sum: {
          total: true,
        },
      }),
      prisma.cliente.count(),
      prisma.cita.count({
        where: {
          estado: 'PENDIENTE',
        },
      }),
    ])

    // Gastos del mes
    const gastosMensual = await prisma.gasto.aggregate({
      where: {
        fecha: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        importe: true,
      },
    })

    const facturacionTotal = facturacionMensual._sum?.total || 0
    const gastosTotal = gastosMensual._sum?.importe || 0
    const balanceMensual = facturacionTotal - gastosTotal

    // Ingresos vs Gastos por mes (año actual)
    const currentYear = today.getFullYear()
    const monthlyData = []

    for (let month = 0; month < 12; month++) {
      const startDate = new Date(currentYear, month, 1)
      const endDate = new Date(currentYear, month + 1, 0, 23, 59, 59)

      const [ingresos, gastos] = await Promise.all([
        prisma.cita.aggregate({
          where: {
            fecha: {
              gte: startDate,
              lte: endDate,
            },
            estado: 'COMPLETADA',
          },
          _sum: {
            total: true,
          },
        }),
        prisma.gasto.aggregate({
          where: {
            fecha: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            importe: true,
          },
        }),
      ])

      monthlyData.push({
        mes: new Date(currentYear, month, 1).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase(),
        ingresos: ingresos._sum.total || 0,
        gastos: gastos._sum.importe || 0,
      })
    }

    // Top conceptos de ingresos (por servicios más facturados del mes actual)
    // Solo mostrar servicios que existan actualmente en el sistema
    
    // Obtener todos los servicios actuales (solo los activos)
    const todosServicios = await prisma.servicio.findMany({
      select: {
        id: true,
        nombre: true,
      },
    })

    // Si no hay servicios actuales, retornar array vacío
    if (todosServicios.length === 0) {
      return NextResponse.json({
        citasHoy: citasHoy || 0,
        facturacionMensual: facturacionTotal,
        gastosMensual: gastosTotal,
        balanceMensual,
        clientesTotal: clientesTotal || 0,
        citasPendientes: citasPendientes || 0,
        monthlyData,
        topConceptos: [],
      })
    }

    // Obtener IDs de facturas del mes actual
    const facturasDelMes = await prisma.factura.findMany({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        id: true,
      },
    })

    const facturasIds = facturasDelMes.map(f => f.id)

    // Si no hay facturas del mes, retornar array vacío
    if (facturasIds.length === 0) {
      return NextResponse.json({
        citasHoy: citasHoy || 0,
        facturacionMensual: facturacionTotal,
        gastosMensual: gastosTotal,
        balanceMensual,
        clientesTotal: clientesTotal || 0,
        citasPendientes: citasPendientes || 0,
        monthlyData,
        topConceptos: [],
      })
    }

    // Obtener items de esas facturas agrupados por descripción
    const serviciosFacturados = await prisma.factura_items.groupBy({
      by: ['descripcion'],
      where: {
        facturaId: {
          in: facturasIds,
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
      take: 20, // Obtenemos más para filtrar después
    })

    // Función helper para normalizar texto
    const normalizar = (texto: string): string => {
      return texto.trim().toLowerCase().replace(/\s+/g, ' ')
    }

    // Crear un mapa de nombre normalizado -> nombre actual del servicio
    const serviciosNormalizados = new Map(
      todosServicios.map(s => [normalizar(s.nombre), s.nombre])
    )

    // Solo incluir servicios que existan actualmente en el sistema
    const topConceptosConMatch = serviciosFacturados
      .map(item => {
        const descripcionNormalizada = normalizar(item.descripcion)
        
        // Buscar match exacto
        let nombreActual = serviciosNormalizados.get(descripcionNormalizada)
        
        // Si no hay match exacto, buscar por similitud
        if (!nombreActual) {
          for (const [nombreNorm, nombreReal] of serviciosNormalizados.entries()) {
            if (descripcionNormalizada.includes(nombreNorm) || nombreNorm.includes(descripcionNormalizada)) {
              nombreActual = nombreReal
              break
            }
          }
        }
        
        // Solo retornar si hay match con un servicio actual
        return nombreActual ? {
          concepto: nombreActual,
          total: item._sum.total || 0,
        } : null
      })
      .filter((item): item is { concepto: string; total: number } => item !== null) // Filtrar nulls

    // Agrupar por concepto
    const conceptosAgrupados = new Map<string, number>()
    topConceptosConMatch.forEach(item => {
      const totalActual = conceptosAgrupados.get(item.concepto) || 0
      conceptosAgrupados.set(item.concepto, totalActual + item.total)
    })

    // Convertir a array y ordenar - Top 5 servicios actuales
    const topConceptos = Array.from(conceptosAgrupados.entries())
      .map(([concepto, total]) => ({ concepto, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    return NextResponse.json({
      citasHoy: citasHoy || 0,
      facturacionMensual: facturacionTotal,
      gastosMensual: gastosTotal,
      balanceMensual,
      clientesTotal: clientesTotal || 0,
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
