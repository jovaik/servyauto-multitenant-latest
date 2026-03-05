import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Obtener un local específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const local = await prisma.local.findUnique({
      where: { id: params.id },
      include: {
        usuarios: {
          select: { id: true, name: true, email: true, role: true }
        },
        _count: {
          select: {
            clientes: true,
            citas: true,
            facturas: true,
            gastos: true,
          }
        }
      }
    });

    if (!local) {
      return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 });
    }

    return NextResponse.json(local);
  } catch (error) {
    console.error('Error al obtener local:', error);
    return NextResponse.json({ error: 'Error al obtener local' }, { status: 500 });
  }
}

// PUT - Actualizar local
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const { 
      nombre, nombreComercial, logo, direccion, ciudad, codigoPostal, 
      telefono, email, colorPrimario, activo,
      // Campos fiscales
      cifNif, razonSocial, direccionFiscal, codigoPostalFiscal, ciudadFiscal
    } = data;

    const local = await prisma.local.update({
      where: { id: params.id },
      data: {
        ...(nombre !== undefined && { nombre }),
        ...(nombreComercial !== undefined && { nombreComercial }),
        ...(logo !== undefined && { logo }),
        ...(direccion !== undefined && { direccion }),
        ...(ciudad !== undefined && { ciudad }),
        ...(codigoPostal !== undefined && { codigoPostal }),
        ...(telefono !== undefined && { telefono }),
        ...(email !== undefined && { email }),
        ...(colorPrimario !== undefined && { colorPrimario }),
        ...(activo !== undefined && { activo }),
        // Campos fiscales
        ...(cifNif !== undefined && { cifNif }),
        ...(razonSocial !== undefined && { razonSocial }),
        ...(direccionFiscal !== undefined && { direccionFiscal }),
        ...(codigoPostalFiscal !== undefined && { codigoPostalFiscal }),
        ...(ciudadFiscal !== undefined && { ciudadFiscal }),
      }
    });

    return NextResponse.json(local);
  } catch (error) {
    console.error('Error al actualizar local:', error);
    return NextResponse.json({ error: 'Error al actualizar local' }, { status: 500 });
  }
}

// DELETE - Eliminar local
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar si tiene datos asociados
    const local = await prisma.local.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            usuarios: true,
            clientes: true,
            citas: true,
            facturas: true,
            gastos: true,
          }
        }
      }
    });

    if (!local) {
      return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 });
    }

    const totalRelaciones = 
      local._count.usuarios + 
      local._count.clientes + 
      local._count.citas + 
      local._count.facturas + 
      local._count.gastos;

    if (totalRelaciones > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar el local porque tiene datos asociados',
        detalles: local._count
      }, { status: 400 });
    }

    await prisma.local.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar local:', error);
    return NextResponse.json({ error: 'Error al eliminar local' }, { status: 500 });
  }
}
