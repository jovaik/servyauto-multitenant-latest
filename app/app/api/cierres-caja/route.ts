
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const cierres = await prisma.cierreCaja.findMany({
      orderBy: {
        fechaFin: 'desc'
      }
    })

    return NextResponse.json(cierres)
  } catch (error) {
    console.error('Error fetching cierres:', error)
    return NextResponse.json({ error: 'Error al obtener cierres' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = (session.user as any).id
    
    if (!userId) {
      return NextResponse.json({ error: 'Usuario inválido. Por favor, cierra sesión y vuelve a iniciar sesión.' }, { status: 401 })
    }

    const body = await request.json()
    const { fechaInicio, fechaFin, observaciones } = body

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json(
        { error: 'Fechas de inicio y fin son requeridas' },
        { status: 400 }
      )
    }

    const startDate = new Date(fechaInicio)
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(fechaFin)
    endDate.setHours(23, 59, 59, 999)

    // Obtener IDs de citas que ya tienen factura asociada (para evitar duplicados)
    const citasConFactura = await prisma.factura.findMany({
      where: {
        citaId: { not: null }
      },
      select: {
        citaId: true
      }
    })
    const citasConFacturaIds = citasConFactura
      .map((f: any) => f.citaId)
      .filter((id: any): id is string => id !== null && id !== undefined)

    // Calcular totales de ventas (facturas pagadas)
    const facturas = await prisma.factura.findMany({
      where: {
        fecha: {
          gte: startDate,
          lte: endDate
        },
        estado: 'PAGADA'
      }
    })

    // Obtener citas completadas SIN factura (para incluirlas en el total)
    const citasCompletadas = await prisma.cita.findMany({
      where: {
        fecha: {
          gte: startDate,
          lte: endDate
        },
        estado: 'COMPLETADA',
        id: { notIn: citasConFacturaIds }
      }
    })

    // Sumar ventas de facturas
    let totalEfectivo = facturas
      .filter((f: any) => f.metodoPago === 'EFECTIVO')
      .reduce((sum: number, f: any) => sum + f.total, 0)

    let totalTPVSumup = facturas
      .filter((f: any) => f.metodoPago === 'TPV_SUMUP')
      .reduce((sum: number, f: any) => sum + f.total, 0)

    let totalTPVUnicaja = facturas
      .filter((f: any) => f.metodoPago === 'TPV_UNICAJA')
      .reduce((sum: number, f: any) => sum + f.total, 0)

    // Sumar ventas de citas completadas sin factura
    for (const cita of citasCompletadas) {
      const metodoPago = cita.metodoPago || 'EFECTIVO'
      const totalCita = cita.total || 0
      
      if (metodoPago === 'EFECTIVO') {
        totalEfectivo += totalCita
      } else if (metodoPago === 'TPV_SUMUP') {
        totalTPVSumup += totalCita
      } else if (metodoPago === 'TPV_UNICAJA') {
        totalTPVUnicaja += totalCita
      }
    }

    // Calcular totales de gastos
    const gastos = await prisma.gasto.findMany({
      where: {
        fecha: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const gastosEfectivo = gastos
      .filter((g: any) => g.metodoPago === 'EFECTIVO')
      .reduce((sum: number, g: any) => sum + g.importe, 0)

    const gastosTarjeta = gastos
      .filter((g: any) => g.metodoPago === 'TPV_SUMUP' || g.metodoPago === 'TPV_UNICAJA')
      .reduce((sum: number, g: any) => sum + g.importe, 0)

    const efectivoFinal = totalEfectivo - gastosEfectivo

    // Crear el cierre de caja
    const cierre = await prisma.cierreCaja.create({
      data: {
        fechaInicio: startDate,
        fechaFin: endDate,
        totalEfectivo,
        totalTPVSumup,
        totalTPVUnicaja,
        gastosEfectivo,
        gastosTarjeta,
        efectivoFinal,
        observaciones: observaciones || null,
        usuarioId: userId
      }
    })

    // ⚠️ Los cierres de caja NO se sincronizan con GSControl según instrucciones
    // Solo se sincronizan facturas y gastos individuales

    logActivity({ action: 'CREATE', entity: 'CIERRE_CAJA', entityId: cierre.id, description: `Cierre de caja creado` }).catch(() => {})

    return NextResponse.json(cierre, { status: 201 })
  } catch (error) {
    console.error('Error creating cierre:', error)
    return NextResponse.json(
      { error: 'Error al crear cierre: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
