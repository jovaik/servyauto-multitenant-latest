import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Caché en memoria con TTL de 60 segundos
const tenantCache = new Map<string, { tenantId: string; nombre: string; activo: boolean; expiresAt: number }>()

const CACHE_TTL_MS = 60 * 1000

// Rutas que no requieren autenticación
const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/api/tenants/current/public',
  '/api/tenants/resolve',
  '/api/reservas/publica',
  '/api/locales/publicos',
  '/api/configuracion/publica',
  '/_next',
  '/favicon',
  '/public',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p))
}

async function getTenantFromDb(slug: string): Promise<{ tenantId: string; nombre: string; activo: boolean } | null> {
  const cached = tenantCache.get(slug)
  if (cached && cached.expiresAt > Date.now()) {
    return { tenantId: cached.tenantId, nombre: cached.nombre, activo: cached.activo }
  }

  try {
    // Fetch tenant via internal API (Prisma no funciona en Edge middleware)
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005'
    const res = await fetch(baseUrl + '/api/tenants/resolve?slug=' + encodeURIComponent(slug), {
      headers: { 'x-internal-key': process.env.NEXTAUTH_SECRET || '' },
      cache: 'no-store'
    })

    if (!res.ok) return null
    const tenant = await res.json()

    tenantCache.set(slug, {
      tenantId: tenant.id,
      nombre: tenant.nombre,
      activo: tenant.activo,
      expiresAt: Date.now() + CACHE_TTL_MS
    })

    return { tenantId: tenant.id, nombre: tenant.nombre, activo: tenant.activo }
  } catch (error) {
    console.error('Error en middleware getTenantFromDb:', error)
    return null
  }
}

function extractSlug(host: string): string {
  // Quitar el puerto si existe
  const hostname = host.split(':')[0]

  // localhost o dominio raíz → slug = default
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'servyauto.com' ||
    hostname === 'www.servyauto.com' ||
    !hostname.includes('.')
  ) {
    return process.env.DEFAULT_TENANT_SLUG || 'default'
  }

  // Detectar si es un subdominio de servyauto.com
  const parts = hostname.split('.')
  if (parts.length >= 3 && hostname.endsWith('.servyauto.com')) {
    return parts[0]
  }

  // Para entornos de desarrollo con dominios tipo replit.app
  // tratar todo como default
  return process.env.DEFAULT_TENANT_SLUG || 'default'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') || ''

  // Extraer slug del subdominio
  const slug = extractSlug(host)

  // Clonar los headers para modificarlos
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-slug', slug)

  // Para rutas públicas que no necesitan validación de tenant
  if (isPublicPath(pathname)) {
    return NextResponse.next({
      request: { headers: requestHeaders }
    })
  }

  // Verificar que el tenant existe y está activo
  const tenant = await getTenantFromDb(slug)

  if (!tenant) {
    // Tenant no encontrado → 404
    return new NextResponse('Tenant no encontrado', { status: 404 })
  }

  if (!tenant.activo) {
    return new NextResponse('Este taller no está disponible actualmente', { status: 404 })
  }

  // Inyectar también el tenantId en los headers
  requestHeaders.set('x-tenant-id', tenant.tenantId)

  // Verificar autenticación para rutas protegidas (no-API)
  if (!pathname.startsWith('/api/')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })

    if (!token && pathname !== '/login') {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders }
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
