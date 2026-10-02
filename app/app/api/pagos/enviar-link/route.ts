import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { email, paymentUrl, amount, descripcion } = await request.json()

    if (!email || !paymentUrl) {
      return NextResponse.json({ error: 'Faltan datos requeridos (email y enlace)' }, { status: 400 })
    }

    const importe = typeof amount === 'number' ? amount.toFixed(2) : amount

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin:0; padding:0; background:#f4f4f5;">
          <div style="max-width:600px; margin:0 auto; padding:20px;">
            <div style="background:#0f172a; color:#fff; padding:24px; text-align:center; border-radius:12px 12px 0 0;">
              <h1 style="margin:0; font-size:22px;">ServyAuto</h1>
              <p style="margin:4px 0 0; opacity:.85;">Enlace de pago</p>
            </div>
            <div style="background:#fff; padding:28px; border-radius:0 0 12px 12px;">
              <p>Hola,</p>
              <p>Aquí tienes tu enlace para pagar de forma segura desde tu propio móvil (tarjeta, Apple Pay o Google Pay).</p>
              ${descripcion ? `<p style="color:#555;">${descripcion}</p>` : ''}
              <div style="text-align:center; margin:24px 0;">
                <div style="font-size:28px; font-weight:bold; color:#0f172a; margin-bottom:16px;">${importe} €</div>
                <a href="${paymentUrl}" style="display:inline-block; padding:14px 28px; background:#0f172a; color:#fff; text-decoration:none; border-radius:8px; font-weight:bold;">Pagar ahora</a>
              </div>
              <p style="font-size:13px; color:#777;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br><span style="word-break:break-all; color:#2563eb;">${paymentUrl}</span></p>
            </div>
            <p style="text-align:center; font-size:12px; color:#999; margin-top:16px;">ServyAuto · Gracias por su confianza</p>
          </div>
        </body>
      </html>`

    await sendEmail({
      to: email,
      subject: `ServyAuto · Enlace de pago (${importe} €)`,
      html: emailHtml,
      text: `Enlace de pago ServyAuto por ${importe} €: ${paymentUrl}`,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error enviando enlace de pago por email:', error)
    return NextResponse.json({ error: 'No se pudo enviar el email' }, { status: 500 })
  }
}
