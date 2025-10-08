
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
            apellidos: true
          }
        },
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
      clienteId,
      metodoPago,
      observaciones,
      subtotal,
      iva,
      total
    } = body

    // Generar número de factura
    const año = new Date().getFullYear()
    const prefijo = 'FAC'
    
    // Buscar la última factura del año
    const ultimaFactura = await prisma.factura.findFirst({
      where: { 
        numero: {
          startsWith: `${prefijo}-${año}-`
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    let numeroSecuencia = 1
    if (ultimaFactura) {
      const partes = ultimaFactura.numero.split('-')
      if (partes.length === 3 && partes[0] === prefijo) {
        const ultimoNumero = parseInt(partes[2]) || 0
        numeroSecuencia = ultimoNumero + 1
      }
    }

    const numero = `${prefijo}-${año}-${numeroSecuencia.toString().padStart(4, '0')}`

    // Crear factura
    const factura = await prisma.factura.create({
      data: {
        numero,
        subtotal: subtotal || 0,
        iva: iva || 0,
        total: total || 0,
        metodoPago: metodoPago || null,
        observaciones: observaciones || null,
        clienteId,
      },
      include: {
        cliente: true,
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
