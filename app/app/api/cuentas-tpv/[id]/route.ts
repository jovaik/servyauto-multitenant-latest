import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { requireSuperAdminForDelete } from '@/lib/activity-logger'

export const dynamic = 'force-dynamic'

// PUT - Actualizar cuenta TPV (ADMIN / SUPER_ADMIN)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        { error: 'Solo un administrador puede modificar cuentas TPV' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data: any = {}
    if (body.nombre !== undefined) data.nombre = body.nombre.toString().trim().toUpperCase()
    if (body.proveedor !== undefined) data.proveedor = body.proveedor.toString().toUpperCase()
    // Las claves solo se actualizan si vienen con valor (no se borran al dejar en blanco
    // salvo que se mande explícitamente null para limpiar).
    if (body.sumupApiKey !== undefined) {
      data.sumupApiKey = body.sumupApiKey ? body.sumupApiKey.toString().trim() : null
    }
    if (body.sumupAffiliateKey !== undefined) {
      data.sumupAffiliateKey = body.sumupAffiliateKey ? body.sumupAffiliateKey.toString().trim() : null
    }
    if (body.userId !== undefined) data.userId = body.userId || null
    if (body.localId !== undefined) data.localId = body.localId || null
    if (body.activo !== undefined) data.activo = !!body.activo
    if (body.esDefault !== undefined) data.esDefault = !!body.esDefault

    const cuenta = await prisma.cuentaTpv.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ cuenta: { id: cuenta.id, nombre: cuenta.nombre } })
  } catch (error: any) {
    console.error('Error actualizando cuenta TPV:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar cuenta TPV' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar cuenta TPV (SUPER_ADMIN). No se borra si tiene datafonos asociados.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardResponse = await requireSuperAdminForDelete()
    if (guardResponse) return guardResponse

    const cuenta = await prisma.cuentaTpv.findUnique({
      where: { id: params.id },
      include: { readers: true },
    })
    if (!cuenta) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 })
    }
    if (cuenta.esDefault) {
      return NextResponse.json(
        { error: 'No se puede eliminar la cuenta TPV por defecto' },
        { status: 400 }
      )
    }
    if (cuenta.readers.length > 0) {
      return NextResponse.json(
        { error: 'Esta cuenta tiene datafonos asociados. Reasígnalos antes de eliminarla.' },
        { status: 400 }
      )
    }

    await prisma.cuentaTpv.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error eliminando cuenta TPV:', error)
    return NextResponse.json(
      { error: error.message || 'Error al eliminar cuenta TPV' },
      { status: 500 }
    )
  }
}
