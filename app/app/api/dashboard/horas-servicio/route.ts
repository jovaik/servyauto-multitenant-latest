
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext, buildLocalFilter } from '@/lib/local-context'

export const dynamic = 'force-dynamic'

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

function getSunday(date: Date): Date {
  const monday = getMonday(date)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return sunday
}

function getQuarterRange(date: Date): { start: Date; end: Date } {
  const month = date.getMonth()
  const year = date.getFullYear()
  const quarterStart = Math.floor(month / 3) * 3
  return {
    start: new Date(year, quarterStart, 1),
    end: new Date(year, quarterStart + 3, 0, 23, 59, 59, 999),
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'hoy'
    const localIdParam = searchParams.get('localId') || ''

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let startDate: Date
    let endDate: Date

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
      case 'trimestral': {
        const q = getQuarterRange(today)
        startDate = q.start
        endDate = q.end
        break
      }
      case 'anual':
        startDate = new Date(today.getFullYear(), 0, 1)
        endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999)
        break
      default:
        startDate = new Date(today)
        endDate = new Date(today)
        endDate.setHours(23, 59, 59, 999)
    }

    // Build local filter
    let localFilter: any = {}
    if (localIdParam && localIdParam !== 'todos') {
      localFilter = { localId: localIdParam }
    } else {
      const localContext = await getLocalContext()
      if (localContext) {
        localFilter = buildLocalFilter(localContext)
      }
    }

    // Fetch citas in the period
    const citas = await prisma.cita.findMany({
      where: {
        fecha: {
          gte: startDate,
          lte: endDate,
        },
        estado: { in: ['COMPLETADA', 'EN_PROCESO', 'LISTO_PARA_RECOGER', 'PENDIENTE', 'CONFIRMADA'] },
        ...localFilter,
      },
      select: {
        horaInicio: true,
        horaFin: true,
      },
    })

    // Build hourly distribution (7:00 - 21:00)
    const hoursMap: Record<string, number> = {}
    for (let h = 7; h <= 21; h++) {
      const label = `${h.toString().padStart(2, '0')}:00`
      hoursMap[label] = 0
    }

    citas.forEach((cita: any) => {
      const hora = cita.horaInicio
      if (!hora) return
      // Extract the hour part, e.g. "09:30" -> 9
      const parts = hora.split(':')
      if (parts.length < 2) return
      const h = parseInt(parts[0], 10)
      if (isNaN(h)) return
      // Clamp to our range
      const clampedHour = Math.max(7, Math.min(21, h))
      const label = `${clampedHour.toString().padStart(2, '0')}:00`
      hoursMap[label] = (hoursMap[label] || 0) + 1
    })

    const horasData = Object.entries(hoursMap).map(([hora, servicios]) => ({
      hora,
      servicios,
    }))

    // Peak hour
    let peakHour = ''
    let peakCount = 0
    for (const [hora, count] of Object.entries(hoursMap)) {
      if (count > peakCount) {
        peakCount = count
        peakHour = hora
      }
    }

    // Total services
    const totalServicios = citas.length

    // Calculate average service duration in minutes
    let totalMinutos = 0
    let countDuracion = 0
    citas.forEach((cita: any) => {
      if (!cita.horaInicio || !cita.horaFin) return
      const [hi, mi] = cita.horaInicio.split(':').map(Number)
      const [hf, mf] = cita.horaFin.split(':').map(Number)
      if (isNaN(hi) || isNaN(mi) || isNaN(hf) || isNaN(mf)) return
      const diff = (hf * 60 + mf) - (hi * 60 + mi)
      if (diff > 0) {
        totalMinutos += diff
        countDuracion++
      }
    })
    const duracionMedia = countDuracion > 0 ? Math.round(totalMinutos / countDuracion) : 0

    // Active hours (hours with at least 1 service)
    const horasActivas = Object.values(hoursMap).filter(c => c > 0).length

    return NextResponse.json({
      horasData,
      peakHour,
      peakCount,
      totalServicios,
      duracionMedia,
      horasActivas,
    })
  } catch (error) {
    console.error('Error fetching horas de servicio:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
