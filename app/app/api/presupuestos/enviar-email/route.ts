export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { presupuestoId, email, mensaje } = await req.json()
    if (!presupuestoId || !email) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const pres = await prisma.presupuesto.findUnique({
      where: { id: presupuestoId },
      include: { items: true },
    })
    if (!pres) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const pdfUrl = `${process.env.NEXTAUTH_URL}/api/presupuestos/${presupuestoId}/pdf`

    const itemsHtml = pres.items.map(i =>
      `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px;">${i.descripcion}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;font-size:13px;">${i.cantidad}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-size:13px;">${i.total.toFixed(2)}€</td></tr>`
    ).join('')

    const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;color:#333;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#F5A623;color:#000;padding:16px;text-align:center;">
          <h1 style="margin:0;font-size:22px;">SERVYAUTO</h1>
          <p style="margin:4px 0 0;font-size:12px;">Presupuesto / Factura Proforma</p>
        </div>
        <div style="padding:20px;background:#f9fafb;">
          <h2 style="color:#333;">Hola ${pres.clienteNombre},</h2>
          <p>${mensaje || 'Le enviamos su presupuesto detallado.'}</p>
          <div style="background:#fff;padding:15px;border-radius:5px;margin:15px 0;">
            <h3 style="margin:0 0 10px;">${pres.numero}</h3>
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="background:#f0f0f0;"><th style="padding:6px 8px;text-align:left;font-size:12px;">Concepto</th><th style="padding:6px 8px;text-align:center;font-size:12px;">Cant.</th><th style="padding:6px 8px;text-align:right;font-size:12px;">Total</th></tr></thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <div style="text-align:right;margin-top:10px;font-size:18px;font-weight:bold;color:#F5A623;">Total: ${pres.total.toFixed(2)}€</div>
          </div>
          <div style="text-align:center;">
            <a href="${pdfUrl}" style="display:inline-block;padding:12px 24px;background:#F5A623;color:#000;text-decoration:none;border-radius:5px;font-weight:bold;">Ver / Descargar PDF</a>
          </div>
        </div>
        <div style="padding:15px;text-align:center;font-size:11px;color:#999;">
          <p>SERVYAUTO • info@servyauto.com</p>
        </div>
      </div>
    </body></html>`

    await sendEmail({
      to: email,
      subject: `Presupuesto ${pres.numero} - ServyAuto`,
      html: emailHtml,
      text: mensaje || `Presupuesto ${pres.numero} por ${pres.total.toFixed(2)}€. Ver: ${pdfUrl}`,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error enviando email presupuesto:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
