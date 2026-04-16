
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

// Generar HTML para FACTURA (formato A4 profesional)
function generateFacturaHTML(factura: any, local: any, items: any[]): string {
  const formatMetodoPago = (metodoPago: string) => {
    const metodos: { [key: string]: string } = {
      'EFECTIVO': 'Efectivo',
      'TPV_SUMUP': 'Tarjeta (TPV)',
      'TPV_UNICAJA': 'Tarjeta (TPV)',
    }
    return metodos[metodoPago] || metodoPago
  }

  // Datos del emisor (local)
  const nombreEmisor = local?.razonSocial || local?.nombre || 'SERVYAUTO'
  const cifEmisor = local?.cifNif || ''
  const direccionEmisor = local?.direccionFiscal || local?.direccion || ''
  const cpCiudadEmisor = [local?.codigoPostalFiscal, local?.ciudadFiscal].filter(Boolean).join(' ')
  const telefonoEmisor = local?.telefono || ''

  // Datos de facturación del cliente
  let datosFacturacion: any = {}
  if (factura.datosFacturacion) {
    try {
      datosFacturacion = JSON.parse(factura.datosFacturacion)
    } catch (e) {}
  }

  const clienteNombre = datosFacturacion.razonSocial || `${factura.cliente?.nombre || ''} ${factura.cliente?.apellido || ''}`.trim()
  const clienteNif = datosFacturacion.nifCif || factura.cliente?.documento || ''
  const clienteDireccion = datosFacturacion.direccion || factura.cliente?.direccion || ''
  const clienteCpCiudad = [datosFacturacion.codigoPostal, datosFacturacion.ciudad].filter(Boolean).join(' ')
  const clienteTelefono = factura.cliente?.telefono || ''

  // Filas de items
  const itemsRows = items.length > 0 
    ? items.map((item: any) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;">${item.descripcion}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;font-size:13px;">${item.cantidad}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;">${item.precio.toFixed(2)} &euro;</td>
          <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;font-weight:600;">${item.total.toFixed(2)} &euro;</td>
        </tr>
      `).join('')
    : `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;">Servicio de lavado</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;font-size:13px;">1</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;">${factura.subtotal.toFixed(2)} &euro;</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;font-weight:600;">${factura.subtotal.toFixed(2)} &euro;</td>
      </tr>`

  // Separar items de descuento de items normales para estilo diferente  
  const fechaFactura = format(new Date(factura.fecha), 'dd/MM/yyyy', { locale: es })
  const fechaPago = factura.fechaPago ? format(new Date(factura.fechaPago), 'dd/MM/yyyy', { locale: es }) : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Factura ${factura.numero}</title>
</head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a2e;background:#fff;">
  <div style="max-width:210mm;margin:0 auto;padding:20mm 18mm 15mm 18mm;">
    
    <!-- CABECERA -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:8mm;">
      <tr>
        <td style="vertical-align:top;width:55%;">
          <div style="font-size:26px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;margin-bottom:4px;">${nombreEmisor}</div>
          <div style="font-size:11px;color:#64748b;line-height:1.6;">
            ${cifEmisor ? `CIF: ${cifEmisor}<br>` : ''}${direccionEmisor ? `${direccionEmisor}<br>` : ''}${cpCiudadEmisor ? `${cpCiudadEmisor}<br>` : ''}${telefonoEmisor ? `Tel: ${telefonoEmisor}` : ''}
          </div>
        </td>
        <td style="vertical-align:top;text-align:right;">
          <div style="font-size:32px;font-weight:800;color:#0f172a;letter-spacing:1px;margin-bottom:6px;">FACTURA</div>
          <table style="margin-left:auto;border-collapse:collapse;">
            <tr>
              <td style="padding:3px 10px 3px 0;font-size:11px;color:#64748b;text-align:right;">N&ordm; Factura:</td>
              <td style="padding:3px 0;font-size:12px;font-weight:700;color:#0f172a;">${factura.numero}</td>
            </tr>
            <tr>
              <td style="padding:3px 10px 3px 0;font-size:11px;color:#64748b;text-align:right;">Fecha:</td>
              <td style="padding:3px 0;font-size:12px;font-weight:600;color:#0f172a;">${fechaFactura}</td>
            </tr>
            <tr>
              <td style="padding:3px 10px 3px 0;font-size:11px;color:#64748b;text-align:right;">Estado:</td>
              <td style="padding:3px 0;">
                ${factura.estado === 'PAGADA' 
                  ? '<span style="display:inline-block;background:#059669;color:#fff;padding:2px 10px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:0.5px;">PAGADA</span>' 
                  : `<span style="display:inline-block;background:#f59e0b;color:#fff;padding:2px 10px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:0.5px;">${factura.estado || 'PENDIENTE'}</span>`}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- LÍNEA SEPARADORA -->
    <div style="height:3px;background:linear-gradient(90deg,#0f172a 0%,#334155 50%,#94a3b8 100%);border-radius:2px;margin-bottom:8mm;"></div>

    <!-- DATOS CLIENTE + PAGO -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:8mm;">
      <tr>
        <td style="vertical-align:top;width:55%;padding-right:10mm;">
          <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px;">Facturar a</div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 14px;">
            <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:3px;">${clienteNombre || 'Cliente'}</div>
            ${clienteNif ? `<div style="font-size:11px;color:#475569;margin-bottom:2px;">NIF/CIF: ${clienteNif}</div>` : ''}
            ${clienteDireccion ? `<div style="font-size:11px;color:#475569;margin-bottom:2px;">${clienteDireccion}</div>` : ''}
            ${clienteCpCiudad ? `<div style="font-size:11px;color:#475569;margin-bottom:2px;">${clienteCpCiudad}</div>` : ''}
            ${clienteTelefono ? `<div style="font-size:11px;color:#475569;">Tel: ${clienteTelefono}</div>` : ''}
          </div>
        </td>
        <td style="vertical-align:top;">
          <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px;">Informaci&oacute;n de pago</div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px 14px;">
            <div style="font-size:12px;color:#475569;margin-bottom:4px;"><span style="color:#94a3b8;">Forma de pago:</span> <strong style="color:#0f172a;">${formatMetodoPago(factura.metodoPago || 'EFECTIVO')}</strong></div>
            ${fechaPago ? `<div style="font-size:12px;color:#475569;"><span style="color:#94a3b8;">Fecha de pago:</span> <strong style="color:#0f172a;">${fechaPago}</strong></div>` : ''}
          </div>
        </td>
      </tr>
    </table>

    <!-- TABLA DE CONCEPTOS -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:6mm;">
      <thead>
        <tr>
          <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#fff;background:#1e293b;text-transform:uppercase;letter-spacing:0.8px;border-radius:6px 0 0 0;">Descripci&oacute;n</th>
          <th style="padding:10px 12px;text-align:center;font-size:10px;font-weight:700;color:#fff;background:#1e293b;text-transform:uppercase;letter-spacing:0.8px;width:12%;">Uds.</th>
          <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:700;color:#fff;background:#1e293b;text-transform:uppercase;letter-spacing:0.8px;width:18%;">Precio Unit.</th>
          <th style="padding:10px 12px;text-align:right;font-size:10px;font-weight:700;color:#fff;background:#1e293b;text-transform:uppercase;letter-spacing:0.8px;width:18%;border-radius:0 6px 0 0;">Importe</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <!-- TOTALES -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:10mm;">
      <tr>
        <td style="width:55%;vertical-align:top;"></td>
        <td style="vertical-align:top;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:6px 12px;font-size:12px;color:#64748b;">Base Imponible</td>
              <td style="padding:6px 12px;font-size:12px;text-align:right;color:#0f172a;font-weight:600;">${factura.subtotal.toFixed(2)} &euro;</td>
            </tr>
            <tr>
              <td style="padding:6px 12px;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0;">IVA (21%)</td>
              <td style="padding:6px 12px;font-size:12px;text-align:right;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;">${factura.iva.toFixed(2)} &euro;</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;font-size:16px;font-weight:800;color:#0f172a;">TOTAL</td>
              <td style="padding:10px 12px;font-size:16px;font-weight:800;text-align:right;color:#0f172a;">${factura.total.toFixed(2)} &euro;</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- PIE DE FACTURA -->
    <div style="border-top:2px solid #e2e8f0;padding-top:6mm;text-align:center;">
      <div style="font-size:10px;color:#94a3b8;line-height:1.6;">
        ${nombreEmisor}${cifEmisor ? ` &bull; CIF: ${cifEmisor}` : ''}${direccionEmisor ? ` &bull; ${direccionEmisor}` : ''}${cpCiudadEmisor ? ` &bull; ${cpCiudadEmisor}` : ''}
      </div>
      <div style="font-size:9px;color:#cbd5e1;margin-top:3px;">
        Documento generado el ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}
      </div>
    </div>

  </div>
</body>
</html>`
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
