import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { unpairReader } from '@/lib/sumup'
import { prisma } from '@/lib/db'

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

    const { nombre, localId } = await request.json()

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
        },
      })
    }

    // Obtener con local
    const reader = await prisma.sumUpReader.findUnique({
      where: { id: dbReader.id },
      include: { local: true },
    })

    return NextResponse.json({ 
      reader: {
        id: params.id,
        name: reader?.nombre,
        localId: reader?.localId,
        localNombre: reader?.local?.nombre || null,
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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Desemparejar en SumUp
    await unpairReader(params.id)

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
