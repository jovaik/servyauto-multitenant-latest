
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 });
    }

    // Leer el archivo Excel desde la fila 8 (índice 7)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { range: 7 }); // Empezar desde fila 8

    // Filtrar registros de febrero 2025
    const februaryRecords = data.filter((record: any) => {
      const fecha = record['DIA / HORA'];
      
      if (!fecha || typeof fecha !== 'string') {
        return false;
      }
      
      // Parsear formato "DD/MM/YYYY HH H"
      const match = fecha.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (!match) {
        return false;
      }
      
      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      const year = parseInt(match[3]);
      
      return year === 2025 && month === 2; // Febrero 2025
    });

    const warnings: string[] = [];
    
    if (februaryRecords.length === 0) {
      warnings.push('No se encontraron registros de febrero 2025');
    }

    // Verificar columnas requeridas (nombres reales del Excel)
    const requiredColumns = ['DIA / HORA', 'MARCA Y MODELO'];
    const columns = Object.keys(data[0] || {});
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));
    
    if (missingColumns.length > 0) {
      warnings.push(`Faltan columnas requeridas: ${missingColumns.join(', ')}`);
    }

    // Preparar vista previa con los primeros 5 registros de febrero 2025
    const preview = februaryRecords.slice(0, 5).map((r: any) => ({
      fecha: r['DIA / HORA'],
      nombre: r['NOMBRE'] || '-',
      telefono: r['TELÉFONO'] ? r['TELÉFONO'].toString() : '-',
      email: '-',
      vehiculo: r['MARCA Y MODELO'] || '-',
    }));

    return NextResponse.json({
      totalRecords: data.length,
      februaryRecords: februaryRecords.length,
      columns,
      preview,
      warnings,
    });
  } catch (error: any) {
    console.error('Error al analizar el archivo:', error);
    return NextResponse.json(
      { error: 'Error al procesar el archivo: ' + error.message },
      { status: 500 }
    );
  }
}
