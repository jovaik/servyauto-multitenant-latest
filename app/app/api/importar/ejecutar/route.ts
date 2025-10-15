
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';

interface ExcelRecord {
  FECHA?: string | number;
  NOMBRE?: string;
  TELEFONO?: string;
  EMAIL?: string;
  DIRECCION?: string;
  MARCA?: string;
  MODELO?: string;
  MATRICULA?: string;
  ANO?: string | number;
  COLOR?: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 });
    }

    // Leer el archivo Excel
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as ExcelRecord[];

    // Filtrar registros de febrero 2025
    const februaryRecords = data.filter((record: ExcelRecord) => {
      const fecha = record.FECHA;
      if (!fecha) return false;
      
      let date: Date | null = null;
      
      if (typeof fecha === 'number') {
        date = XLSX.SSF.parse_date_code(fecha);
      } else if (typeof fecha === 'string') {
        date = new Date(fecha);
      }
      
      if (!date || isNaN(date.getTime())) return false;
      
      return date.getFullYear() === 2025 && date.getMonth() === 1;
    });

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const record of februaryRecords as ExcelRecord[]) {
      try {
        // Verificar datos mínimos requeridos
        if (!record.NOMBRE || !record.MARCA || !record.MODELO || !record.MATRICULA) {
          skipped++;
          continue;
        }

        // Verificar si el vehículo ya existe por matrícula
        const existingVehiculo = await prisma.vehiculo.findUnique({
          where: { matricula: record.MATRICULA },
          include: { cliente: true },
        });

        if (existingVehiculo) {
          skipped++;
          continue;
        }

        // Verificar si el cliente ya existe (por nombre o teléfono)
        const existingCliente = await prisma.cliente.findFirst({
          where: {
            OR: [
              { nombre: record.NOMBRE },
              ...(record.TELEFONO ? [{ telefono: record.TELEFONO }] : []),
            ],
          },
        });

        let clienteId: string;

        if (existingCliente) {
          clienteId = existingCliente.id;
        } else {
          // Crear nuevo cliente
          const newCliente = await prisma.cliente.create({
            data: {
              nombre: record.NOMBRE,
              telefono: record.TELEFONO || 'Sin teléfono',
              email: record.EMAIL || undefined,
              direccion: record.DIRECCION || undefined,
            },
          });
          clienteId = newCliente.id;
        }

        // Crear nuevo vehículo
        await prisma.vehiculo.create({
          data: {
            clienteId: clienteId,
            marca: record.MARCA,
            modelo: record.MODELO,
            matricula: record.MATRICULA,
            anio: record.ANO ? parseInt(record.ANO.toString()) : 2000,
            color: record.COLOR || undefined,
          },
        });
        imported++;
      } catch (error: any) {
        errors.push(`Error en registro ${record.NOMBRE}: ${error.message}`);
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
