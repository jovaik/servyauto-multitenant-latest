
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notificarCreacionGSControl } from '@/lib/gscontrol-sync'

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
    console.log('Datos recibidos para crear gasto:', JSON.stringify(body, null, 2))
    
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
      console.error('Faltan campos requeridos', { concepto, fecha, tipoGasto, importe, metodoPago })
      return NextResponse.json(
        { error: 'Faltan campos requeridos: concepto, fecha, tipoGasto, importe, metodoPago' },
        { status: 400 }
      )
    }

    // Validar que metodoPago sea uno de los valores válidos del enum
    const metodosValidos = ['EFECTIVO', 'TPV_SUMUP', 'TPV_UNICAJA']
    if (!metodosValidos.includes(metodoPago)) {
      console.error('Método de pago inválido:', metodoPago)
      return NextResponse.json(
        { error: `Método de pago inválido. Debe ser uno de: ${metodosValidos.join(', ')}` },
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

    // Preparar datos para crear el gasto
    const gastoData = {
      concepto: concepto.trim(),
      fecha: new Date(fecha),
      proveedor: proveedor && proveedor.trim() ? proveedor.trim() : null,
      tipoGasto: tipoGasto.trim(),
      importe: parseFloat(importe),
      metodoPago: metodoPago,
      tipo: tipo || 'TICKET',
      iva: parseFloat(iva) || 21,
      adjunto: false,
      numeroFactura: numeroFactura && numeroFactura.trim() ? numeroFactura.trim() : null,
      proveedorCIF: proveedorCIF && proveedorCIF.trim() ? proveedorCIF.trim() : null,
      proveedorDireccion: proveedorDireccion && proveedorDireccion.trim() ? proveedorDireccion.trim() : null,
      proveedorCodigoPostal: proveedorCodigoPostal && proveedorCodigoPostal.trim() ? proveedorCodigoPostal.trim() : null,
      proveedorCiudad: proveedorCiudad && proveedorCiudad.trim() ? proveedorCiudad.trim() : null,
      proveedorProvincia: proveedorProvincia && proveedorProvincia.trim() ? proveedorProvincia.trim() : null
    }

    console.log('Datos preparados para Prisma:', JSON.stringify(gastoData, null, 2))

    const gasto = await prisma.gasto.create({
      data: gastoData
    })

    console.log('Gasto creado exitosamente:', gasto.id)

    // 🔄 SINCRONIZAR CON GSCONTROL - CÓDIGO EXACTO DEL PDF
    const descripcionGasto = `${gasto.concepto}${gasto.proveedor ? ` - ${gasto.proveedor}` : ''}`
    await notificarCreacionGSControl({
      id: gasto.id,
      esIngreso: false,
      fecha: gasto.fecha,
      importe: gasto.importe,
      descripcion: descripcionGasto
    })

    return NextResponse.json(gasto, { status: 201 })
  } catch (error: any) {
    console.error('Error creating gasto:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return NextResponse.json(
      { error: 'Error al crear gasto: ' + (error.message || 'Error desconocido') },
      { status: 500 }
    )
  }
}
