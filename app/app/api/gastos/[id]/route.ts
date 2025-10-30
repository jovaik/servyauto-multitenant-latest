
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { updateInGSControl, deleteFromGSControl, getExternalIdFromDate } from '@/lib/gscontrol-sync'

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
    console.log('Datos recibidos para actualizar gasto:', body)
    
    const { 
      concepto, 
      fecha, 
      proveedor, 
      tipoGasto, 
      importe, 
      metodoPago, 
      tipo, 
      iva,
      numeroFactura,
      proveedorCIF,
      proveedorDireccion,
      proveedorCodigoPostal,
      proveedorCiudad,
      proveedorProvincia
    } = body

    // Validar campos requeridos
    if (!concepto || !fecha || !tipoGasto || !importe || !metodoPago) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: concepto, fecha, tipoGasto, importe, metodoPago' },
        { status: 400 }
      )
    }

    // Si es FACTURA, validar campos fiscales adicionales
    if (tipo === 'FACTURA') {
      if (!numeroFactura || !proveedor || !proveedorCIF || !proveedorDireccion || 
          !proveedorCodigoPostal || !proveedorCiudad || !proveedorProvincia) {
        return NextResponse.json(
          { error: 'Para facturas se requieren todos los datos fiscales del proveedor' },
          { status: 400 }
        )
      }
    }

    const gasto = await prisma.gasto.update({
      where: { id: params.id },
      data: {
        concepto,
        fecha: new Date(fecha),
        proveedor: proveedor || null,
        tipoGasto,
        importe: parseFloat(importe),
        metodoPago: metodoPago as any,
        tipo: tipo || 'TICKET',
        iva: parseFloat(iva) || 21,
        // Campos fiscales (solo para FACTURA)
        numeroFactura: numeroFactura || null,
        proveedorCIF: proveedorCIF || null,
        proveedorDireccion: proveedorDireccion || null,
        proveedorCodigoPostal: proveedorCodigoPostal || null,
        proveedorCiudad: proveedorCiudad || null,
        proveedorProvincia: proveedorProvincia || null
      }
    })

    console.log('Gasto actualizado exitosamente:', gasto.id)

    // 🔄 SINCRONIZAR ACTUALIZACIÓN CON GSCONTROL
    try {
      const externalId = getExternalIdFromDate('GAS', gasto.id, gasto.createdAt);

      // Preparar actualización para GSControl
      const updateForGSControl: any = { 
        externalId,
        amount: gasto.importe,
        description: gasto.concepto,
        date: gasto.fecha.toISOString(),
        ivaRate: gasto.iva,
        costCategory: gasto.tipoGasto || 'OTROS'
      };

      if (gasto.numeroFactura) {
        updateForGSControl.documentType = 'FACTURA';
        updateForGSControl.invoiceNumber = gasto.numeroFactura;
      } else {
        updateForGSControl.documentType = 'NO APLICA';
      }

      await updateInGSControl([updateForGSControl]);
      console.log('✅ Gasto actualizado en GSControl');
    } catch (syncError) {
      console.error('⚠️ Error al sincronizar actualización con GSControl (no crítico):', syncError);
      // No fallar la operación si GSControl falla
    }

    return NextResponse.json(gasto)
  } catch (error) {
    console.error('Error updating gasto:', error)
    return NextResponse.json(
      { error: 'Error al actualizar gasto: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener el gasto antes de eliminarlo (para sincronizar)
    const gasto = await prisma.gasto.findUnique({
      where: { id: params.id }
    })

    if (!gasto) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
    }

    // 🔄 SINCRONIZAR ELIMINACIÓN CON GSCONTROL (antes de borrar)
    try {
      const externalId = getExternalIdFromDate('GAS', gasto.id, gasto.createdAt);
      await deleteFromGSControl([externalId]);
      console.log('✅ Gasto eliminado de GSControl');
    } catch (syncError) {
      console.error('⚠️ Error al sincronizar eliminación con GSControl (no crítico):', syncError);
      // No fallar la operación si GSControl falla
    }

    await prisma.gasto.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Gasto eliminado' })
  } catch (error) {
    console.error('Error deleting gasto:', error)
    return NextResponse.json({ error: 'Error al eliminar gasto' }, { status: 500 })
  }
}
