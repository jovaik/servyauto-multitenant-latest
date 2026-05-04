
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const headersList = headers()
    const tenantSlug = headersList.get('x-tenant-slug') || 'default'

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true }
    })

    const tenantFilter = tenant ? { tenantId: tenant.id } : {}

    const configuraciones = await prisma.configuracion.findMany({
      where: {
        categoria: 'publica',
        ...tenantFilter
      }
    })

    const config: Record<string, string> = {}
    configuraciones.forEach((item: any) => {
      config[item.clave] = item.valor
    })

    if (Object.keys(config).length === 0) {
      return NextResponse.json({
        'publica.nombre': 'ServyAuto',
        'publica.subtitulo': 'Lavado & Detailing',
        'publica.telefono': '600-123-456',
        'publica.email': '',
        'publica.titulo_servicios': 'Nuestros Servicios',
        'publica.descripcion_servicios': 'Desde lavados básicos hasta tratamientos premium de protección.',
        'publica.cta_texto': '¿Listo para transformar tu vehículo?',
        'publica.cta_subtexto': 'Únete a más de 1.000 clientes satisfechos.',
        'publica.sabado_apertura': '10:00',
        'publica.sabado_cierre': '19:00',
        'publica.domingo_cerrado': 'true',
        'publica.domingo_apertura': '10:00',
        'publica.domingo_cierre': '14:00',
        'publica.color_fondo': '#f0f7ff'
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    return NextResponse.json(config, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error fetching public configuration:', error)
    return NextResponse.json({ error: 'Error al cargar configuración' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const headersList = headers()
    const tenantSlug = headersList.get('x-tenant-slug') || 'default'

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true }
    })

    const tenantId = tenant?.id || null

    const body = await request.json()

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const saved = []
    for (const [clave, valor] of Object.entries(body)) {
      if (typeof valor === 'string') {
        await prisma.configuracion.upsert({
          where: { clave_tenantId: { clave, tenantId: tenantId || '' } },
          update: { valor, categoria: 'publica' },
          create: {
            clave,
            valor,
            tipo: 'TEXTO',
            categoria: 'publica',
            descripcion: `Configuración pública: ${clave}`,
            ...(tenantId ? { tenantId } : {})
          }
        })
        saved.push(clave)
      }
    }

    return NextResponse.json({
      success: true,
      saved: saved.length,
      message: 'Configuración guardada correctamente'
    })
  } catch (error) {
    console.error('Error saving public configuration:', error)
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 })
  }
}
