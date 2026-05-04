import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext, buildLocalFilter, getLocalIdForCreate } from '@/lib/local-context'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const localContext = await getLocalContext()
    if (!localContext) {
      return NextResponse.json({
        saldoActual: 0,
        ticketsComprados: 0,
        ticketsUsados: 0,
        alertaBajo: false,
        porLocal: []
      })
    }

    const localFilter = buildLocalFilter(localContext)
    const selectedLocalId = localContext ? getLocalIdForCreate(localContext) : null
    const tenantIdStats = localContext?.tenantId || null

    // Si hay un local seleccionado, devolver stats de ese local
    // Si es "Todos", devolver desglose por local
    if (selectedLocalId) {
      // Stats del local seleccionado
      const ultimoMovimiento = await prisma.inventarioTickets.findFirst({
        where: { localId: selectedLocalId, ...(tenantIdStats ? { tenantId: tenantIdStats } : {}) },
        orderBy: { createdAt: 'desc' }
      })
      const saldoActual = ultimoMovimiento?.saldoActual || 0

      const compras = await prisma.inventarioTickets.aggregate({
        where: {
          localId: selectedLocalId,
          tipo: { in: ['COMPRA', 'AJUSTE'] },
          cantidad: { gt: 0 },
          ...(tenantIdStats ? { tenantId: tenantIdStats } : {})
        },
        _sum: { cantidad: true }
      })

      const consumos = await prisma.inventarioTickets.aggregate({
        where: {
          localId: selectedLocalId,
          tipo: 'CONSUMO',
          ...(tenantIdStats ? { tenantId: tenantIdStats } : {})
        },
        _sum: { cantidad: true }
      })

      return NextResponse.json({
        saldoActual,
        ticketsComprados: compras._sum.cantidad || 0,
        ticketsUsados: Math.abs(consumos._sum.cantidad || 0),
        alertaBajo: saldoActual <= 10,
        porLocal: []
      })
    }

    // Vista "Todos los locales" - desglose por local (dentro del tenant)
    const locales = await prisma.local.findMany({
      where: { activo: true, ...(tenantIdStats ? { tenantId: tenantIdStats } : {}) },
      select: { id: true, nombre: true }
    })

    const porLocal: any[] = []
    let totalSaldo = 0
    let totalComprados = 0
    let totalUsados = 0

    for (const loc of locales) {
      const tenantFilter = tenantIdStats ? { tenantId: tenantIdStats } : {}
      const ultimo = await prisma.inventarioTickets.findFirst({
        where: { localId: loc.id, ...tenantFilter },
        orderBy: { createdAt: 'desc' }
      })
      const saldo = ultimo?.saldoActual || 0

      const compras = await prisma.inventarioTickets.aggregate({
        where: {
          localId: loc.id,
          tipo: { in: ['COMPRA', 'AJUSTE'] },
          cantidad: { gt: 0 },
          ...tenantFilter
        },
        _sum: { cantidad: true }
      })

      const consumos = await prisma.inventarioTickets.aggregate({
        where: {
          localId: loc.id,
          tipo: 'CONSUMO',
          ...tenantFilter
        },
        _sum: { cantidad: true }
      })

      const comp = compras._sum.cantidad || 0
      const usados = Math.abs(consumos._sum.cantidad || 0)

      porLocal.push({
        localId: loc.id,
        localNombre: loc.nombre,
        saldoActual: saldo,
        ticketsComprados: comp,
        ticketsUsados: usados,
        alertaBajo: saldo <= 10
      })

      totalSaldo += saldo
      totalComprados += comp
      totalUsados += usados
    }

    // Incluir movimientos sin local (históricos)
    const sinLocal = await prisma.inventarioTickets.findFirst({
      where: { localId: null },
      orderBy: { createdAt: 'desc' }
    })
    if (sinLocal) {
      const comprasSinLocal = await prisma.inventarioTickets.aggregate({
        where: { localId: null, tipo: { in: ['COMPRA', 'AJUSTE'] }, cantidad: { gt: 0 } },
        _sum: { cantidad: true }
      })
      const consumosSinLocal = await prisma.inventarioTickets.aggregate({
        where: { localId: null, tipo: 'CONSUMO' },
        _sum: { cantidad: true }
      })
      const saldoSinLocal = sinLocal?.saldoActual || 0
      if (saldoSinLocal > 0 || (comprasSinLocal._sum.cantidad || 0) > 0) {
        porLocal.push({
          localId: null,
          localNombre: 'Sin asignar (histórico)',
          saldoActual: saldoSinLocal,
          ticketsComprados: comprasSinLocal._sum.cantidad || 0,
          ticketsUsados: Math.abs(consumosSinLocal._sum.cantidad || 0),
          alertaBajo: false
        })
        totalSaldo += saldoSinLocal
        totalComprados += (comprasSinLocal._sum.cantidad || 0)
        totalUsados += Math.abs(consumosSinLocal._sum.cantidad || 0)
      }
    }

    return NextResponse.json({
      saldoActual: totalSaldo,
      ticketsComprados: totalComprados,
      ticketsUsados: totalUsados,
      alertaBajo: totalSaldo <= 10,
      porLocal
    })
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
