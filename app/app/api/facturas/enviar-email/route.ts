

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { facturaId, email, mensaje } = await request.json()

    if (!facturaId || !email) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Obtener la factura con todos sus detalles
    const factura = await prisma.factura.findUnique({
      where: { id: facturaId },
      include: {
        cliente: true,
        factura_items: true,
      },
    })

    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      )
    }

    // Generar el HTML del documento para adjuntarlo
    const documentUrl = `${process.env.NEXTAUTH_URL}/api/facturas/${facturaId}/pdf`
    
    // Crear el contenido HTML del email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9fafb; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #2563eb; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px;
              margin: 15px 0;
            }
            .details { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ServyAuto</h1>
              <p>Taller Automotriz</p>
            </div>
            
            <div class="content">
              <h2>¡Hola ${factura.cliente.nombre}!</h2>
              <p>${mensaje}</p>
              
              <div class="details">
                <h3>${factura.tipo} #${factura.numero}</h3>
                <div class="details-row">
                  <span><strong>Fecha:</strong></span>
                  <span>${new Date(factura.fecha).toLocaleDateString('es-ES')}</span>
                </div>
                <div class="details-row">
                  <span><strong>Total:</strong></span>
                  <span style="color: #059669; font-size: 18px; font-weight: bold;">€${factura.total.toFixed(2)}</span>
                </div>
                <div class="details-row" style="border-bottom: none;">
                  <span><strong>Estado:</strong></span>
                  <span style="color: ${factura.estado === 'PAGADA' ? '#059669' : '#d97706'};">${factura.estado}</span>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${documentUrl}" class="button">Ver/Descargar Documento</a>
                <p style="font-size: 12px; color: #666;">
                  También puedes imprimir este documento directamente desde el enlace.
                </p>
              </div>

              <p style="margin-top: 20px;">Si tienes alguna pregunta o necesitas más información, no dudes en contactarnos.</p>
            </div>
            
            <div class="footer">
              <p><strong>ServyAuto</strong></p>
              <p>Email: info@servyauto.com | Tel: [Tu teléfono]</p>
              <p style="margin-top: 10px; color: #999;">
                Este es un mensaje automático, por favor no responder a este correo.
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    // Enviar el email
    try {
      await sendEmail({
        to: email,
        subject: `${factura.tipo} #${factura.numero} - ServyAuto`,
        html: emailHtml,
        text: mensaje,
      })

      return NextResponse.json({
        success: true,
        message: 'Email enviado correctamente',
      })
    } catch (emailError: any) {
      console.error('Error al enviar email:', emailError)
      
      // Si falta configuración de email, dar un mensaje específico
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        return NextResponse.json(
          { 
            error: 'El servicio de email no está configurado. Por favor, contacta al administrador del sistema.',
            details: 'Faltan las credenciales EMAIL_USER y/o EMAIL_PASSWORD en las variables de entorno.'
          },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { 
          error: 'Error al enviar el email. Verifica que el email del destinatario sea válido.',
          details: emailError.message 
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error al enviar email:', error)
    return NextResponse.json(
      { error: 'Error al enviar email', details: error.message },
      { status: 500 }
    )
  }
}
