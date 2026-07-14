import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export type ActivityAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'CONVERT' | 'VIEW' | 'CONFIG'

export interface LogActivityParams {
  action: ActivityAction
  entity: string
  entityId?: string
  description: string
  details?: Record<string, any>
  userId?: string
  userName?: string
  userEmail?: string
  ipAddress?: string
}

/**
 * Registra una actividad en el log del sistema.
 * Si no se pasan userId/userName/userEmail, los obtiene de la sesión actual.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    let { userId, userName, userEmail } = params

    // Si no se pasaron datos de usuario, intentar obtenerlos de la sesión
    if (!userId && !userName) {
      try {
        const session = await getServerSession(authOptions)
        if (session?.user) {
          userId = (session.user as any).id
          userName = session.user.name || undefined
          userEmail = session.user.email || undefined
        }
      } catch {
        // Silenciar error de sesión (puede ser llamada fuera de contexto HTTP)
      }
    }

    await prisma.activityLog.create({
      data: {
        userId: userId || null,
        userName: userName || null,
        userEmail: userEmail || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        description: params.description,
        details: params.details || undefined,
        ipAddress: params.ipAddress || null,
      }
    })
  } catch (error) {
    // No bloquear la operación principal por un fallo en el log
    console.error('[ActivityLog] Error registrando actividad:', error)
  }
}

/**
 * Helper para obtener datos del usuario de la sesión para logging.
 */
export async function getSessionUserForLog() {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user) {
      return {
        userId: (session.user as any).id as string,
        userName: session.user.name || 'Sin nombre',
        userEmail: session.user.email || '',
        role: (session.user as any).role as string,
      }
    }
  } catch {}
  return null
}

/**
 * Guard que verifica si el usuario es SUPER_ADMIN.
 * Si no lo es, devuelve un NextResponse con 403. Si lo es, devuelve null.
 * Úsalo para proteger endpoints DELETE.
 */
export async function requireSuperAdminForDelete(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  const role = (session.user as any).role
  const userId = (session.user as any).id

  // SUPER_ADMIN siempre puede borrar
  if (role === 'SUPER_ADMIN') {
    return null
  }

  // Otros roles: verificar si tienen permiso puedeEliminar
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { puedeEliminar: true },
    })
    if (user?.puedeEliminar) {
      return null
    }
  } catch {
    // Si falla la consulta, denegar por defecto
  }

  // Registrar intento de borrado no autorizado
  await logActivity({
    action: 'DELETE',
    entity: 'SISTEMA',
    description: `Intento de borrado denegado - Usuario: ${session.user.name || session.user.email} (${role})`,
    userId,
    userName: session.user.name || undefined,
    userEmail: session.user.email || undefined,
  })
  return NextResponse.json(
    { error: 'No tienes permiso para eliminar registros. Contacta con el SuperAdmin.' },
    { status: 403 }
  )
}
