import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Obtener todos los servicios rápidos
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const servicios = await prisma.servicioRapido.findMany({
      include: {
        cliente: true,
        vehiculo: true,
        tipoServicio: true,
        mecanico: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        factura: true
      },
      orderBy: {
        fecha: 'desc'
      }
    })

    return NextResponse.json(servicios)
  } catch (error) {
    console.error('Error fetching servicios rápidos:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear un nuevo servicio rápido
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const {
      clienteId,
      vehiculoId,
      tipoServicioId,
      descripcion,
      observaciones,
      costeProducto,
      costeManoObra,
      precioProducto,
      precioManoObra,
      margen,
      iva,
      metodoPago,
      mecanicoId,
      facturaProveedor,
      cifProveedor,
      nombreProveedor
    } = body

    console.log('=== CREANDO SERVICIO RÁPIDO ===')
    console.log('Cliente ID:', clienteId)
    console.log('Vehículo ID:', vehiculoId)
    console.log('Tipo servicio ID:', tipoServicioId)
    console.log('Coste producto:', costeProducto)
    console.log('Coste mano obra:', costeManoObra)
    console.log('Margen:', margen)

    // Validar campos obligatorios
    if (!clienteId || !vehiculoId || !tipoServicioId || !descripcion) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      )
    }

    // Calcular totales
    const total = parseFloat(precioProducto || 0) + parseFloat(precioManoObra || 0)
    const margenEuros = parseFloat(precioProducto || 0) - parseFloat(costeProducto || 0)

    // Calcular total con IVA
    const ivaPorcentaje = parseFloat(iva || 21)
    const totalConIva = total * (1 + ivaPorcentaje / 100)

    console.log('Total:', total)
    console.log('Margen en €:', margenEuros)
    console.log('Total con IVA:', totalConIva)

    // Crear el servicio
    const servicio = await prisma.servicioRapido.create({
      data: {
        clienteId,
        vehiculoId,
        tipoServicioId: tipoServicioId ? parseInt(tipoServicioId) : null,
        descripcion,
        observaciones: observaciones || null,
        estado: 'PENDIENTE',
        costeProducto: parseFloat(costeProducto || 0),
        costeManoObra: parseFloat(costeManoObra || 0),
        precioProducto: parseFloat(precioProducto || 0),
        precioManoObra: parseFloat(precioManoObra || 0),
        total,
        margen: margenEuros,
        iva: ivaPorcentaje,
        totalConIva,
        metodoPago: metodoPago || null,
        pagado: false,
        mecanicoId: mecanicoId || null,
        facturaProveedor: facturaProveedor || null,
        cifProveedor: cifProveedor || null,
        nombreProveedor: nombreProveedor || null
      },
      include: {
        cliente: true,
        vehiculo: true,
        tipoServicio: true,
        mecanico: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    console.log('✅ Servicio rápido creado exitosamente:', servicio.id)

    return NextResponse.json(servicio, { status: 201 })
  } catch (error: any) {
    console.error('=== ERROR CREANDO SERVICIO RÁPIDO ===')
    console.error('Error completo:', error)
    console.error('Error message:', error.message)
    console.error('Error code:', error.code)

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        message: error.message,
        code: error.code
      },
      { status: 500 }
    )
  }
}
