
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getTwilioStatus } from '@/lib/notifications'
import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

// GET: Obtener estado de configuración de Twilio
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const status = getTwilioStatus()
    
    return NextResponse.json({
      ...status,
      // Ocultar credenciales completas por seguridad
      phoneNumber: process.env.TWILIO_PHONE_NUMBER ? `***${process.env.TWILIO_PHONE_NUMBER.slice(-4)}` : 'No configurado',
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'No configurado'
    })
  } catch (error) {
    console.error('Error getting Twilio status:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST: Actualizar configuración de Twilio
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { accountSid, authToken, phoneNumber, whatsappNumber } = body

    // Leer el archivo .env actual
    const envPath = join(process.cwd(), '.env')
    let envContent = ''
    
    try {
      envContent = await readFile(envPath, 'utf-8')
    } catch (error) {
      console.log('.env file not found, creating new one')
    }

    // Actualizar o agregar las variables de Twilio
    const envLines = envContent.split('\n')
    const twilioVars = {
      'TWILIO_ACCOUNT_SID': accountSid,
      'TWILIO_AUTH_TOKEN': authToken,
      'TWILIO_PHONE_NUMBER': phoneNumber,
      'TWILIO_WHATSAPP_NUMBER': whatsappNumber
    }

    Object.entries(twilioVars).forEach(([key, value]) => {
      if (value) {
        const index = envLines.findIndex(line => line.startsWith(`${key}=`))
        if (index !== -1) {
          envLines[index] = `${key}=${value}`
        } else {
          envLines.push(`${key}=${value}`)
        }
      }
    })

    // Escribir el archivo .env actualizado
    await writeFile(envPath, envLines.join('\n'), 'utf-8')

    // Actualizar las variables de entorno en el proceso actual
    if (accountSid) process.env.TWILIO_ACCOUNT_SID = accountSid
    if (authToken) process.env.TWILIO_AUTH_TOKEN = authToken
    if (phoneNumber) process.env.TWILIO_PHONE_NUMBER = phoneNumber
    if (whatsappNumber) process.env.TWILIO_WHATSAPP_NUMBER = whatsappNumber

    return NextResponse.json({ 
      success: true, 
      message: 'Configuración de Twilio actualizada correctamente'
    })
  } catch (error) {
    console.error('Error updating Twilio config:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
