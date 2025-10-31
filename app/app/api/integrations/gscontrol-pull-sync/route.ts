
/**
 * Endpoint para ejecutar manualmente la sincronización PULL con GSControl
 * También puede ser llamado por un cron job externo
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sincronizacionCompletaGSControl } from '@/lib/gscontrol-pull-sync'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación O token de cron
    const authHeader = request.headers.get('authorization')
    const cronToken = process.env.CRON_SECRET_TOKEN

    let authorized = false

    // Opción 1: Usuario autenticado
    const session = await getServerSession(authOptions)
    if (session) {
      authorized = true
    }

    // Opción 2: Token de cron job
    if (cronToken && authHeader === `Bearer ${cronToken}`) {
      authorized = true
    }

    if (!authorized) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    console.log('🔄 [API] Ejecutando sincronización PULL con GSControl...')

    await syncAllTransactionsWithGSControl()

    return NextResponse.json({
      success: true,
      message: 'Sincronización PULL completada exitosamente',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [API] Error en sincronización PULL:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

// GET para verificar el estado
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  return NextResponse.json({
    service: 'GSControl PULL Sync',
    status: 'ready',
    endpoint: '/api/integrations/gscontrol-pull-sync',
    description: 'Sistema de sincronización PULL bidireccional con GSControl',
    configured: !!process.env.GSCONTROL_API_KEY
  })
}
