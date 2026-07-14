import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db'
import { requireSuperAdminForDelete } from '@/lib/activity-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const ingreso = await prisma.ingresoAdicional.findUnique({
      where: { id: params.id },
      include: { local: true },
    });

    if (!ingreso) {
      return NextResponse.json({ error: 'Ingreso no encontrado' }, { status: 404 });
    }

    return NextResponse.json(ingreso);
  } catch (error) {
    console.error('Error al obtener ingreso:', error);
    return NextResponse.json({ error: 'Error al obtener ingreso' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { concepto, descripcion, importe, fecha, metodoPago, observaciones } = body;

    const ingresoActualizado = await prisma.ingresoAdicional.update({
      where: { id: params.id },
      data: {
        ...(concepto && { concepto }),
        ...(descripcion !== undefined && { descripcion }),
        ...(importe !== undefined && { importe: parseFloat(importe) }),
        ...(fecha && { fecha: new Date(fecha) }),
        ...(metodoPago && { metodoPago }),
        ...(observaciones !== undefined && { observaciones }),
      },
      include: { local: true },
    });

    console.log(`✅ Ingreso adicional actualizado: ${ingresoActualizado.concepto}`);

    return NextResponse.json(ingresoActualizado);
  } catch (error) {
    console.error('Error al actualizar ingreso:', error);
    return NextResponse.json({ error: 'Error al actualizar ingreso' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const guardResponse = await requireSuperAdminForDelete();
    if (guardResponse) return guardResponse;

    const ingreso = await prisma.ingresoAdicional.delete({
      where: { id: params.id },
    });

    console.log(`🗑️ Ingreso adicional eliminado: ${ingreso.concepto}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar ingreso:', error);
    return NextResponse.json({ error: 'Error al eliminar ingreso' }, { status: 500 });
  }
}
