import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getLocalContext, buildLocalFilter, getLocalIdForCreate } from '@/lib/local-context';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const localContext = await getLocalContext();
    
    if (!localContext) {
      return NextResponse.json([]);
    }
    
    const localFilter = buildLocalFilter(localContext);

    // Parámetros de filtro por fecha
    const searchParams = request.nextUrl.searchParams;
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    const whereClause: any = { ...localFilter };

    if (fechaInicio && fechaFin) {
      whereClause.fecha = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin + 'T23:59:59.999Z'),
      };
    } else if (fechaInicio) {
      whereClause.fecha = {
        gte: new Date(fechaInicio),
      };
    } else if (fechaFin) {
      whereClause.fecha = {
        lte: new Date(fechaFin + 'T23:59:59.999Z'),
      };
    }

    const ingresos = await prisma.ingresoAdicional.findMany({
      where: whereClause,
      orderBy: { fecha: 'desc' },
      include: {
        local: true,
      },
    });

    return NextResponse.json(ingresos);
  } catch (error) {
    console.error('Error al obtener ingresos adicionales:', error);
    return NextResponse.json(
      { error: 'Error al obtener ingresos adicionales' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { concepto, descripcion, importe, fecha, metodoPago, observaciones } = body;

    if (!concepto || importe === undefined) {
      return NextResponse.json(
        { error: 'Concepto e importe son obligatorios' },
        { status: 400 }
      );
    }

    const localContext = await getLocalContext();
    const localIdParaIngreso = localContext ? getLocalIdForCreate(localContext) : null;

    // Guard: un ingreso sin local quedaría invisible en la tarjeta Efectivo del Diario de Caja
    // (que filtra por local). Obligamos a seleccionar un local antes de registrarlo.
    if (!localIdParaIngreso) {
      return NextResponse.json(
        { error: 'Selecciona un local en la barra superior antes de registrar el ingreso, para que aparezca en el Diario de Caja de ese local.' },
        { status: 400 }
      );
    }

    const nuevoIngreso = await prisma.ingresoAdicional.create({
      data: {
        concepto,
        descripcion: descripcion || null,
        importe: parseFloat(importe),
        fecha: fecha ? new Date(fecha) : new Date(),
        metodoPago: metodoPago || 'EFECTIVO',
        observaciones: observaciones || null,
        creadoPorId: (session.user as any).id || null,
        creadoPorNombre: session.user?.name || session.user?.email || null,
        localId: localIdParaIngreso,
      },
      include: {
        local: true,
      },
    });

    console.log(`✅ Ingreso adicional creado: ${concepto} - €${importe}`);

    return NextResponse.json(nuevoIngreso, { status: 201 });
  } catch (error) {
    console.error('Error al crear ingreso adicional:', error);
    return NextResponse.json(
      { error: 'Error al crear ingreso adicional' },
      { status: 500 }
    );
  }
}
