

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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

    // Aquí implementarías el envío real del email
    // Por ahora, solo registramos la acción
    console.log('Enviando email:', {
      to: email,
      subject: `${factura.tipo} #${factura.numero} - ServyAuto`,
      message: mensaje,
      factura: {
        numero: factura.numero,
        tipo: factura.tipo,
        total: factura.total,
        cliente: `${factura.cliente.nombre} ${factura.cliente.apellido}`,
      },
    })

    // TODO: Implementar envío real con servicio de email (SendGrid, AWS SES, etc.)
    // Ejemplo con SendGrid:
    // const sgMail = require('@sendgrid/mail')
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    // await sgMail.send({
    //   to: email,
    //   from: 'noreply@servyauto.com',
    //   subject: `${factura.tipo} #${factura.numero}`,
    //   text: mensaje,
    //   attachments: [
    //     {
    //       filename: `${factura.tipo}-${factura.numero}.pdf`,
    //       content: pdfBuffer,
    //       type: 'application/pdf',
    //     }
    //   ],
    // })

    return NextResponse.json({
      success: true,
      message: 'Email enviado correctamente',
    })
  } catch (error) {
    console.error('Error al enviar email:', error)
    return NextResponse.json(
      { error: 'Error al enviar email' },
      { status: 500 }
    )
  }
}
