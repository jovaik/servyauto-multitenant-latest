export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { requireSuperAdminForDelete } from '@/lib/activity-logger'

// GET: Obtener overrides de un local
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const localId = searchParams.get('localId')
    const tipo = searchParams.get('tipo') // 'categoria' | 'precio' | null (ambos)

    if (!localId) {
      return NextResponse.json({ error: 'localId requerido' }, { status: 400 })
    }

    const result: any = {}

    if (!tipo || tipo === 'categoria') {
      result.categoriaOverrides = await prisma.categoriaOverrideLocal.findMany({
        where: { localId },
        orderBy: [{ marca: 'asc' }, { modelo: 'asc' }],
      })
    }

    if (!tipo || tipo === 'precio') {
      result.precioOverrides = await prisma.precioOverrideLocal.findMany({
        where: { localId },
        include: { servicio: { select: { id: true, nombre: true, precio: true } } },
        orderBy: { servicio: { nombre: 'asc' } },
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error obteniendo overrides:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST: Crear o actualizar un override
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { tipo, localId } = body

    if (!localId || !tipo) {
      return NextResponse.json({ error: 'localId y tipo requeridos' }, { status: 400 })
    }

    if (tipo === 'categoria') {
      const { marca, modelo, categoria } = body
      if (!marca || !modelo || !categoria) {
        return NextResponse.json({ error: 'marca, modelo y categoria requeridos' }, { status: 400 })
      }
      const validCats = ['PEQ', 'MED', 'GR', 'EXTGR']
      if (!validCats.includes(categoria)) {
        return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
      }

      const override = await prisma.categoriaOverrideLocal.upsert({
        where: { localId_marca_modelo: { localId, marca: marca.toUpperCase().trim(), modelo: modelo.toUpperCase().trim() } },
        update: { categoria },
        create: { localId, marca: marca.toUpperCase().trim(), modelo: modelo.toUpperCase().trim(), categoria },
      })
      return NextResponse.json(override)
    }

    if (tipo === 'precio') {
      const { servicioId, precio } = body
      if (!servicioId || precio === undefined || precio === null) {
        return NextResponse.json({ error: 'servicioId y precio requeridos' }, { status: 400 })
      }

      const override = await prisma.precioOverrideLocal.upsert({
        where: { localId_servicioId: { localId, servicioId } },
        update: { precio: parseFloat(precio) },
        create: { localId, servicioId, precio: parseFloat(precio) },
      })
      return NextResponse.json(override)
    }

    return NextResponse.json({ error: 'Tipo inválido (categoria o precio)' }, { status: 400 })
  } catch (error) {
    console.error('Error creando override:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// DELETE: Eliminar un override
export async function DELETE(request: NextRequest) {
  try {
    const guardResponse = await requireSuperAdminForDelete()
    if (guardResponse) return guardResponse

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const tipo = searchParams.get('tipo')

    if (!id || !tipo) {
      return NextResponse.json({ error: 'id y tipo requeridos' }, { status: 400 })
    }

    if (tipo === 'categoria') {
      await prisma.categoriaOverrideLocal.delete({ where: { id } })
    } else if (tipo === 'precio') {
      await prisma.precioOverrideLocal.delete({ where: { id } })
    } else {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error eliminando override:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
