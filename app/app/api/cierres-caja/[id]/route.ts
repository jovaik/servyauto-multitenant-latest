import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { updateInGSControl, deleteFromGSControl, getExternalIdFromDate } from '@/lib/gscontrol-sync'

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

    // 🔄 SINCRONIZAR ACTUALIZACIÓN CON GSCONTROL
    // Los cierres de caja generan múltiples transacciones (efectivo, tarjeta, gastos)
    try {
      const transactionsToUpdate: any[] = [];

      // Actualizar transacción de efectivo
      if (totalEfectivo > 0) {
        transactionsToUpdate.push({
          externalId: getExternalIdFromDate('CIE', `${cierre.id}-EFE`, cierre.createdAt),
          amount: totalEfectivo,
          date: cierre.fechaFin.toISOString(),
          description: `Cierre de caja - Efectivo (actualizado)`,
        });
      }

      // Actualizar transacción de TPV SumUp
      if (totalTPVSumup > 0) {
        transactionsToUpdate.push({
          externalId: getExternalIdFromDate('CIE', `${cierre.id}-SUM`, cierre.createdAt),
          amount: totalTPVSumup,
          date: cierre.fechaFin.toISOString(),
          description: `Cierre de caja - TPV SumUp (actualizado)`,
        });
      }

      // Actualizar transacción de TPV Unicaja
      if (totalTPVUnicaja > 0) {
        transactionsToUpdate.push({
          externalId: getExternalIdFromDate('CIE', `${cierre.id}-UNI`, cierre.createdAt),
          amount: totalTPVUnicaja,
          date: cierre.fechaFin.toISOString(),
          description: `Cierre de caja - TPV Unicaja (actualizado)`,
        });
      }

      // Actualizar gastos del cierre
      const totalGastos = gastosEfectivo + gastosTarjeta;
      if (totalGastos > 0) {
        transactionsToUpdate.push({
          externalId: getExternalIdFromDate('CIE', `${cierre.id}-GAS`, cierre.createdAt),
          amount: -Math.abs(totalGastos), // GASTOS SIEMPRE NEGATIVOS
          date: cierre.fechaFin.toISOString(),
          description: `Gastos del día - ${observaciones || 'Sin detalles'} (actualizado)`,
        });
      }

      if (transactionsToUpdate.length > 0) {
        updateInGSControl(transactionsToUpdate)
          .catch(err => console.error('[GSControl] Error al actualizar cierre de caja:', err));
      }
    } catch (syncError) {
      console.error('⚠️ Error al sincronizar actualización con GSControl (no crítico):', syncError);
      // No fallar la operación si GSControl falla
    }

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
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener el cierre antes de eliminarlo (para sincronizar)
    const cierre = await prisma.cierreCaja.findUnique({
      where: { id: params.id }
    })

    if (!cierre) {
      return NextResponse.json({ error: 'Cierre no encontrado' }, { status: 404 })
    }

    // 🔄 SINCRONIZAR ELIMINACIÓN CON GSCONTROL (antes de borrar)
    // Los cierres generan múltiples transacciones
    try {
      const externalIdsToDelete: string[] = [];

      // IDs de todas las transacciones del cierre
      if (cierre.totalEfectivo > 0) {
        externalIdsToDelete.push(getExternalIdFromDate('CIE', `${cierre.id}-EFE`, cierre.createdAt));
      }
      if (cierre.totalTPVSumup > 0) {
        externalIdsToDelete.push(getExternalIdFromDate('CIE', `${cierre.id}-SUM`, cierre.createdAt));
      }
      if (cierre.totalTPVUnicaja > 0) {
        externalIdsToDelete.push(getExternalIdFromDate('CIE', `${cierre.id}-UNI`, cierre.createdAt));
      }
      const totalGastos = cierre.gastosEfectivo + cierre.gastosTarjeta;
      if (totalGastos > 0) {
        externalIdsToDelete.push(getExternalIdFromDate('CIE', `${cierre.id}-GAS`, cierre.createdAt));
      }

      if (externalIdsToDelete.length > 0) {
        deleteFromGSControl(externalIdsToDelete)
          .catch(err => console.error('[GSControl] Error al eliminar cierre de caja:', err));
      }
    } catch (syncError) {
      console.error('⚠️ Error al sincronizar eliminación con GSControl (no crítico):', syncError);
      // No fallar la operación si GSControl falla
    }

    await prisma.cierreCaja.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Cierre eliminado correctamente' })
  } catch (error) {
    console.error('Error deleting cierre:', error)
    return NextResponse.json({ error: 'Error al eliminar el cierre' }, { status: 500 })
  }
}
