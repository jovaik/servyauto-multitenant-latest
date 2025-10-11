
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const gastos = await prisma.gasto.findMany({
      orderBy: {
        fecha: 'desc'
      }
    })

    return NextResponse.json(gastos)
  } catch (error) {
    console.error('Error fetching gastos:', error)
    return NextResponse.json({ error: 'Error al obtener gastos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Datos recibidos para crear gasto:', body)
    
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

    const gasto = await prisma.gasto.create({
      data: {
        concepto,
        fecha: new Date(fecha),
        proveedor: proveedor || null,
        tipoGasto,
        importe: parseFloat(importe),
        metodoPago: metodoPago as any, // El enum se maneja correctamente
        tipo: tipo || 'TICKET',
        iva: parseFloat(iva) || 21,
        adjunto: false,
        // Campos fiscales (solo para FACTURA)
        numeroFactura: numeroFactura || null,
        proveedorCIF: proveedorCIF || null,
        proveedorDireccion: proveedorDireccion || null,
        proveedorCodigoPostal: proveedorCodigoPostal || null,
        proveedorCiudad: proveedorCiudad || null,
        proveedorProvincia: proveedorProvincia || null
      }
    })

    console.log('Gasto creado exitosamente:', gasto.id)
    return NextResponse.json(gasto, { status: 201 })
  } catch (error) {
    console.error('Error creating gasto:', error)
    return NextResponse.json(
      { error: 'Error al crear gasto: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
