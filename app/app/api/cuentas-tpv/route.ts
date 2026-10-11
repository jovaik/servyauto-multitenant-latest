import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Listar cuentas TPV
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const cuentas = await prisma.cuentaTpv.findMany({
      orderBy: [{ esDefault: 'desc' }, { createdAt: 'asc' }],
    })

    // Resolver nombres de usuario/local (sin relación Prisma): lookups en batch.
    const userIds = Array.from(new Set(cuentas.map((c) => c.userId).filter(Boolean))) as string[]
    const localIds = Array.from(new Set(cuentas.map((c) => c.localId).filter(Boolean))) as string[]
    const [users, locs] = await Promise.all([
      userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }) : Promise.resolve([]),
      localIds.length ? prisma.local.findMany({ where: { id: { in: localIds } }, select: { id: true, nombre: true } }) : Promise.resolve([]),
    ])
    const userMap = new Map(users.map((u) => [u.id, u.name || u.email]))
    const localMap = new Map(locs.map((l) => [l.id, l.nombre]))

    // No exponer las claves completas al cliente; solo indicar si están puestas.
    const safe = cuentas.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      proveedor: c.proveedor,
      tieneApiKey: !!c.sumupApiKey,
      tieneAffiliateKey: !!c.sumupAffiliateKey,
      userId: c.userId,
      userNombre: c.userId ? (userMap.get(c.userId) || null) : null,
      localId: c.localId,
      localNombre: c.localId ? (localMap.get(c.localId) || null) : null,
      activo: c.activo,
      esDefault: c.esDefault,
    }))

    return NextResponse.json({ cuentas: safe })
  } catch (error: any) {
    console.error('Error listando cuentas TPV:', error)
    return NextResponse.json(
      { error: error.message || 'Error al listar cuentas TPV' },
      { status: 500 }
    )
  }
}

// POST - Crear cuenta TPV (ADMIN / SUPER_ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || '' },
    })
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Solo un administrador puede crear cuentas TPV' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const nombre = (body.nombre || '').toString().trim().toUpperCase()
    if (!nombre) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    const cuenta = await prisma.cuentaTpv.create({
      data: {
        nombre,
        proveedor: (body.proveedor || 'SUMUP').toString().toUpperCase(),
        sumupApiKey: body.sumupApiKey ? body.sumupApiKey.toString().trim() : null,
        sumupAffiliateKey: body.sumupAffiliateKey ? body.sumupAffiliateKey.toString().trim() : null,
        userId: body.userId || null,
        localId: body.localId || null,
        activo: body.activo !== undefined ? !!body.activo : true,
        esDefault: !!body.esDefault,
      },
    })

    return NextResponse.json({ cuenta: { id: cuenta.id, nombre: cuenta.nombre } })
  } catch (error: any) {
    console.error('Error creando cuenta TPV:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear cuenta TPV' },
      { status: 500 }
    )
  }
}
