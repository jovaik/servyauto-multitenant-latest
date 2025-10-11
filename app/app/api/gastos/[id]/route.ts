
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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

    await prisma.gasto.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Gasto eliminado' })
  } catch (error) {
    console.error('Error deleting gasto:', error)
    return NextResponse.json({ error: 'Error al eliminar gasto' }, { status: 500 })
  }
}
