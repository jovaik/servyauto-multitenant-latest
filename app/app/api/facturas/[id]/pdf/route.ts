
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext, canAccessRecord } from '@/lib/local-context'
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

// Generar HTML para FACTURA (formato corporativo ServyAuto - réplica exacta)
function generateFacturaHTML(factura: any, local: any, items: any[]): string {
  const formatMetodoPago = (metodoPago: string) => {
    const metodos: { [key: string]: string } = {
      'EFECTIVO': 'Efectivo',
      'TPV_SUMUP': 'Tarjeta (TPV SumUp)',
      'TPV_UNICAJA': 'Tarjeta (TPV Unicaja)',
    }
    return metodos[metodoPago] || metodoPago
  }

  // Datos fiscales del emisor (FIJOS - propietario del negocio)
  const emisorNombre = 'JOSE M. MILLAN FERN\u00c1NDEZ'
  const emisorCif = '54322040L'
  const emisorDireccion = 'AVDA ARIAS MALDONADO S/N PARKING OCCIDENTAL -1'
  const emisorCpCiudad = '29602 - MARBELLA (MALAGA)'
  const emisorTelefono = '610543228'

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
  const clienteCp = datosFacturacion.codigoPostal || ''
  const clienteCiudad = datosFacturacion.ciudad || ''
  const clienteTelefono = factura.cliente?.telefono || ''

  const fechaFactura = format(new Date(factura.fecha), 'dd-MM-yyyy', { locale: es })

  // Filas de items con columna IVA
  const itemsRows = items.length > 0 
    ? items.map((item: any) => {
        const precioNeto = item.precio / 1.21
        return `<tr>
          <td style="padding:5px 8px;border-bottom:1px solid #ddd;font-size:11px;">${item.descripcion}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #ddd;text-align:center;font-size:11px;">${item.cantidad}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #ddd;text-align:right;font-size:11px;">${precioNeto.toFixed(2)} &euro;</td>
          <td style="padding:5px 8px;border-bottom:1px solid #ddd;text-align:center;font-size:11px;">21,0%</td>
          <td style="padding:5px 8px;border-bottom:1px solid #ddd;text-align:right;font-size:11px;font-weight:600;">${item.total.toFixed(2)} &euro;</td>
        </tr>`
      }).join('')
    : `<tr>
        <td style="padding:5px 8px;border-bottom:1px solid #ddd;font-size:11px;">Servicio de lavado</td>
        <td style="padding:5px 8px;border-bottom:1px solid #ddd;text-align:center;font-size:11px;">1</td>
        <td style="padding:5px 8px;border-bottom:1px solid #ddd;text-align:right;font-size:11px;">${factura.subtotal.toFixed(2)} &euro;</td>
        <td style="padding:5px 8px;border-bottom:1px solid #ddd;text-align:center;font-size:11px;">21,0%</td>
        <td style="padding:5px 8px;border-bottom:1px solid #ddd;text-align:right;font-size:11px;font-weight:600;">${factura.total.toFixed(2)} &euro;</td>
      </tr>`

  const naranja = '#F5A623'
  const naranjaOscuro = '#E8961E'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Factura ${factura.numero}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;">
  <div style="max-width:210mm;margin:0 auto;padding:12mm 15mm 10mm 15mm;">

    <!-- FILA SUPERIOR: EMISOR + FACTURA Nº -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:0;">
      <tr>
        <!-- DATOS EMISOR (fondo naranja) -->
        <td style="vertical-align:top;width:60%;background:${naranja};padding:10px 14px;border:2px solid ${naranjaOscuro};">
          <div style="font-size:14px;font-weight:bold;color:#000;">${emisorNombre}</div>
          <div style="font-size:10px;color:#000;line-height:1.5;margin-top:2px;">
            CIF/NIF: ${emisorCif}<br>
            ${emisorDireccion}<br>
            ${emisorCpCiudad}<br>
            Tel&eacute;fono: ${emisorTelefono}
          </div>
        </td>
        <!-- FACTURA Nº -->
        <td style="vertical-align:top;width:40%;padding-left:8px;">
          <table style="width:100%;border-collapse:collapse;border:2px solid ${naranjaOscuro};">
            <tr>
              <td colspan="2" style="background:${naranja};padding:6px 10px;font-size:14px;font-weight:bold;text-align:center;border-bottom:2px solid ${naranjaOscuro};">
                FACTURA N&ordm;: ${factura.numero}
              </td>
            </tr>
            <tr>
              <td style="padding:4px 10px;font-size:10px;font-weight:bold;text-align:center;border-right:1px solid #ccc;border-bottom:1px solid #ccc;width:50%;">P&Aacute;GINA</td>
              <td style="padding:4px 10px;font-size:10px;font-weight:bold;text-align:center;border-bottom:1px solid #ccc;">FECHA</td>
            </tr>
            <tr>
              <td style="padding:4px 10px;font-size:11px;text-align:center;border-right:1px solid #ccc;">1/1</td>
              <td style="padding:4px 10px;font-size:11px;text-align:center;">${fechaFactura}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- FILA: LOGO + CLIENTE -->
    <table style="width:100%;border-collapse:collapse;margin-top:6px;">
      <tr>
        <!-- LOGO SERVYAUTO -->
        <td style="vertical-align:middle;width:60%;padding-right:8px;">
          <div style="background:${naranja};padding:12px 20px;text-align:center;border:2px solid ${naranjaOscuro};">
            <div style="font-size:28px;font-weight:900;color:#000;letter-spacing:2px;font-family:Arial Black,Arial,sans-serif;">SERVY<span style="color:#cc0000;">AUTO</span></div>
            <div style="font-size:10px;color:#000;margin-top:2px;font-style:italic;">servicios del autom&oacute;vil</div>
          </div>
          <div style="margin-top:6px;font-size:10px;">
            Email: <a href="mailto:info@servyauto.com" style="color:#0066cc;">info@servyauto.com</a>
          </div>
        </td>
        <!-- DATOS CLIENTE -->
        <td style="vertical-align:top;width:40%;">
          <table style="width:100%;border-collapse:collapse;border:2px solid ${naranjaOscuro};">
            <tr>
              <td style="background:${naranja};padding:4px 10px;font-size:10px;font-weight:bold;text-align:center;border-bottom:2px solid ${naranjaOscuro};">CLIENTE</td>
            </tr>
            <tr>
              <td style="padding:8px 10px;font-size:10px;line-height:1.5;">
                <strong>${clienteNombre || 'Cliente particular'}</strong><br>
                ${clienteNif ? `CIF/NIF: ${clienteNif}<br>` : ''}${clienteDireccion ? `${clienteDireccion}<br>` : ''}${clienteCp ? `${clienteCp}<br>` : ''}${clienteCiudad ? `${clienteCiudad}<br>` : ''}${clienteTelefono ? `Telef: ${clienteTelefono}` : ''}
              </td>
            </tr>
          </table>
          <!-- FORMA DE PAGO -->
          <table style="width:100%;border-collapse:collapse;border:2px solid ${naranjaOscuro};margin-top:6px;">
            <tr>
              <td style="background:${naranja};padding:4px 10px;font-size:10px;font-weight:bold;text-align:center;border-bottom:2px solid ${naranjaOscuro};">FORMA DE PAGO</td>
            </tr>
            <tr>
              <td style="padding:8px 10px;font-size:10px;">${formatMetodoPago(factura.metodoPago || 'EFECTIVO')}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- TABLA DE CONCEPTOS -->
    <table style="width:100%;border-collapse:collapse;margin-top:10px;border:2px solid ${naranjaOscuro};">
      <thead>
        <tr style="background:${naranja};">
          <th style="padding:6px 8px;text-align:left;font-size:10px;font-weight:bold;border-right:1px solid ${naranjaOscuro};">DESCRIPCI&Oacute;N</th>
          <th style="padding:6px 8px;text-align:center;font-size:10px;font-weight:bold;border-right:1px solid ${naranjaOscuro};width:8%;">CANT</th>
          <th style="padding:6px 8px;text-align:right;font-size:10px;font-weight:bold;border-right:1px solid ${naranjaOscuro};width:14%;">PRECIO</th>
          <th style="padding:6px 8px;text-align:center;font-size:10px;font-weight:bold;border-right:1px solid ${naranjaOscuro};width:10%;">IVA</th>
          <th style="padding:6px 8px;text-align:right;font-size:10px;font-weight:bold;width:14%;">IMPORTE</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
        <!-- Filas vacías para mantener estructura -->
        <tr><td colspan="5" style="padding:40px 8px;border-bottom:1px solid #ddd;">&nbsp;</td></tr>
      </tbody>
    </table>

    <!-- OBSERVACIONES -->
    <div style="margin-top:8px;font-size:10px;font-weight:bold;">Observaciones:</div>
    <div style="border-bottom:1px solid #ccc;min-height:20px;margin-bottom:10px;font-size:10px;padding:4px 0;">
      ${factura.observaciones || ''}
    </div>

    <!-- TOTALES (formato corporativo) -->
    <table style="width:100%;border-collapse:collapse;border:2px solid ${naranjaOscuro};">
      <thead>
        <tr style="background:${naranja};">
          <th style="padding:5px 8px;font-size:9px;font-weight:bold;text-align:center;border-right:1px solid ${naranjaOscuro};">NETO</th>
          <th style="padding:5px 8px;font-size:9px;font-weight:bold;text-align:center;border-right:1px solid ${naranjaOscuro};">IVA</th>
          <th style="padding:5px 8px;font-size:9px;font-weight:bold;text-align:center;border-right:1px solid ${naranjaOscuro};">REC. EQUIV.</th>
          <th style="padding:5px 8px;font-size:9px;font-weight:bold;text-align:center;border-right:1px solid ${naranjaOscuro};">IRPF</th>
          <th style="padding:5px 8px;font-size:9px;font-weight:bold;text-align:center;border-right:1px solid ${naranjaOscuro};">IMPORTES</th>
          <th style="padding:5px 8px;font-size:9px;font-weight:bold;text-align:center;">EUROS</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:6px 8px;font-size:10px;text-align:center;border-right:1px solid #ccc;">
            ${factura.subtotal.toFixed(2)}&euro; 21%
          </td>
          <td style="padding:6px 8px;font-size:10px;text-align:center;border-right:1px solid #ccc;">
            ${factura.iva.toFixed(2)}&euro;
          </td>
          <td style="padding:6px 8px;font-size:10px;text-align:center;border-right:1px solid #ccc;">
            &nbsp;
          </td>
          <td style="padding:6px 8px;font-size:10px;text-align:center;border-right:1px solid #ccc;">
            0%
          </td>
          <td style="padding:6px 8px;font-size:10px;text-align:center;border-right:1px solid #ccc;">
            0,00 &euro;
          </td>
          <td style="padding:6px 8px;text-align:center;border-right:1px solid #ccc;">
            <div style="font-size:9px;font-weight:bold;">TOTAL</div>
          </td>
        </tr>
        <tr>
          <td colspan="5" style="border-top:1px solid #ccc;"></td>
          <td style="padding:6px 8px;font-size:13px;font-weight:bold;text-align:center;border-top:1px solid #ccc;border-left:1px solid #ccc;">
            ${factura.total.toFixed(2)} &euro;
          </td>
        </tr>
      </tbody>
    </table>

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

    const localContext = await getLocalContext()
    if (!localContext) {
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

    if (!canAccessRecord(localContext, factura.localId)) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
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
