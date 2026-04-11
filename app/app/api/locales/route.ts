import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Listar locales según permisos del usuario
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener usuario con sus locales asignados
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
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Construir filtro según rol
    let whereFilter: any = { activo: true };
    
    if (user.role === 'SUPER_ADMIN') {
      // SUPER_ADMIN: ve todos los locales
      // No añadimos filtro adicional
    } else if (user.role === 'GRUPO_ADMIN' && user.localesAsignados.length > 0) {
      // GRUPO_ADMIN: ve solo sus locales asignados
      const allowedIds = user.localesAsignados.map((ul: any) => ul.localId);
      whereFilter.id = { in: allowedIds };
    } else if (user.localId) {
      // ADMIN/OPERADOR: ve solo su local
      whereFilter.id = user.localId;
    } else {
      // Sin acceso a ningún local
      return NextResponse.json([]);
    }

    const locales = await prisma.local.findMany({
      where: whereFilter,
      orderBy: { nombre: 'asc' },
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

    return NextResponse.json(locales);
  } catch (error: any) {
    console.error('Error al obtener locales:', error?.message || error);
    // Si es error de conexión a DB, devolver 503 para que el cliente reintente
    if (error?.message?.includes("Can't reach database") || error?.message?.includes('connect')) {
      return NextResponse.json({ error: 'Base de datos temporalmente no disponible' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Error al obtener locales' }, { status: 500 });
  }
}

// POST - Crear nuevo local (solo SUPER_ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea SUPER_ADMIN
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    });

    if (user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Solo SUPER_ADMIN puede crear locales' }, { status: 403 });
    }

    const data = await request.json();
    const { 
      nombre, nombreComercial, logo, direccion, ciudad, codigoPostal, 
      telefono, email, colorPrimario,
      // Campos fiscales
      cifNif, razonSocial, direccionFiscal, codigoPostalFiscal, ciudadFiscal
    } = data;

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    }

    const local = await prisma.local.create({
      data: {
        nombre,
        nombreComercial: nombreComercial || null,
        logo: logo || null,
        direccion: direccion || null,
        ciudad: ciudad || null,
        codigoPostal: codigoPostal || null,
        telefono: telefono || null,
        email: email || null,
        colorPrimario: colorPrimario || null,
        // Campos fiscales
        cifNif: cifNif || null,
        razonSocial: razonSocial || null,
        direccionFiscal: direccionFiscal || null,
        codigoPostalFiscal: codigoPostalFiscal || null,
        ciudadFiscal: ciudadFiscal || null,
      }
    });

    return NextResponse.json(local, { status: 201 });
  } catch (error) {
    console.error('Error al crear local:', error);
    return NextResponse.json({ error: 'Error al crear local' }, { status: 500 });
  }
}
