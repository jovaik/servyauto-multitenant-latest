
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

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
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log('📊 Primeros 3 registros:', data.slice(0, 3));
    console.log('🗓️ Tipos de fecha encontrados:');
    
    // Filtrar registros de febrero 2025
    const februaryRecords = data.filter((record: any) => {
      const fecha = record.FECHA;
      if (!fecha) return false;
      
      // Intentar parsear la fecha en diferentes formatos
      let date: Date | null = null;
      
      if (typeof fecha === 'number') {
        // Excel serial date - convertir a fecha
        const excelEpoch = new Date(1899, 11, 30);
        date = new Date(excelEpoch.getTime() + fecha * 86400000);
        console.log(`  Número Excel ${fecha} → ${date.toISOString()} (año: ${date.getFullYear()}, mes: ${date.getMonth()})`);
      } else if (typeof fecha === 'string') {
        // Intentar parsear string
        date = new Date(fecha);
        console.log(`  String "${fecha}" → ${date.toISOString()} (año: ${date.getFullYear()}, mes: ${date.getMonth()})`);
      }
      
      if (!date || isNaN(date.getTime())) {
        console.log(`  ❌ Fecha inválida: ${fecha}`);
        return false;
      }
      
      const isFeb2025 = date.getFullYear() === 2025 && date.getMonth() === 1;
      if (isFeb2025) {
        console.log(`  ✅ FEBRERO 2025: ${fecha} → ${date.toISOString()}`);
      }
      
      return isFeb2025; // Febrero = 1 (0-indexed)
    });

    const warnings: string[] = [];
    
    if (februaryRecords.length === 0) {
      warnings.push('No se encontraron registros de febrero 2025');
    }

    // Verificar columnas requeridas
    const requiredColumns = ['FECHA', 'NOMBRE', 'MARCA', 'MODELO'];
    const columns = Object.keys(data[0] || {});
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));
    
    if (missingColumns.length > 0) {
      warnings.push(`Faltan columnas requeridas: ${missingColumns.join(', ')}`);
    }

    return NextResponse.json({
      totalRecords: data.length,
      februaryRecords: februaryRecords.length,
      columns,
      preview: februaryRecords.slice(0, 5),
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
