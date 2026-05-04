/**
 * Utilidades para el sistema multi-tenant + multi-local con soporte de roles:
 * - SUPER_ADMIN: Ve todo (sin restricciones de tenant ni local)
 * - GRUPO_ADMIN: Ve solo los locales que tiene asignados (via UserLocal)
 * - ADMIN/OPERADOR: Ve solo su local asignado (via localId)
 *
 * El tenantId se propaga automáticamente desde el JWT (detectado por subdominio en middleware).
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

export interface LocalFilter {
  localId: string | null;
  canSeeAll: boolean;
  selectedLocalId?: string;
  allowedLocalIds?: string[];
  userRole: string;
  tenantId: string | null;
  tenantSlug: string | null;
}

/**
 * Obtiene el contexto de local+tenant del usuario actual
 */
export async function getLocalContext(): Promise<LocalFilter | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return null;
    }

    const sessionUser = session.user as any;

    // tenantId viene del JWT (propagado desde el middleware via authorize)
    const tenantId: string | null = sessionUser.tenantId || null;
    const tenantSlug: string | null = sessionUser.tenantSlug || null;

    // Para SUPER_ADMIN sin tenant, buscar por email solamente
    const whereUser = tenantId
      ? { email: session.user.email, tenantId }
      : { email: session.user.email };

    const user = await prisma.user.findFirst({
      where: whereUser,
      select: {
        id: true,
        localId: true,
        role: true,
        tenantId: true,
        localesAsignados: {
          select: { localId: true }
        }
      }
    });

    if (!user) {
      return null;
    }

    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const isGrupoAdmin = user.role === 'GRUPO_ADMIN';

    let allowedLocalIds: string[] | undefined;
    if (isGrupoAdmin && user.localesAsignados.length > 0) {
      allowedLocalIds = user.localesAsignados.map((ul: any) => ul.localId);
    }

    // Leer el header x-selected-local-id
    let selectedLocalId: string | undefined;
    const headersList = headers();
    const headerValue = headersList.get('x-selected-local-id');

    if (headerValue && headerValue !== 'null') {
      if (isSuperAdmin) {
        selectedLocalId = headerValue;
      } else if (isGrupoAdmin && allowedLocalIds?.includes(headerValue)) {
        selectedLocalId = headerValue;
      } else if (user.localId === headerValue) {
        selectedLocalId = headerValue;
      }
    }

    return {
      localId: user.localId,
      canSeeAll: isSuperAdmin,
      selectedLocalId,
      allowedLocalIds,
      userRole: user.role,
      tenantId: user.tenantId || tenantId,
      tenantSlug,
    };
  } catch (error) {
    console.error('Error obteniendo contexto de local:', error);
    return null;
  }
}

/**
 * Construye el filtro de Prisma para tenantId + localId
 */
export function buildLocalFilter(
  context: LocalFilter,
  options?: { includeLegacy?: boolean }
): Record<string, any> {
  const tenantFilter = context.canSeeAll || !context.tenantId
    ? {}
    : { tenantId: context.tenantId };

  // Si ha seleccionado un local específico y tiene acceso, filtrar por ese
  if (context.selectedLocalId) {
    return { ...tenantFilter, localId: context.selectedLocalId };
  }

  // SUPER_ADMIN sin selección: ve todo (incluyendo datos legacy sin localId)
  if (context.canSeeAll) {
    return {};
  }

  // GRUPO_ADMIN sin selección: filtrar por sus locales permitidos
  if (context.userRole === 'GRUPO_ADMIN' && context.allowedLocalIds?.length) {
    return { ...tenantFilter, localId: { in: context.allowedLocalIds } };
  }

  // ADMIN/OPERADOR: filtrar por su local asignado
  if (context.localId) {
    return { ...tenantFilter, localId: context.localId };
  }

  // Fallback: no mostrar nada si no tiene local asignado
  return { localId: 'NO_ACCESS' };
}

/**
 * Obtiene el localId a usar al crear nuevos registros
 */
export function getLocalIdForCreate(context: LocalFilter): string | null {
  if (context.selectedLocalId) {
    return context.selectedLocalId;
  }

  if (context.localId) {
    return context.localId;
  }

  if (context.allowedLocalIds?.length === 1) {
    return context.allowedLocalIds[0];
  }

  return null;
}

/**
 * Verifica si el usuario puede acceder a un registro de un local específico
 */
export function canAccessRecord(context: LocalFilter, recordLocalId: string | null): boolean {
  if (context.canSeeAll) return true;

  if (!recordLocalId) return true;

  if (context.userRole === 'GRUPO_ADMIN' && context.allowedLocalIds?.length) {
    return context.allowedLocalIds.includes(recordLocalId);
  }

  return context.localId === recordLocalId;
}

/**
 * Obtiene los IDs de locales a los que el usuario tiene acceso
 */
export function getAllowedLocalIds(context: LocalFilter): string[] | null {
  if (context.canSeeAll) return null;

  if (context.allowedLocalIds?.length) {
    return context.allowedLocalIds;
  }

  if (context.localId) {
    return [context.localId];
  }

  return [];
}
