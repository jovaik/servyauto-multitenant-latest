import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { requireSuperAdminForDelete } from '@/lib/activity-logger'

// GET - Obtener un cierre específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const cierre = await prisma.cierreCaja.findUnique({
      where: { id: params.id }
    })

    if (!cierre) {
      return NextResponse.json({ error: 'Cierre no encontrado' }, { status: 404 })
    }

    return NextResponse.json(cierre)
  } catch (error) {
    console.error('Error fetching cierre:', error)
    return NextResponse.json({ error: 'Error al obtener el cierre' }, { status: 500 })
  }
}

// PUT - Actualizar un cierre
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      fechaInicio, 
      fechaFin, 
      totalEfectivo, 
      totalTPVSumup, 
      totalTPVUnicaja,
      gastosEfectivo,
      gastosTarjeta,
      efectivoFinal,
      observaciones 
    } = body

    const cierre = await prisma.cierreCaja.update({
      where: { id: params.id },
      data: {
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        totalEfectivo,
        totalTPVSumup,
        totalTPVUnicaja,
        gastosEfectivo,
        gastosTarjeta,
        efectivoFinal,
        observaciones
      }
    })

    // NOTA: Los cierres de caja NO se sincronizan con GSControl
    // Solo se sincronizan facturas, tickets y gastos individuales

    return NextResponse.json(cierre)
  } catch (error) {
    console.error('Error updating cierre:', error)
    return NextResponse.json({ error: 'Error al actualizar el cierre' }, { status: 500 })
  }
}

// DELETE - Borrar un cierre
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardResponse = await requireSuperAdminForDelete()
    if (guardResponse) return guardResponse

    // Obtener el cierre antes de eliminarlo
    const cierre = await prisma.cierreCaja.findUnique({
      where: { id: params.id }
    })

    if (!cierre) {
      return NextResponse.json({ error: 'Cierre no encontrado' }, { status: 404 })
    }

    // NOTA: Los cierres de caja NO se sincronizan con GSControl
    // Solo se sincronizan facturas, tickets y gastos individuales

    // Borrar el cierre
    await prisma.cierreCaja.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Cierre eliminado correctamente' })
  } catch (error) {
    console.error('Error deleting cierre:', error)
    return NextResponse.json({ error: 'Error al eliminar el cierre' }, { status: 500 })
  }
}
