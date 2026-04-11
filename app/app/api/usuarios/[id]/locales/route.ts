import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Obtener locales asignados a un usuario
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo SUPER_ADMIN puede ver asignaciones de otros usuarios
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    });

    if (currentUser?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const userLocales = await prisma.userLocal.findMany({
      where: { userId: params.id },
      include: {
        local: {
          select: { id: true, nombre: true, nombreComercial: true, activo: true }
        }
      }
    });

    return NextResponse.json(userLocales.map((ul: any) => ul.local));
  } catch (error) {
    console.error('Error al obtener locales del usuario:', error);
    return NextResponse.json({ error: 'Error al obtener locales' }, { status: 500 });
  }
}

// PUT - Actualizar locales asignados a un usuario (reemplaza todos)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo SUPER_ADMIN puede modificar asignaciones
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    });

    if (currentUser?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { localIds } = await request.json();

    if (!Array.isArray(localIds)) {
      return NextResponse.json({ error: 'localIds debe ser un array' }, { status: 400 });
    }

    // Eliminar todas las asignaciones actuales
    await prisma.userLocal.deleteMany({
      where: { userId: params.id }
    });

    // Crear nuevas asignaciones
    if (localIds.length > 0) {
      await prisma.userLocal.createMany({
        data: localIds.map((localId: string) => ({
          userId: params.id,
          localId
        }))
      });
    }

    // Obtener resultado actualizado
    const userLocales = await prisma.userLocal.findMany({
      where: { userId: params.id },
      include: {
        local: {
          select: { id: true, nombre: true, nombreComercial: true, activo: true }
        }
      }
    });

    console.log(`✅ Locales actualizados para usuario ${params.id}:`, localIds);

    return NextResponse.json(userLocales.map((ul: any) => ul.local));
  } catch (error) {
    console.error('Error al actualizar locales del usuario:', error);
    return NextResponse.json({ error: 'Error al actualizar locales' }, { status: 500 });
  }
}

// POST - Añadir un local a un usuario
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    });

    if (currentUser?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { localId } = await request.json();

    if (!localId) {
      return NextResponse.json({ error: 'localId es requerido' }, { status: 400 });
    }

    // Verificar que no exista ya
    const existing = await prisma.userLocal.findUnique({
      where: {
        userId_localId: {
          userId: params.id,
          localId
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'El local ya está asignado a este usuario' }, { status: 400 });
    }

    const userLocal = await prisma.userLocal.create({
      data: {
        userId: params.id,
        localId
      },
      include: {
        local: {
          select: { id: true, nombre: true, nombreComercial: true, activo: true }
        }
      }
    });

    return NextResponse.json(userLocal.local, { status: 201 });
  } catch (error) {
    console.error('Error al añadir local al usuario:', error);
    return NextResponse.json({ error: 'Error al añadir local' }, { status: 500 });
  }
}

// DELETE - Quitar un local de un usuario
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    });

    if (currentUser?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { localId } = await request.json();

    if (!localId) {
      return NextResponse.json({ error: 'localId es requerido' }, { status: 400 });
    }

    await prisma.userLocal.delete({
      where: {
        userId_localId: {
          userId: params.id,
          localId
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al quitar local del usuario:', error);
    return NextResponse.json({ error: 'Error al quitar local' }, { status: 500 });
  }
}
