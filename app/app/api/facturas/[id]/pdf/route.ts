
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

// Generar HTML para FACTURA — Diseño corporativo ServyAuto
function generateFacturaHTML(factura: any, local: any, items: any[]): string {
  const formatMetodoPago = (metodoPago: string) => {
    const metodos: { [key: string]: string } = {
      'EFECTIVO': 'Efectivo',
      'TPV_SUMUP': 'Tarjeta (TPV)',
      'TPV_UNICAJA': 'Tarjeta (TPV)',
    }
    return metodos[metodoPago] || metodoPago
  }

  // Datos fiscales del propietario/emisor (JOSE M. MILLAN FERNÁNDEZ)
  const emisorNombre = 'JOSE M. MILLAN FERNÁNDEZ'
  const emisorCIF = '54322040L'
  const emisorDireccion = 'AVDA ARIAS MALDONADO S/N PARKING OCCIDENTAL -1'
  const emisorCPCiudad = '29602 - MARBELLA (MALAGA)'
  const emisorTelefono = '610543228'
  const emisorEmail = 'info@servyauto.com'

  // Datos del cliente
  let datosFacturacion: any = {}
  if (factura.datosFacturacion) {
    try { datosFacturacion = JSON.parse(factura.datosFacturacion) } catch (e) {}
  }
  const clienteNombre = datosFacturacion.razonSocial || `${factura.cliente?.nombre || ''} ${factura.cliente?.apellido || ''}`.trim()
  const clienteCIF = datosFacturacion.nifCif || factura.cliente?.documento || ''
  const clienteDireccion = datosFacturacion.direccion || factura.cliente?.direccion || ''
  const clienteCP = datosFacturacion.codigoPostal || ''
  const clienteCiudad = datosFacturacion.ciudad || ''
  const clienteTelefono = factura.cliente?.telefono || ''

  // Calcular totales por item (precio = base sin IVA, importe = con IVA)
  const itemsRows = items.length > 0
    ? items.map((item: any) => {
        const precioBase = item.precio / 1.21
        const importeConIVA = item.total
        return `
          <tr>
            <td class="desc">${item.descripcion.toUpperCase()}</td>
            <td class="center">${item.cantidad}</td>
            <td class="right">${precioBase.toFixed(2)} €</td>
            <td class="center">21,0%</td>
            <td class="right">${importeConIVA.toFixed(2)} €</td>
          </tr>`
      }).join('')
    : `<tr>
        <td class="desc">SERVICIO DE LAVADO</td>
        <td class="center">1</td>
        <td class="right">${factura.subtotal.toFixed(2)} €</td>
        <td class="center">21,0%</td>
        <td class="right">${factura.total.toFixed(2)} €</td>
      </tr>`

  // Añadir filas vacías para mantener aspecto de tabla
  const emptyRows = Math.max(0, 8 - (items.length || 1))
  const emptyRowsHTML = Array(emptyRows).fill('<tr><td class="desc">&nbsp;</td><td></td><td></td><td></td><td></td></tr>').join('')

  const fechaStr = format(new Date(factura.fecha), 'dd-MM-yyyy', { locale: es })
  const logoUrl = '/servyauto-logo.jpg'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Factura: ${factura.numero}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10px;
          color: #000;
          line-height: 1.4;
          padding: 12mm 15mm;
          position: relative;
          min-height: 297mm;
        }
        /* === HEADER === */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 6mm;
        }
        .emisor-box {
          background: #F5A623;
          color: #000;
          padding: 3mm 4mm;
          font-size: 9px;
          line-height: 1.5;
          width: 55%;
        }
        .emisor-box .nombre {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 1mm;
        }
        .factura-num-box {
          border: 2px solid #F5A623;
          text-align: center;
          width: 42%;
        }
        .factura-num-box .titulo {
          font-size: 14px;
          font-weight: bold;
          padding: 2mm;
          border-bottom: 1px solid #F5A623;
        }
        .factura-num-box .titulo span {
          font-size: 16px;
        }
        .factura-num-box .meta {
          display: flex;
        }
        .factura-num-box .meta-cell {
          flex: 1;
          padding: 2mm;
          border-right: 1px solid #F5A623;
          font-size: 9px;
        }
        .factura-num-box .meta-cell:last-child { border-right: none; }
        .factura-num-box .meta-cell .label { font-weight: bold; font-size: 8px; }
        .factura-num-box .meta-cell .value { font-size: 10px; margin-top: 1mm; }

        /* === MIDDLE: LOGO + CLIENTE === */
        .middle {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 4mm;
        }
        .logo-box {
          width: 42%;
          background: #F5A623;
          padding: 3mm;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-box img {
          max-width: 100%;
          max-height: 25mm;
        }
        .cliente-section {
          width: 55%;
        }
        .cliente-header {
          background: #F5A623;
          text-align: center;
          font-weight: bold;
          font-size: 10px;
          padding: 1.5mm;
        }
        .cliente-box {
          border: 1px solid #000;
          padding: 2mm 3mm;
          font-size: 9px;
          line-height: 1.5;
          min-height: 20mm;
        }
        .cliente-box .nombre { font-weight: bold; font-size: 10px; }

        /* === EMAIL + FORMA PAGO === */
        .email-pago-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 4mm;
        }
        .email-info {
          font-size: 9px;
          color: #333;
        }
        .email-info a { color: #0066cc; text-decoration: none; }
        .forma-pago-box {
          width: 42%;
          border: 1px solid #000;
          min-height: 12mm;
        }
        .forma-pago-header {
          text-align: center;
          font-weight: bold;
          font-size: 9px;
          padding: 1mm;
          border-bottom: 1px solid #000;
          background: #f0f0f0;
        }
        .forma-pago-content {
          padding: 2mm;
          font-size: 9px;
          text-align: center;
        }

        /* === TABLE === */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 4mm;
        }
        .items-table thead th {
          background: #F5A623;
          color: #000;
          font-weight: bold;
          font-size: 9px;
          padding: 2mm 1.5mm;
          text-align: center;
          border: 1px solid #F5A623;
        }
        .items-table thead th.desc-col { text-align: center; }
        .items-table tbody td {
          padding: 1.5mm 2mm;
          border-bottom: 1px solid #ddd;
          font-size: 9px;
          vertical-align: middle;
        }
        .items-table tbody td.desc { text-align: left; }
        .center { text-align: center; }
        .right { text-align: right; }

        /* === OBSERVACIONES === */
        .observaciones {
          font-size: 9px;
          font-weight: bold;
          margin-bottom: 2mm;
        }

        /* === FOOTER TOTALS === */
        .footer-totals {
          position: absolute;
          bottom: 15mm;
          left: 15mm;
          right: 15mm;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .desglose-table {
          border-collapse: collapse;
          font-size: 9px;
        }
        .desglose-table th,
        .desglose-table td {
          border: 1px solid #000;
          padding: 1.5mm 3mm;
          text-align: center;
        }
        .desglose-table th {
          background: #e8e8e8;
          font-weight: bold;
          font-size: 8px;
        }
        .total-box {
          border: 2px solid #000;
          text-align: center;
        }
        .total-box .total-header {
          font-size: 8px;
          font-weight: bold;
          padding: 1mm 5mm;
          border-bottom: 2px solid #000;
          background: #e8e8e8;
        }
        .total-box .total-row {
          display: flex;
        }
        .total-box .total-label {
          font-weight: bold;
          font-size: 10px;
          padding: 2mm 4mm;
          border-right: 2px solid #000;
        }
        .total-box .total-value {
          font-size: 12px;
          font-weight: bold;
          padding: 2mm 5mm;
          color: #003399;
        }
      </style>
    </head>
    <body>
      <!-- HEADER: Emisor + Factura Nº -->
      <div class="header">
        <div class="emisor-box">
          <div class="nombre">${emisorNombre}</div>
          CIF/NIF: ${emisorCIF}<br>
          ${emisorDireccion}<br>
          ${emisorCPCiudad}<br>
          Teléfono: ${emisorTelefono}
        </div>
        <div class="factura-num-box">
          <div class="titulo">FACTURA Nº: <span>${factura.numero}</span></div>
          <div class="meta">
            <div class="meta-cell">
              <div class="label">PÁGINA</div>
              <div class="value">1/1</div>
            </div>
            <div class="meta-cell">
              <div class="label">FECHA</div>
              <div class="value">${fechaStr}</div>
            </div>
            <div class="meta-cell">
              <div class="label">&nbsp;</div>
              <div class="value">&nbsp;</div>
            </div>
          </div>
        </div>
      </div>

      <!-- MIDDLE: Logo + Cliente -->
      <div class="middle">
        <div class="logo-box">
          <img src="${logoUrl}" alt="SERVYAUTO" />
        </div>
        <div class="cliente-section">
          <div class="cliente-header">CLIENTE</div>
          <div class="cliente-box">
            <div class="nombre">${clienteNombre}</div>
            ${clienteCIF ? `CIF/NIF: ${clienteCIF}<br>` : ''}
            ${clienteDireccion ? `${clienteDireccion}<br>` : ''}
            ${clienteCP ? `${clienteCP}<br>` : ''}
            ${clienteCiudad ? `${clienteCiudad}<br>` : ''}
            ${clienteTelefono ? `Telef: ${clienteTelefono}` : ''}
          </div>
        </div>
      </div>

      <!-- EMAIL + FORMA DE PAGO -->
      <div class="email-pago-row">
        <div class="email-info">
          Email: <a href="mailto:${emisorEmail}">${emisorEmail}</a>
        </div>
        <div class="forma-pago-box">
          <div class="forma-pago-header">FORMA DE PAGO</div>
          <div class="forma-pago-content">${formatMetodoPago(factura.metodoPago || 'EFECTIVO')}</div>
        </div>
      </div>

      <!-- TABLA DE ITEMS -->
      <table class="items-table">
        <thead>
          <tr>
            <th class="desc-col" style="width:55%;">DESCRIPCIÓN</th>
            <th style="width:8%;">CANT</th>
            <th style="width:13%;">PRECIO</th>
            <th style="width:10%;">IVA</th>
            <th style="width:14%;">IMPORTE</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
          ${emptyRowsHTML}
        </tbody>
      </table>

      <!-- OBSERVACIONES -->
      <div class="observaciones">
        Observaciones:
      </div>

      <!-- FOOTER TOTALS -->
      <div class="footer-totals">
        <table class="desglose-table">
          <thead>
            <tr>
              <th>NETO</th>
              <th></th>
              <th>IVA</th>
              <th>REC. EQUIV.</th>
              <th></th>
              <th>IRPF</th>
              <th></th>
              <th>IMPORTES</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${factura.subtotal.toFixed(2)}</td>
              <td>21%</td>
              <td>${factura.iva.toFixed(2)}</td>
              <td></td>
              <td>0 %</td>
              <td></td>
              <td>0,00</td>
              <td>${factura.total.toFixed(2)} €</td>
            </tr>
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-header">EUROS</div>
          <div class="total-row">
            <div class="total-label">TOTAL</div>
            <div class="total-value">${factura.total.toFixed(2)} €</div>
          </div>
        </div>
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
