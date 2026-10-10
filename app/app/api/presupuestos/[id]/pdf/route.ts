export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { SERVYAUTO_LOGO_BASE64 } from '@/lib/logo-base64'

function generateProformaHTML(pres: any): string {
  const naranja = '#F5A623'
  const naranjaOscuro = '#E8961E'

  // Datos fiscales emisor (fijos)
  const emisorComercial = 'SERVYAUTO'
  const emisorNombre = 'JOSE M. MILLAN FERNÁNDEZ'
  const emisorCif = '54322040L'
  const emisorDireccion = 'AVDA ARIAS MALDONADO S/N PARKING OCCIDENTAL -1'
  const emisorCpCiudad = '29602 - MARBELLA (MALAGA)'
  const emisorTelefono = '610543228'

  const fechaPres = format(new Date(pres.fecha), 'dd-MM-yyyy', { locale: es })
  const fechaValido = pres.validoHasta ? format(new Date(pres.validoHasta), 'dd-MM-yyyy', { locale: es }) : null

  const estadoLabel: Record<string, string> = {
    BORRADOR: 'Borrador',
    ENVIADO: 'Enviado',
    ACEPTADO: 'Aceptado',
    RECHAZADO: 'Rechazado',
    EXPIRADO: 'Expirado',
    CONVERTIDO: 'Convertido a cita',
  }

  const itemsRows = (pres.items || []).map((item: any) => {
    const precioNeto = item.precioUnitario
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;font-size:11px;">${item.descripcion}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:center;font-size:11px;">${item.cantidad}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right;font-size:11px;">${precioNeto.toFixed(2)} &euro;</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:center;font-size:11px;">21,0%</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right;font-size:11px;font-weight:600;">${item.total.toFixed(2)} &euro;</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Proforma ${pres.numero}</title></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff;">
  <div style="max-width:210mm;margin:0 auto;padding:12mm 15mm 10mm 15mm;">

    <!-- HEADER -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:0;">
      <tr>
        <td style="vertical-align:top;width:60%;background:${naranja};padding:10px 14px;border:2px solid ${naranjaOscuro};">
          <div style="font-size:16px;font-weight:bold;color:#000;letter-spacing:0.5px;">${emisorComercial}</div>
          <div style="font-size:10px;color:#000;line-height:1.5;margin-top:2px;">
            ${emisorNombre}<br>CIF/NIF: ${emisorCif}<br>${emisorDireccion}<br>${emisorCpCiudad}<br>Tel&eacute;fono: ${emisorTelefono}
          </div>
        </td>
        <td style="vertical-align:top;width:40%;padding-left:8px;">
          <div style="background:${naranja};border:2px solid ${naranjaOscuro};padding:8px 12px;text-align:center;">
            <div style="font-size:9px;text-transform:uppercase;color:#000;letter-spacing:1px;">Factura Proforma</div>
            <div style="font-size:18px;font-weight:bold;color:#000;margin-top:2px;">${pres.numero}</div>
          </div>
          <div style="margin-top:6px;padding:6px 12px;border:1px solid #ccc;background:#f9f9f9;">
            <table style="width:100%;font-size:10px;color:#333;">
              <tr><td style="padding:2px 0;">Fecha:</td><td style="text-align:right;font-weight:bold;">${fechaPres}</td></tr>
              ${fechaValido ? `<tr><td style="padding:2px 0;">Válido hasta:</td><td style="text-align:right;font-weight:bold;">${fechaValido}</td></tr>` : ''}
              <tr><td style="padding:2px 0;">Estado:</td><td style="text-align:right;font-weight:bold;">${estadoLabel[pres.estado] || pres.estado}</td></tr>
            </table>
          </div>
        </td>
      </tr>
    </table>

    <!-- CLIENTE -->
    <div style="margin-top:12px;border:1px solid #ccc;padding:8px 12px;background:#fafafa;">
      <div style="font-size:9px;text-transform:uppercase;color:#777;margin-bottom:3px;letter-spacing:1px;">Datos del Cliente</div>
      <div style="font-size:12px;font-weight:bold;">${pres.clienteNombre}</div>
      ${pres.clienteTelefono ? `<div style="font-size:10px;color:#444;">Tel: ${pres.clienteTelefono}</div>` : ''}
      ${pres.clienteEmail ? `<div style="font-size:10px;color:#444;">Email: ${pres.clienteEmail}</div>` : ''}
      ${pres.vehiculoInfo ? `<div style="font-size:10px;color:#444;margin-top:2px;">Vehículo: ${pres.vehiculoInfo}</div>` : ''}
    </div>

    <!-- ITEMS -->
    <table style="width:100%;border-collapse:collapse;margin-top:14px;">
      <thead>
        <tr style="background:${naranja};">
          <th style="padding:6px 8px;text-align:left;font-size:10px;color:#000;font-weight:bold;text-transform:uppercase;">Concepto</th>
          <th style="padding:6px 8px;text-align:center;font-size:10px;color:#000;font-weight:bold;text-transform:uppercase;">Cant.</th>
          <th style="padding:6px 8px;text-align:right;font-size:10px;color:#000;font-weight:bold;text-transform:uppercase;">Precio</th>
          <th style="padding:6px 8px;text-align:center;font-size:10px;color:#000;font-weight:bold;text-transform:uppercase;">IVA</th>
          <th style="padding:6px 8px;text-align:right;font-size:10px;color:#000;font-weight:bold;text-transform:uppercase;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <!-- TOTALS -->
    <table style="width:100%;margin-top:12px;">
      <tr>
        <td style="width:60%;vertical-align:top;">
          ${pres.observaciones ? `<div style="border:1px solid #ddd;padding:8px;font-size:10px;color:#555;background:#fafafa;"><strong>Observaciones:</strong><br>${pres.observaciones.replace(/\n/g, '<br>')}</div>` : ''}
        </td>
        <td style="width:40%;vertical-align:top;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:4px 8px;font-size:11px;border-bottom:1px solid #eee;">Base imponible</td>
              <td style="padding:4px 8px;font-size:11px;text-align:right;border-bottom:1px solid #eee;">${pres.subtotal.toFixed(2)} &euro;</td>
            </tr>
            <tr>
              <td style="padding:4px 8px;font-size:11px;border-bottom:1px solid #eee;">IVA (21%)</td>
              <td style="padding:4px 8px;font-size:11px;text-align:right;border-bottom:1px solid #eee;">${pres.iva.toFixed(2)} &euro;</td>
            </tr>
            <tr style="background:${naranja};">
              <td style="padding:6px 8px;font-size:13px;font-weight:bold;">TOTAL</td>
              <td style="padding:6px 8px;font-size:13px;font-weight:bold;text-align:right;">${pres.total.toFixed(2)} &euro;</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- FOOTER -->
    <div style="margin-top:20px;border-top:2px solid ${naranja};padding-top:8px;text-align:center;font-size:9px;color:#999;">
      Este documento es una factura proforma y no tiene validez fiscal. &bull; SERVYAUTO
    </div>
  </div>
</body>
</html>`
}

async function generatePDF(htmlContent: string): Promise<Buffer | null> {
  try {
    const apiKey = process.env.ABACUSAI_API_KEY
    if (!apiKey) return null

    const pdfOptions = {
      format: 'A4',
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      print_background: true,
    }

    const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: apiKey,
        html_content: htmlContent,
        pdf_options: pdfOptions,
        base_url: process.env.NEXTAUTH_URL || '',
      }),
    })

    if (!createResponse.ok) return null
    const createResult = await createResponse.json()
    const requestId = createResult?.request_id
    if (!requestId) return null

    let attempts = 0
    while (attempts < 120) {
      await new Promise(r => setTimeout(r, 1000))
      const statusResponse = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, deployment_token: apiKey }),
      })
      const statusResult = await statusResponse.json()
      if (statusResult?.status === 'SUCCESS' && statusResult?.result?.result) {
        return Buffer.from(statusResult.result.result, 'base64')
      } else if (statusResult?.status === 'FAILED') return null
      attempts++
    }
    return null
  } catch { return null }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Enlace PÚBLICO: el PDF de la proforma se comparte con el cliente por WhatsApp/email.
    // El id es un cuid imposible de adivinar y actúa como token. No se exige sesión
    // para que el cliente (sin login) pueda abrir el enlace.
    const pres = await prisma.presupuesto.findUnique({
      where: { id: params.id },
      include: { items: true, local: true, cliente: true },
    })
    if (!pres) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const formato = searchParams.get('formato') || 'pdf'
    const htmlContent = generateProformaHTML(pres)
    const filename = `Proforma_${pres.numero}`.replace(/[^a-zA-Z0-9_-]/g, '_')

    if (formato === 'html') {
      return new NextResponse(htmlContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `inline; filename="${filename}.html"` },
      })
    }

    const pdfBuffer = await generatePDF(htmlContent)
    if (pdfBuffer) {
      return new NextResponse(pdfBuffer, {
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}.pdf"` },
      })
    }
    return new NextResponse(htmlContent, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `inline; filename="${filename}.html"` },
    })
  } catch (error: any) {
    console.error('Error generando proforma PDF:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
