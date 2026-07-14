
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo SUPER_ADMIN puede ver los logs
    const role = (session.user as any).role
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const userId = searchParams.get('userId')
    const entity = searchParams.get('entity')
    const action = searchParams.get('action')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')

    // Build where clause
    const where: any = {}

    if (userId) {
      where.userId = userId
    }
    if (entity) {
      where.entity = entity
    }
    if (action) {
      where.action = action
    }
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        // End of day
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { userName: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ])

    // Get unique users for filter dropdown
    const users = await prisma.activityLog.findMany({
      select: {
        userId: true,
        userName: true,
        userEmail: true,
      },
      distinct: ['userId'],
      where: { userId: { not: null } },
      orderBy: { userName: 'asc' },
    })

    // Get unique entities for filter dropdown
    const entities = await prisma.activityLog.findMany({
      select: { entity: true },
      distinct: ['entity'],
      orderBy: { entity: 'asc' },
    })

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        users: users.filter(u => u.userId),
        entities: entities.map(e => e.entity),
        actions: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'CONVERT', 'VIEW', 'CONFIG'],
      }
    })
  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return NextResponse.json(
      { error: 'Error al obtener los registros de actividad' },
      { status: 500 }
    )
  }
}
