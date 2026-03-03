/**
 * Utilidades para el sistema multi-local
 * - Obtener localId del usuario actual
 * - Filtrar consultas por local
 * - Verificar permisos de acceso
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

export interface LocalFilter {
  localId: string | null;  // null = superadmin ve todo
  canSeeAll: boolean;      // true si es superadmin
  selectedLocalId?: string; // local seleccionado por superadmin para filtrar
}

/**
 * Obtiene el contexto de local del usuario actual
 * Lee el header x-selected-local-id si existe (para superadmin)
 */
export async function getLocalContext(): Promise<LocalFilter | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return null;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, localId: true, role: true }
    });

    if (!user) return null;

    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    
    // Leer el header x-selected-local-id si es superadmin
    let selectedLocalId: string | undefined;
    if (isSuperAdmin) {
      const headersList = headers();
      const headerValue = headersList.get('x-selected-local-id');
      console.log('🔍 Local Context - Header x-selected-local-id:', headerValue);
      if (headerValue && headerValue !== 'null') {
        selectedLocalId = headerValue;
      }
    }
    
    return {
      localId: user.localId,
      canSeeAll: isSuperAdmin,
      selectedLocalId
    };
  } catch (error) {
    console.error('Error obteniendo contexto de local:', error);
    return null;
  }
}

/**
 * Construye el filtro de Prisma para localId
 * @param context - Contexto de local del usuario
 * @returns Objeto de filtro para usar en where de Prisma
 */
export function buildLocalFilter(context: LocalFilter): { localId?: string } | {} {
  // Si es superadmin y ha seleccionado un local específico, filtrar por ese
  if (context.canSeeAll && context.selectedLocalId) {
    return { localId: context.selectedLocalId };
  }
  
  // Si es superadmin sin selección, no filtrar (ve todo)
  if (context.canSeeAll) {
    return {};
  }
  
  // Si tiene localId asignado, filtrar por su local
  if (context.localId) {
    return { localId: context.localId };
  }
  
  // Si no tiene local asignado (caso raro), no filtrar
  return {};
}

/**
 * Obtiene el localId a usar al crear nuevos registros
 * @param context - Contexto de local del usuario
 * @returns localId para asignar al nuevo registro
 */
export function getLocalIdForCreate(context: LocalFilter): string | null {
  // Si es superadmin y ha seleccionado un local, usar ese
  if (context.canSeeAll && context.selectedLocalId) {
    return context.selectedLocalId;
  }
  
  // Si tiene localId asignado, usar el suyo
  return context.localId;
}

/**
 * Verifica si el usuario puede acceder a un registro de un local específico
 * @param context - Contexto de local del usuario
 * @param recordLocalId - localId del registro a acceder
 */
export function canAccessRecord(context: LocalFilter, recordLocalId: string | null): boolean {
  // Superadmin puede acceder a todo
  if (context.canSeeAll) return true;
  
  // Si el registro no tiene local, permitir acceso (datos legacy)
  if (!recordLocalId) return true;
  
  // Verificar que el local del registro coincida con el del usuario
  return context.localId === recordLocalId;
}
