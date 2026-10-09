import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { unpairReader, getLocalSumUpKeys } from '@/lib/sumup'
import { prisma } from '@/lib/db'
import { requireSuperAdminForDelete } from '@/lib/activity-logger'

// PUT - Actualizar lector (asignar/desasignar local)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { nombre, localId, userId } = await request.json()

    // Buscar el lector en nuestra BD por sumupReaderId
    let dbReader = await prisma.sumUpReader.findUnique({
      where: { sumupReaderId: params.id },
    })

    if (!dbReader) {
      // Si no existe, crearlo
      dbReader = await prisma.sumUpReader.create({
        data: {
          sumupReaderId: params.id,
          nombre: nombre || `Terminal ${params.id.slice(-4)}`,
          localId: localId || null,
          userId: userId || null,
          activo: true,
        },
      })
    } else {
      // Actualizar
      dbReader = await prisma.sumUpReader.update({
        where: { id: dbReader.id },
        data: {
          nombre: nombre !== undefined ? nombre : dbReader.nombre,
          localId: localId !== undefined ? localId : dbReader.localId,
          userId: userId !== undefined ? (userId || null) : dbReader.userId,
        },
      })
    }

    // Obtener con local
    const reader = await prisma.sumUpReader.findUnique({
      where: { id: dbReader.id },
      include: { local: true, user: { select: { id: true, name: true, email: true } } },
    })

    return NextResponse.json({ 
      reader: {
        id: params.id,
        name: reader?.nombre,
        localId: reader?.localId,
        localNombre: reader?.local?.nombre || null,
        userId: reader?.userId || null,
        userNombre: reader?.user?.name || reader?.user?.email || null,
      }
    })
  } catch (error: any) {
    console.error('Error actualizando lector SumUp:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar lector' },
      { status: 500 }
    )
  }
}

// DELETE - Desemparejar lector
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardResponse = await requireSuperAdminForDelete()
    if (guardResponse) return guardResponse

    // Buscar el local del reader para usar su API key
    const dbReaderForUnpair = await prisma.sumUpReader.findUnique({
      where: { sumupReaderId: params.id },
      select: { localId: true },
    })
    const localKeysUnpair = await getLocalSumUpKeys(dbReaderForUnpair?.localId)

    // Desemparejar en SumUp
    await unpairReader(params.id, localKeysUnpair.apiKey)

    // Eliminar de nuestra BD
    await prisma.sumUpReader.deleteMany({
      where: { sumupReaderId: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error desemparejando lector SumUp:', error)
    return NextResponse.json(
      { error: error.message || 'Error al desemparejar lector' },
      { status: 500 }
    )
  }
}
