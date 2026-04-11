/**
 * Utilidades para el sistema multi-local con soporte de roles:
 * - SUPER_ADMIN: Ve todo (sin restricciones)
 * - GRUPO_ADMIN: Ve solo los locales que tiene asignados (via UserLocal)
 * - ADMIN/OPERADOR: Ve solo su local asignado (via localId)
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

export interface LocalFilter {
  localId: string | null;      // Local asignado directamente (ADMIN/OPERADOR)
  canSeeAll: boolean;          // true si es SUPER_ADMIN
  selectedLocalId?: string;    // local seleccionado en el selector
  allowedLocalIds?: string[];  // locales permitidos para GRUPO_ADMIN
  userRole: string;            // rol del usuario
}

/**
 * Obtiene el contexto de local del usuario actual
 * Soporta:
 * - SUPER_ADMIN: ve todo
 * - GRUPO_ADMIN: ve solo locales asignados via UserLocal
 * - ADMIN/OPERADOR: ve solo su localId
 */
export async function getLocalContext(): Promise<LocalFilter | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('⚠️ getLocalContext: No hay sesión o email');
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        localId: true, 
        role: true,
        localesAsignados: {
          select: { localId: true }
        }
      }
    });

    if (!user) {
      console.log('⚠️ getLocalContext: Usuario no encontrado para:', session.user.email);
      return null;
    }
    
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const isGrupoAdmin = user.role === 'GRUPO_ADMIN';
    
    // Obtener IDs de locales permitidos para GRUPO_ADMIN
    let allowedLocalIds: string[] | undefined;
    if (isGrupoAdmin && user.localesAsignados.length > 0) {
      allowedLocalIds = user.localesAsignados.map((ul: any) => ul.localId);
    }
    
    console.log('✅ getLocalContext: Usuario', session.user.email, 
      '| Rol:', user.role, 
      '| LocalId:', user.localId,
      '| LocalesAsignados:', allowedLocalIds?.length || 0);

    // Leer el header x-selected-local-id
    let selectedLocalId: string | undefined;
    const headersList = headers();
    const headerValue = headersList.get('x-selected-local-id');
    
    if (headerValue && headerValue !== 'null') {
      // Validar que el usuario puede acceder a este local
      if (isSuperAdmin) {
        selectedLocalId = headerValue;
      } else if (isGrupoAdmin && allowedLocalIds?.includes(headerValue)) {
        selectedLocalId = headerValue;
      } else if (user.localId === headerValue) {
        selectedLocalId = headerValue;
      }
    }
    
    console.log('🔍 Local Context - Selected:', selectedLocalId);
    
    return {
      localId: user.localId,
      canSeeAll: isSuperAdmin,
      selectedLocalId,
      allowedLocalIds,
      userRole: user.role
    };
  } catch (error) {
    console.error('Error obteniendo contexto de local:', error);
    return null;
  }
}

/**
 * Construye el filtro de Prisma para localId
 * @param context - Contexto de local del usuario
 * @param options - Opciones adicionales
 * @returns Objeto de filtro para usar en where de Prisma
 * 
 * IMPORTANTE: Los datos sin localId (legacy, antes del 1 de marzo) solo son visibles para SUPER_ADMIN.
 * GRUPO_ADMIN, ADMIN y OPERADOR solo ven datos con localId asignado a sus locales.
 */
export function buildLocalFilter(
  context: LocalFilter, 
  options?: { includeLegacy?: boolean }
): { localId?: string | { in: string[] } | null } | { OR?: any[] } | {} {
  // Si ha seleccionado un local específico y tiene acceso, filtrar por ese
  if (context.selectedLocalId) {
    return { localId: context.selectedLocalId };
  }
  
  // SUPER_ADMIN sin selección: ve todo (incluyendo datos legacy sin localId)
  if (context.canSeeAll) {
    return {};
  }
  
  // GRUPO_ADMIN sin selección: filtrar por sus locales permitidos
  // NO incluye datos sin localId (legacy) - esos pertenecen a "central"
  if (context.userRole === 'GRUPO_ADMIN' && context.allowedLocalIds?.length) {
    return { localId: { in: context.allowedLocalIds } };
  }
  
  // ADMIN/OPERADOR: filtrar por su local asignado
  // NO incluye datos sin localId (legacy)
  if (context.localId) {
    return { localId: context.localId };
  }
  
  // Fallback: no mostrar nada si no tiene local asignado
  return { localId: 'NO_ACCESS' };
}

/**
 * Obtiene el localId a usar al crear nuevos registros
 * @param context - Contexto de local del usuario
 * @returns localId para asignar al nuevo registro
 */
export function getLocalIdForCreate(context: LocalFilter): string | null {
  // Si ha seleccionado un local, usar ese
  if (context.selectedLocalId) {
    return context.selectedLocalId;
  }
  
  // Si tiene localId asignado directamente, usar el suyo
  if (context.localId) {
    return context.localId;
  }
  
  // GRUPO_ADMIN: usar el primer local asignado si no seleccionó ninguno
  if (context.allowedLocalIds?.length === 1) {
    return context.allowedLocalIds[0];
  }
  
  return null;
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
  
  // GRUPO_ADMIN: verificar si está en sus locales permitidos
  if (context.userRole === 'GRUPO_ADMIN' && context.allowedLocalIds?.length) {
    return context.allowedLocalIds.includes(recordLocalId);
  }
  
  // ADMIN/OPERADOR: verificar que coincida con su local
  return context.localId === recordLocalId;
}

/**
 * Obtiene los IDs de locales a los que el usuario tiene acceso
 * Útil para el selector de locales en la UI
 */
export function getAllowedLocalIds(context: LocalFilter): string[] | null {
  // SUPER_ADMIN: null significa todos
  if (context.canSeeAll) return null;
  
  // GRUPO_ADMIN: sus locales asignados
  if (context.allowedLocalIds?.length) {
    return context.allowedLocalIds;
  }
  
  // ADMIN/OPERADOR: solo su local
  if (context.localId) {
    return [context.localId];
  }
  
  return [];
}
