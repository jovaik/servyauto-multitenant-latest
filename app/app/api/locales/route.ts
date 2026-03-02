import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Listar todos los locales
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const locales = await prisma.local.findMany({
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
  } catch (error) {
    console.error('Error al obtener locales:', error);
    return NextResponse.json({ error: 'Error al obtener locales' }, { status: 500 });
  }
}

// POST - Crear nuevo local
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const { nombre, nombreComercial, logo, direccion, ciudad, codigoPostal, telefono, email, colorPrimario } = data;

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
      }
    });

    return NextResponse.json(local, { status: 201 });
  } catch (error) {
    console.error('Error al crear local:', error);
    return NextResponse.json({ error: 'Error al crear local' }, { status: 500 });
  }
}
