
import nodemailer from 'nodemailer'

// Configurar el transporter de nodemailer
export function createEmailTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true para 465, false para otros puertos
    auth: {
      user: process.env.EMAIL_USER || 'info@servyauto.com',
      pass: process.env.EMAIL_PASSWORD || '',
    },
  })
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: any[]
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments,
}: SendEmailOptions) {
  const transporter = createEmailTransporter()

  const mailOptions = {
    from: `ServyAuto <${process.env.EMAIL_USER || 'info@servyauto.com'}>`,
    to,
    subject,
    text: text || '',
    html,
    attachments: attachments || [],
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Email enviado correctamente:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error al enviar email:', error)
    throw error
  }
}
