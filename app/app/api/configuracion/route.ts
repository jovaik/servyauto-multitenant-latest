import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext } from '@/lib/local-context'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const localContext = await getLocalContext()
    const tenantId = localContext?.tenantId || null

    const whereClause: any = { orderBy: { categoria: 'asc' as const } }
    const where: any = {}
    if (tenantId) {
      where.tenantId = tenantId
    }

    const configuraciones = await prisma.configuracion.findMany({
      where,
      orderBy: { categoria: 'asc' }
    })

    return NextResponse.json(configuraciones)
  } catch (error) {
    console.error('Error fetching configuraciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const localContext = await getLocalContext()
    const tenantId = localContext?.tenantId || null

    const configData = await request.json()

    if (!Array.isArray(configData)) {
      return NextResponse.json(
        { error: 'Formato de datos inválido' },
        { status: 400 }
      )
    }

    const results = await Promise.all(
      configData.map((config) =>
        prisma.configuracion.upsert({
          where: { clave_tenantId: { clave: config.clave, tenantId: tenantId || '' } },
          update: {
            valor: config.valor,
            tipo: config.tipo,
            categoria: config.categoria,
            descripcion: config.descripcion
          },
          create: {
            clave: config.clave,
            valor: config.valor,
            tipo: config.tipo,
            categoria: config.categoria,
            descripcion: config.descripcion,
            ...(tenantId ? { tenantId } : {})
          }
        })
      )
    )

    return NextResponse.json({
      success: true,
      message: 'Configuración guardada correctamente',
      count: results.length
    })
  } catch (error) {
    console.error('Error saving configuraciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
