
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getLocalContext } from '@/lib/local-context';

interface ExcelRecord {
  'DIA / HORA'?: string;
  'NOMBRE'?: string;
  'TELÉFONO'?: string | number;
  'MARCA Y MODELO'?: string;
  'MATRÍCULA'?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const localContext = await getLocalContext();
    const tenantId = localContext?.tenantId || null;
    const tenantFilter = tenantId ? { tenantId } : {};

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { range: 7 }) as ExcelRecord[];

    const februaryRecords = data.filter((record: ExcelRecord) => {
      const fecha = record['DIA / HORA'];
      if (!fecha || typeof fecha !== 'string') return false;
      const match = fecha.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (!match) return false;
      const month = parseInt(match[2]);
      const year = parseInt(match[3]);
      return year === 2025 && month === 2;
    });

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < februaryRecords.length; i++) {
      const record = februaryRecords[i];

      try {
        const nombre = record['NOMBRE'];
        const marcaModelo = record['MARCA Y MODELO'];
        const matricula = record['MATRÍCULA'];
        const telefono = record['TELÉFONO']?.toString() || null;

        if (!marcaModelo || !matricula) {
          skipped++;
          continue;
        }

        const matriculaLimpia = matricula.trim();

        const existingVehiculo = await prisma.vehiculo.findFirst({
          where: { matricula: matriculaLimpia, ...tenantFilter },
        });

        if (existingVehiculo) {
          skipped++;
          continue;
        }

        const partes = marcaModelo.trim().split(/\s+/);
        const marca = partes[0] || 'Sin marca';
        const modelo = partes.slice(1).join(' ') || 'Sin modelo';

        let existingCliente = null;
        if (telefono) {
          existingCliente = await prisma.cliente.findFirst({
            where: { telefono, ...tenantFilter },
          });
        } else if (nombre) {
          existingCliente = await prisma.cliente.findFirst({
            where: { nombre: nombre.trim(), ...tenantFilter },
          });
        }

        let clienteId: string;

        if (existingCliente) {
          clienteId = existingCliente.id;
        } else {
          const nombreCliente = nombre?.trim() || 'Cliente sin nombre';
          const newCliente = await prisma.cliente.create({
            data: {
              nombre: nombreCliente,
              telefono: telefono || 'Sin teléfono',
              email: undefined,
              direccion: undefined,
              ...(tenantId ? { tenantId } : {})
            },
          });
          clienteId = newCliente.id;
        }

        await prisma.vehiculo.create({
          data: {
            clienteId,
            marca,
            modelo,
            matricula: matriculaLimpia,
            anio: 2024,
            color: undefined,
            ...(tenantId ? { tenantId } : {})
          },
        });
        imported++;
      } catch (error: any) {
        console.error(`Error en registro ${i + 1}:`, error);
        errors.push(`Error en registro ${i + 1}: ${error.message}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      total: februaryRecords.length,
      imported,
      skipped,
      errors,
    });
  } catch (error: any) {
    console.error('Error al importar datos:', error);
    return NextResponse.json(
      { error: 'Error al importar los datos: ' + error.message },
      { status: 500 }
    );
  }
}
