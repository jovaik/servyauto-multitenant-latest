
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Simulación de generación de PDF (en producción usarías una librería como puppeteer o jsPDF)
function generatePDF(factura: any): Buffer {
  // Esta es una implementación simplificada
  // En producción deberías usar una librería real de PDF
  const content = `
    SERVYAUTO - Sistema de Gestión Automotriz
    
    ${factura.tipo}: ${factura.numero}
    Fecha: ${format(new Date(factura.fecha), 'dd/MM/yyyy', { locale: es })}
    
    Cliente: ${factura.cliente.nombre} ${factura.cliente.apellido}
    Email: ${factura.cliente.email || 'N/A'}
    Teléfono: ${factura.cliente.telefono || 'N/A'}
    
    DETALLES:
    ${factura.items.map((item: any) => 
      `- ${item.descripcion}: ${item.cantidad} x €${item.precio.toFixed(2)} = €${item.total.toFixed(2)}`
    ).join('\n')}
    
    Subtotal: €${factura.subtotal.toFixed(2)}
    IVA (21%): €${factura.iva.toFixed(2)}
    TOTAL: €${factura.total.toFixed(2)}
    
    Método de Pago: ${factura.metodoPago || 'N/A'}
    Estado: ${factura.estado}
    
    Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}
  `
  
  return Buffer.from(content, 'utf8')
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener factura completa
    const factura = await prisma.factura.findUnique({
      where: { id: params.id },
      include: {
        cliente: true,
        items: true,
        cita: {
          include: {
            vehiculo: true,
            servicios: {
              include: {
                servicio: true
              }
            }
          }
        }
      }
    })

    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      )
    }

    // Generar PDF
    const pdfBuffer = generatePDF(factura)

    // Actualizar ruta de PDF en base de datos (opcional)
    await prisma.factura.update({
      where: { id: params.id },
      data: {
        pdfPath: `/pdfs/${factura.numero}.pdf`
      }
    })

    // Retornar PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${factura.numero}.pdf"`
      }
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Error al generar PDF' },
      { status: 500 }
    )
  }
}
