import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getLocalContext } from '@/lib/local-context';

export const dynamic = 'force-dynamic';

const DEFAULT_CONFIG = {
  emailDestinatarios: 'info@servyauto.com',
  reporteDiarioActivo: true,
  reporteSemanalActivo: true,
  reporteMensualActivo: true,
  reporteAnualActivo: true,
  horaDiario: '23:00',
  diaSemanal: 'lunes',
  horaSemanal: '08:00',
  diaMensual: '1',
  horaMensual: '08:00',
  horaAnual: '10:00',
};

export async function GET(request: NextRequest) {
  const daemonToken = request.nextUrl.searchParams.get('token');

  if (daemonToken) {
    const validToken = process.env.ABACUSAI_API_KEY;
    if (daemonToken !== validToken) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
  } else {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  }

  try {
    const localContext = await getLocalContext();
    const tenantId = localContext?.tenantId || null;
    const tenantFilter = tenantId ? { tenantId } : {};

    const configs = await prisma.configuracion.findMany({
      where: {
        clave: { startsWith: 'reportes.' },
        ...tenantFilter
      }
    });

    const result: Record<string, any> = { ...DEFAULT_CONFIG };
    for (const c of configs) {
      const key = c.clave.replace('reportes.', '');
      if (c.tipo === 'BOOLEANO') {
        result[key] = c.valor === 'true';
      } else {
        result[key] = c.valor;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error obteniendo config reportes:', error);
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const localContext = await getLocalContext();
    const tenantId = localContext?.tenantId || null;

    const user = await prisma.user.findFirst({
      where: { email: session.user.email, ...(tenantId ? { tenantId } : {}) },
      select: { role: true }
    });

    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const data = await request.json();

    const configItems = [
      { clave: 'reportes.emailDestinatarios', valor: data.emailDestinatarios || DEFAULT_CONFIG.emailDestinatarios, tipo: 'TEXTO' as const, categoria: 'reportes', descripcion: 'Emails destinatarios de reportes (separados por coma)', ...(tenantId ? { tenantId } : {}) },
      { clave: 'reportes.reporteDiarioActivo', valor: String(data.reporteDiarioActivo ?? true), tipo: 'BOOLEANO' as const, categoria: 'reportes', descripcion: 'Reporte diario activo', ...(tenantId ? { tenantId } : {}) },
      { clave: 'reportes.reporteSemanalActivo', valor: String(data.reporteSemanalActivo ?? true), tipo: 'BOOLEANO' as const, categoria: 'reportes', descripcion: 'Reporte semanal activo', ...(tenantId ? { tenantId } : {}) },
      { clave: 'reportes.reporteMensualActivo', valor: String(data.reporteMensualActivo ?? true), tipo: 'BOOLEANO' as const, categoria: 'reportes', descripcion: 'Reporte mensual activo', ...(tenantId ? { tenantId } : {}) },
      { clave: 'reportes.reporteAnualActivo', valor: String(data.reporteAnualActivo ?? true), tipo: 'BOOLEANO' as const, categoria: 'reportes', descripcion: 'Reporte anual activo', ...(tenantId ? { tenantId } : {}) },
    ];

    await Promise.all(
      configItems.map((item) =>
        prisma.configuracion.upsert({
          where: { clave_tenantId: { clave: item.clave, tenantId: tenantId || '' } },
          update: { valor: item.valor },
          create: item,
        })
      )
    );

    return NextResponse.json({ success: true, message: 'Configuración de reportes guardada' });
  } catch (error) {
    console.error('Error guardando config reportes:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
