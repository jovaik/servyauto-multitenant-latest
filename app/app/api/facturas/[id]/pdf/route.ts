
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Generar HTML mejorado del documento
function generateHTML(factura: any): string {
  const formatMetodoPago = (metodoPago: string) => {
    const metodos: { [key: string]: string } = {
      'EFECTIVO': 'Efectivo',
      'TPV_SUMUP': 'TPV SUMUP',
      'TPV_UNICAJA': 'TPV UNICAJA',
    }
    return metodos[metodoPago] || metodoPago
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Factura ${factura.numero}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 40px; 
          color: #333; 
          line-height: 1.6;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #4F46E5; 
          padding-bottom: 20px; 
          margin-bottom: 30px; 
        }
        .company-name { 
          font-size: 24px; 
          font-weight: bold; 
          color: #4F46E5; 
          margin-bottom: 5px; 
        }
        .document-type { 
          font-size: 20px; 
          font-weight: bold; 
          margin: 20px 0; 
          color: #1F2937;
        }
        .info-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 30px; 
          margin: 30px 0; 
        }
        .info-section { 
          background: #F9FAFB; 
          padding: 20px; 
          border-radius: 8px; 
        }
        .info-title { 
          font-weight: bold; 
          font-size: 16px; 
          margin-bottom: 10px; 
          color: #374151;
        }
        .totals { 
          margin-top: 30px; 
          padding: 20px; 
          background: #F3F4F6; 
          border-radius: 8px; 
        }
        .totals-row { 
          display: flex; 
          justify-content: space-between; 
          margin: 8px 0; 
        }
        .total-final { 
          font-size: 18px; 
          font-weight: bold; 
          color: #059669; 
          border-top: 2px solid #D1D5DB; 
          padding-top: 10px; 
          margin-top: 10px; 
        }
        .footer { 
          text-align: center; 
          margin-top: 40px; 
          font-size: 12px; 
          color: #6B7280; 
        }
        .text-right { text-align: right; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">SERVYAUTO</div>
        <div>Sistema de Gestión Automotriz</div>
        <div class="document-type">Factura: ${factura.numero}</div>
      </div>

      <div class="info-grid">
        <div class="info-section">
          <div class="info-title">Información del Cliente</div>
          <div><strong>Cliente:</strong> ${factura.cliente.nombre} ${factura.cliente.apellido || ''}</div>
          <div><strong>Email:</strong> ${factura.cliente.email || 'No especificado'}</div>
          <div><strong>Teléfono:</strong> ${factura.cliente.telefono || 'No especificado'}</div>
          ${factura.cliente.documento ? `<div><strong>Documento:</strong> ${factura.cliente.documento}</div>` : ''}
        </div>
        
        <div class="info-section">
          <div class="info-title">Información del Documento</div>
          <div><strong>Fecha:</strong> ${format(new Date(factura.fecha), 'dd/MM/yyyy', { locale: es })}</div>
          <div><strong>Estado:</strong> ${factura.pagada ? 'Pagada' : 'Pendiente'}</div>
          ${factura.metodoPago ? `<div><strong>Método de Pago:</strong> ${formatMetodoPago(factura.metodoPago)}</div>` : ''}
        </div>
      </div>

      ${factura.observaciones ? `
        <div class="info-section" style="margin: 20px 0;">
          <div class="info-title">Observaciones</div>
          <div>${factura.observaciones}</div>
        </div>
      ` : ''}

      <div class="totals">
        <div class="totals-row">
          <span>Subtotal:</span>
          <span>€${factura.subtotal.toFixed(2)}</span>
        </div>
        <div class="totals-row">
          <span>IVA (21%):</span>
          <span>€${factura.iva.toFixed(2)}</span>
        </div>
        <div class="totals-row total-final">
          <span>TOTAL:</span>
          <span>€${factura.total.toFixed(2)}</span>
        </div>
      </div>

      <div class="footer">
        <p>Documento generado el ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</p>
        <p>SERVYAUTO - Sistema de Gestión Automotriz</p>
      </div>
    </body>
    </html>
  `
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
      }
    })

    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      )
    }

    // Generar HTML del documento
    const htmlContent = generateHTML(factura)
    const htmlBuffer = Buffer.from(htmlContent, 'utf-8')

    // Verificar si se solicita descarga
    const { searchParams } = new URL(request.url)
    const descargar = searchParams.get('download') === 'true'

    // Retornar como HTML que se puede imprimir o descargar
    return new NextResponse(htmlBuffer, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': descargar 
          ? `attachment; filename="${factura.tipo}_${factura.numero}.html"`
          : `inline; filename="${factura.numero}.html"`
      }
    })
  } catch (error) {
    console.error('Error generating document:', error)
    return NextResponse.json(
      { error: 'Error al generar el documento' },
      { status: 500 }
    )
  }
}
