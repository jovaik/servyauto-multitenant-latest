import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Listar locales activos del tenant actual (endpoint público para reservas)
export async function GET() {
  try {
    const headersList = headers()
    const tenantSlug = headersList.get('x-tenant-slug') || 'default'

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true }
    })

    const tenantFilter = tenant ? { tenantId: tenant.id } : {}

    const locales = await prisma.local.findMany({
      where: { activo: true, ...tenantFilter },
      select: {
        id: true,
        nombre: true,
        nombreComercial: true,
        direccion: true,
        ciudad: true,
      },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json(locales)
  } catch (error) {
    console.error('Error listando locales públicos:', error)
    return NextResponse.json([], { status: 200 })
  }
}
