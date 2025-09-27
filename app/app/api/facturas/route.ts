
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

    const facturas = await prisma.factura.findMany({
      include: {
        cliente: {
          select: {
            nombre: true,
            apellido: true
          }
        },
        cita: {
          select: {
            id: true,
            fecha: true
          }
        },
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(facturas)
  } catch (error) {
    console.error('Error fetching facturas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      tipo = 'TICKET', // TICKET por defecto
      clienteId,
      citaId,
      items,
      metodoPago,
      datosFacturacion
    } = body

    // Calcular totales
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.cantidad * item.precio), 0)
    const iva = subtotal * 0.21 // 21% IVA
    const total = subtotal + iva

    // Generar número de documento
    const ultimaFactura = await prisma.factura.findFirst({
      where: { tipo },
      orderBy: { numero: 'desc' }
    })

    let numeroSecuencia = 1
    if (ultimaFactura) {
      const ultimoNumero = parseInt(ultimaFactura.numero.split('-')[1]) || 0
      numeroSecuencia = ultimoNumero + 1
    }

    const prefijo = tipo === 'FACTURA' ? 'FAC' : 'TIC'
    const numero = `${prefijo}-${numeroSecuencia.toString().padStart(6, '0')}`

    // Crear factura
    const factura = await prisma.factura.create({
      data: {
        numero,
        tipo,
        subtotal,
        iva,
        total,
        metodoPago,
        clienteId,
        citaId,
        datosFacturacion: datosFacturacion ? JSON.stringify(datosFacturacion) : null,
        items: {
          create: items.map((item: any) => ({
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio: item.precio,
            total: item.cantidad * item.precio
          }))
        }
      },
      include: {
        cliente: true,
        items: true,
        cita: true
      }
    })

    return NextResponse.json(factura, { status: 201 })
  } catch (error) {
    console.error('Error creating factura:', error)
    return NextResponse.json(
      { error: 'Error al crear la factura' },
      { status: 500 }
    )
  }
}
