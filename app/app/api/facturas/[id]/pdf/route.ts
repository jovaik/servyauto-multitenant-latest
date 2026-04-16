
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Generar HTML para TICKET (formato estrecho 80mm)
function generateTicketHTML(factura: any, local: any, items: any[]): string {
  const formatMetodoPago = (metodoPago: string) => {
    const metodos: { [key: string]: string } = {
      'EFECTIVO': 'Efectivo',
      'TPV_SUMUP': 'Tarjeta',
      'TPV_UNICAJA': 'Tarjeta',
    }
    return metodos[metodoPago] || metodoPago
  }

  // Datos del local
  const nombreLocal = local?.razonSocial || local?.nombre || 'SERVYAUTO'
  const cifLocal = local?.cifNif || ''
  const direccionLocal = local?.direccionFiscal || local?.direccion || ''
  const cpCiudad = [local?.codigoPostalFiscal, local?.ciudadFiscal].filter(Boolean).join(' ')
  const telefonoLocal = local?.telefono || ''

  // Generar líneas de items
  const itemsHTML = items.length > 0 
    ? items.map(item => `
        <div class="item">
          <div class="item-desc">${item.descripcion}</div>
          <div class="item-line">
            <span>${item.cantidad} x €${item.precio.toFixed(2)}</span>
            <span>€${item.total.toFixed(2)}</span>
          </div>
        </div>
      `).join('')
    : `<div class="item"><div class="item-desc">Servicio de lavado</div><div class="item-line"><span>1 x €${factura.total.toFixed(2)}</span><span>€${factura.total.toFixed(2)}</span></div></div>`

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${factura.tipo === 'FACTURA' ? 'Factura' : 'Ticket'} ${factura.numero}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 80mm;
          padding: 5mm;
          color: #000;
          line-height: 1.4;
        }
        .header { 
          text-align: center; 
          padding-bottom: 3mm;
          border-bottom: 1px dashed #000;
          margin-bottom: 3mm;
        }
        .logo {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 2mm;
        }
        .local-info {
          font-size: 10px;
        }
        .doc-info {
          text-align: center;
          padding: 3mm 0;
          border-bottom: 1px dashed #000;
          margin-bottom: 3mm;
        }
        .doc-type {
          font-size: 14px;
          font-weight: bold;
        }
        .doc-number {
          font-size: 11px;
        }
        .cliente-info {
          padding: 2mm 0;
          font-size: 11px;
          border-bottom: 1px dashed #000;
          margin-bottom: 3mm;
        }
        .items {
          padding: 2mm 0;
          border-bottom: 1px dashed #000;
          margin-bottom: 3mm;
        }
        .item {
          margin-bottom: 2mm;
        }
        .item-desc {
          font-size: 11px;
        }
        .item-line {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #444;
        }
        .totales {
          padding: 2mm 0;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          margin: 1mm 0;
        }
        .total-final {
          font-size: 14px;
          font-weight: bold;
          border-top: 1px solid #000;
          padding-top: 2mm;
          margin-top: 2mm;
        }
        .pago-info {
          text-align: center;
          padding: 3mm 0;
          border-top: 1px dashed #000;
          margin-top: 3mm;
          font-size: 11px;
        }
        .footer {
          text-align: center;
          padding-top: 3mm;
          margin-top: 3mm;
          border-top: 1px dashed #000;
          font-size: 10px;
          color: #666;
        }
        .gracias {
          font-size: 12px;
          font-weight: bold;
          margin-top: 3mm;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">${nombreLocal}</div>
        <div class="local-info">
          ${cifLocal ? `CIF: ${cifLocal}<br>` : ''}
          ${direccionLocal ? `${direccionLocal}<br>` : ''}
          ${cpCiudad ? `${cpCiudad}<br>` : ''}
          ${telefonoLocal ? `Tel: ${telefonoLocal}` : ''}
        </div>
      </div>

      <div class="doc-info">
        <div class="doc-type">${factura.tipo === 'FACTURA' ? 'FACTURA' : 'TICKET'}</div>
        <div class="doc-number">Nº: ${factura.numero}</div>
        <div>Fecha: ${format(new Date(factura.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}</div>
      </div>

      ${factura.cliente ? `
        <div class="cliente-info">
          <strong>Cliente:</strong> ${factura.cliente.nombre} ${factura.cliente.apellido || ''}<br>
          ${factura.cliente.documento ? `NIF/CIF: ${factura.cliente.documento}<br>` : ''}
          ${factura.cliente.telefono ? `Tel: ${factura.cliente.telefono}` : ''}
        </div>
      ` : ''}

      <div class="items">
        ${itemsHTML}
      </div>

      <div class="totales">
        <div class="total-row">
          <span>Base Imponible:</span>
          <span>€${factura.subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>IVA (21%):</span>
          <span>€${factura.iva.toFixed(2)}</span>
        </div>
        <div class="total-row total-final">
          <span>TOTAL:</span>
          <span>€${factura.total.toFixed(2)}</span>
        </div>
      </div>

      <div class="pago-info">
        <strong>Forma de pago:</strong> ${formatMetodoPago(factura.metodoPago || 'EFECTIVO')}<br>
        <strong>Estado:</strong> ${factura.estado === 'PAGADA' ? '✓ PAGADO' : factura.estado}
      </div>

      <div class="footer">
        <div class="gracias">¡Gracias por su visita!</div>
        <div style="margin-top: 2mm;">Conserve este ticket</div>
      </div>
    </body>
    </html>
  `
}

// Generar HTML para FACTURA (formato A4 completo)
function generateFacturaHTML(factura: any, local: any, items: any[]): string {
  const formatMetodoPago = (metodoPago: string) => {
    const metodos: { [key: string]: string } = {
      'EFECTIVO': 'Efectivo',
      'TPV_SUMUP': 'Tarjeta (TPV)',
      'TPV_UNICAJA': 'Tarjeta (TPV)',
    }
    return metodos[metodoPago] || metodoPago
  }

  // Datos del local
  const nombreLocal = local?.razonSocial || local?.nombre || 'SERVYAUTO'
  const cifLocal = local?.cifNif || ''
  const direccionLocal = local?.direccionFiscal || local?.direccion || ''
  const cpCiudad = [local?.codigoPostalFiscal, local?.ciudadFiscal].filter(Boolean).join(' ')
  const telefonoLocal = local?.telefono || ''

  // Datos de facturación del cliente (si existen)
  let datosFacturacion: any = {}
  if (factura.datosFacturacion) {
    try {
      datosFacturacion = JSON.parse(factura.datosFacturacion)
    } catch (e) {}
  }

  // Generar filas de items
  const itemsRows = items.length > 0 
    ? items.map(item => `
        <tr>
          <td>${item.descripcion}</td>
          <td class="center">${item.cantidad}</td>
          <td class="right">€${item.precio.toFixed(2)}</td>
          <td class="right">€${item.total.toFixed(2)}</td>
        </tr>
      `).join('')
    : `<tr><td>Servicio de lavado</td><td class="center">1</td><td class="right">€${factura.subtotal.toFixed(2)}</td><td class="right">€${factura.subtotal.toFixed(2)}</td></tr>`

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Factura ${factura.numero}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: Arial, sans-serif;
          font-size: 11px;
          color: #333;
          line-height: 1.5;
          padding: 15mm;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10mm;
          padding-bottom: 5mm;
          border-bottom: 2px solid #2563eb;
        }
        .empresa {
          max-width: 50%;
        }
        .empresa-nombre {
          font-size: 20px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 2mm;
        }
        .empresa-datos {
          font-size: 10px;
          color: #666;
        }
        .factura-info {
          text-align: right;
        }
        .factura-titulo {
          font-size: 24px;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 2mm;
        }
        .factura-numero {
          font-size: 12px;
          margin-bottom: 1mm;
        }
        .info-boxes {
          display: flex;
          gap: 10mm;
          margin-bottom: 8mm;
        }
        .info-box {
          flex: 1;
          background: #f8fafc;
          padding: 4mm;
          border-radius: 2mm;
          border: 1px solid #e2e8f0;
        }
        .info-box-title {
          font-weight: bold;
          font-size: 10px;
          color: #64748b;
          margin-bottom: 2mm;
          text-transform: uppercase;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5mm;
        }
        th {
          background: #2563eb;
          color: white;
          padding: 3mm 2mm;
          text-align: left;
          font-size: 10px;
        }
        td {
          padding: 2mm;
          border-bottom: 1px solid #e2e8f0;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .totales {
          margin-left: auto;
          width: 50%;
          margin-top: 5mm;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 2mm 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .total-final {
          font-size: 14px;
          font-weight: bold;
          background: #f0f9ff;
          padding: 3mm;
          border-radius: 2mm;
          color: #1e40af;
        }
        .footer {
          margin-top: 10mm;
          padding-top: 5mm;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          font-size: 9px;
          color: #94a3b8;
        }
        .estado-pagado {
          display: inline-block;
          background: #22c55e;
          color: white;
          padding: 1mm 3mm;
          border-radius: 1mm;
          font-size: 10px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="empresa">
          <div class="empresa-nombre">${nombreLocal}</div>
          <div class="empresa-datos">
            ${cifLocal ? `CIF: ${cifLocal}<br>` : ''}
            ${direccionLocal ? `${direccionLocal}<br>` : ''}
            ${cpCiudad ? `${cpCiudad}<br>` : ''}
            ${telefonoLocal ? `Tel: ${telefonoLocal}` : ''}
          </div>
        </div>
        <div class="factura-info">
          <div class="factura-titulo">FACTURA</div>
          <div class="factura-numero"><strong>Nº:</strong> ${factura.numero}</div>
          <div><strong>Fecha:</strong> ${format(new Date(factura.fecha), 'dd/MM/yyyy', { locale: es })}</div>
          ${factura.estado === 'PAGADA' ? '<div style="margin-top: 2mm;"><span class="estado-pagado">✓ PAGADA</span></div>' : ''}
        </div>
      </div>

      <div class="info-boxes">
        <div class="info-box">
          <div class="info-box-title">Datos del Cliente</div>
          <strong>${datosFacturacion.razonSocial || `${factura.cliente?.nombre || ''} ${factura.cliente?.apellido || ''}`}</strong><br>
          ${datosFacturacion.nifCif || factura.cliente?.documento ? `NIF/CIF: ${datosFacturacion.nifCif || factura.cliente?.documento}<br>` : ''}
          ${datosFacturacion.direccion || factura.cliente?.direccion || ''}<br>
          ${datosFacturacion.codigoPostal ? `${datosFacturacion.codigoPostal} ` : ''}${datosFacturacion.ciudad || ''}
        </div>
        <div class="info-box">
          <div class="info-box-title">Información de Pago</div>
          <strong>Forma de pago:</strong> ${formatMetodoPago(factura.metodoPago || 'EFECTIVO')}<br>
          ${factura.fechaPago ? `<strong>Fecha de pago:</strong> ${format(new Date(factura.fechaPago), 'dd/MM/yyyy', { locale: es })}` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 50%;">Descripción</th>
            <th class="center" style="width: 15%;">Cantidad</th>
            <th class="right" style="width: 17%;">Precio Unit.</th>
            <th class="right" style="width: 18%;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="totales">
        <div class="total-row">
          <span>Base Imponible:</span>
          <span>€${factura.subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>IVA (21%):</span>
          <span>€${factura.iva.toFixed(2)}</span>
        </div>
        <div class="total-row total-final">
          <span>TOTAL:</span>
          <span>€${factura.total.toFixed(2)}</span>
        </div>
      </div>

      <div class="footer">
        <p>Documento generado el ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
        <p>${nombreLocal}${cifLocal ? ` - CIF: ${cifLocal}` : ''}</p>
      </div>
    </body>
    </html>
  `
}

// Función para generar PDF usando la API de Abacus
async function generatePDF(htmlContent: string, isTicket: boolean): Promise<Buffer | null> {
  try {
    // Opciones de PDF según tipo de documento
    const pdfOptions = isTicket 
      ? {
          width: '80mm',
          height: '200mm', // Altura suficiente, se ajusta al contenido
          margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
          print_background: true
        }
      : {
          format: 'A4',
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
          print_background: true
        }

    // Step 1: Crear la solicitud de generación de PDF
    const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        html_content: htmlContent,
        pdf_options: pdfOptions,
        base_url: process.env.NEXTAUTH_URL || ''
      })
    })

    if (!createResponse.ok) {
      console.error('Error creating PDF request:', await createResponse.text())
      return null
    }

    const { request_id } = await createResponse.json()
    if (!request_id) return null

    // Step 2: Esperar a que se complete
    const maxAttempts = 60 // 1 minuto máximo
    let attempts = 0

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const statusResponse = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: request_id,
          deployment_token: process.env.ABACUSAI_API_KEY
        })
      })

      const statusResult = await statusResponse.json()
      const status = statusResult?.status || 'FAILED'
      const result = statusResult?.result

      if (status === 'SUCCESS' && result?.result) {
        return Buffer.from(result.result, 'base64')
      } else if (status === 'FAILED') {
        console.error('PDF generation failed:', result?.error)
        return null
      }
      
      attempts++
    }

    return null
  } catch (error) {
    console.error('Error in PDF generation:', error)
    return null
  }
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

    // Obtener factura completa con local e items
    const factura = await prisma.factura.findUnique({
      where: { id: params.id },
      include: {
        cliente: true,
        local: true,
        factura_items: true
      }
    })

    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const formato = searchParams.get('formato') || 'pdf' // pdf o html
    const isTicket = factura.tipo === 'TICKET'

    // Generar HTML según tipo de documento
    const htmlContent = isTicket 
      ? generateTicketHTML(factura, factura.local, factura.factura_items || [])
      : generateFacturaHTML(factura, factura.local, factura.factura_items || [])

    // Si se solicita HTML (fallback)
    if (formato === 'html') {
      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="${factura.tipo}_${factura.numero}.html"`
        }
      })
    }

    // Generar PDF
    const pdfBuffer = await generatePDF(htmlContent, isTicket)

    if (pdfBuffer) {
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${factura.tipo}_${factura.numero}.pdf"`
        }
      })
    } else {
      // Fallback a HTML si falla la generación de PDF
      console.warn('PDF generation failed, falling back to HTML')
      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="${factura.tipo}_${factura.numero}.html"`
        }
      })
    }
  } catch (error) {
    console.error('Error generating document:', error)
    return NextResponse.json(
      { error: 'Error al generar el documento' },
      { status: 500 }
    )
  }
}
