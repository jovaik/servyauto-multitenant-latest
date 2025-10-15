
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

    console.log('📊 Total registros:', data.length);
    console.log('📋 Columnas detectadas:', Object.keys(data[0] || {}));
    console.log('🔍 Primeros 3 registros completos:', JSON.stringify(data.slice(0, 3), null, 2));

    // Filtrar registros de febrero 2025
    const februaryRecords = data.filter((record: any, index: number) => {
      const fecha = record.FECHA;
      
      if (index < 5) {
        console.log(`\n📅 Registro ${index}:`, {
          todasLasPropiedades: Object.keys(record),
          FECHA: fecha,
          tipoFECHA: typeof fecha,
          registroCompleto: record
        });
      }
      
      if (!fecha) {
        if (index < 5) console.log(`  ❌ No tiene campo FECHA`);
        return false;
      }
      
      // Intentar parsear la fecha en diferentes formatos
      let date: Date | null = null;
      
      if (typeof fecha === 'number') {
        // Excel serial date
        date = XLSX.SSF.parse_date_code(fecha);
        if (index < 5) console.log(`  🔢 Número Excel ${fecha} → ${date}`);
      } else if (typeof fecha === 'string') {
        // Intentar parsear string
        date = new Date(fecha);
        if (index < 5) console.log(`  📝 String "${fecha}" → ${date}`);
      }
      
      if (!date || isNaN(date.getTime())) {
        if (index < 5) console.log(`  ❌ Fecha inválida`);
        return false;
      }
      
      const year = date.getFullYear();
      const month = date.getMonth();
      const isFeb2025 = year === 2025 && month === 1;
      
      if (index < 5) {
        console.log(`  ✓ Fecha válida: ${date.toISOString()} (año: ${year}, mes: ${month}, esFeb2025: ${isFeb2025})`);
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
