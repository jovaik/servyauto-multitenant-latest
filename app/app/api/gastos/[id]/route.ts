
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notificarModificacionGSControl, notificarEliminacionGSControl, mapearCategoriaGasto } from '@/lib/gscontrol-sync'

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
      proveedorId, 
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
    if (!concepto || !fecha || !tipoGasto || !importe) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: concepto, fecha, tipoGasto, importe' },
        { status: 400 }
      )
    }

    // Registrar proveedor automáticamente si hay nombre
    let proveedorRegistradoId = proveedorId || null
    if (proveedor && !proveedorId) {
      // Buscar si ya existe
      const proveedorExistente = await prisma.proveedor.findFirst({
        where: { nombre: { equals: proveedor, mode: 'insensitive' } }
      })
      
      if (proveedorExistente) {
        proveedorRegistradoId = proveedorExistente.id
        // Actualizar datos fiscales si los hay
        if (proveedorCIF || proveedorDireccion) {
          await prisma.proveedor.update({
            where: { id: proveedorExistente.id },
            data: {
              cif: proveedorCIF || proveedorExistente.cif,
              direccion: proveedorDireccion || proveedorExistente.direccion,
              codigoPostal: proveedorCodigoPostal || proveedorExistente.codigoPostal,
              ciudad: proveedorCiudad || proveedorExistente.ciudad,
              provincia: proveedorProvincia || proveedorExistente.provincia,
            }
          })
        }
      } else {
        // Crear nuevo proveedor
        const nuevoProveedor = await prisma.proveedor.create({
          data: {
            nombre: proveedor,
            cif: proveedorCIF || null,
            direccion: proveedorDireccion || null,
            codigoPostal: proveedorCodigoPostal || null,
            ciudad: proveedorCiudad || null,
            provincia: proveedorProvincia || null,
          }
        })
        proveedorRegistradoId = nuevoProveedor.id
        console.log('Nuevo proveedor registrado:', nuevoProveedor.nombre)
      }
    }

    const gasto = await prisma.gasto.update({
      where: { id: params.id },
      data: {
        concepto,
        fecha: new Date(fecha),
        proveedor: proveedor || null,
        proveedorId: proveedorRegistradoId,
        tipoGasto,
        importe: parseFloat(importe.toString()),
        metodoPago: metodoPago as any,
        tipo: tipo || 'TICKET',
        iva: parseFloat((iva || 21).toString()),
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

    // 🔄 SINCRONIZAR MODIFICACIÓN CON GSCONTROL - CÓDIGO ACTUALIZADO 31/10/2025
    const descripcionGasto = `${gasto.concepto}${gasto.proveedor ? ` - ${gasto.proveedor}` : ''}`
    const categoriaGSControl = mapearCategoriaGasto(gasto.tipoGasto)
    
    await notificarModificacionGSControl({
      id: gasto.id,
      esIngreso: false,
      fecha: gasto.fecha,
      importe: gasto.importe,
      descripcion: descripcionGasto,
      // Nuevo campo según PDF
      costCategory: categoriaGSControl
    })

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

    // 🔄 SINCRONIZAR ELIMINACIÓN CON GSCONTROL - CÓDIGO EXACTO DEL PDF
    await notificarEliminacionGSControl(gasto.id)

    await prisma.gasto.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Gasto eliminado' })
  } catch (error) {
    console.error('Error deleting gasto:', error)
    return NextResponse.json({ error: 'Error al eliminar gasto' }, { status: 500 })
  }
}
