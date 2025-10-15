
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
    console.log('📥 Iniciando importación...');
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

    console.log(`📊 Total de registros en el archivo: ${data.length}`);

    // Filtrar registros de febrero 2025
    const februaryRecords = data.filter((record: ExcelRecord) => {
      const fecha = record.FECHA;
      if (!fecha) return false;
      
      let date: Date | null = null;
      
      if (typeof fecha === 'number') {
        // Excel serial date - convertir a fecha
        const excelEpoch = new Date(1899, 11, 30);
        date = new Date(excelEpoch.getTime() + fecha * 86400000);
      } else if (typeof fecha === 'string') {
        date = new Date(fecha);
      }
      
      if (!date || isNaN(date.getTime())) return false;
      
      return date.getFullYear() === 2025 && date.getMonth() === 1;
    });

    console.log(`📅 Registros de febrero 2025: ${februaryRecords.length}`);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    console.log('🔄 Comenzando importación de registros...');

    for (let i = 0; i < februaryRecords.length; i++) {
      const record = februaryRecords[i] as ExcelRecord;
      
      try {
        console.log(`📝 Procesando registro ${i + 1}/${februaryRecords.length}: ${record.NOMBRE}`);
        
        // Verificar datos mínimos requeridos
        if (!record.NOMBRE || !record.MARCA || !record.MODELO || !record.MATRICULA) {
          console.log(`⚠️ Registro ${i + 1} omitido: faltan datos requeridos`);
          skipped++;
          continue;
        }

        // Verificar si el vehículo ya existe por matrícula
        const existingVehiculo = await prisma.vehiculo.findUnique({
          where: { matricula: record.MATRICULA },
        });

        if (existingVehiculo) {
          console.log(`⚠️ Vehículo ${record.MATRICULA} ya existe - omitido`);
          skipped++;
          continue;
        }

        // Verificar si el cliente ya existe (solo por teléfono si está disponible)
        let existingCliente = null;
        if (record.TELEFONO) {
          existingCliente = await prisma.cliente.findFirst({
            where: { telefono: record.TELEFONO },
          });
        }

        let clienteId: string;

        if (existingCliente) {
          console.log(`✅ Cliente encontrado: ${existingCliente.nombre}`);
          clienteId = existingCliente.id;
        } else {
          // Crear nuevo cliente
          console.log(`➕ Creando nuevo cliente: ${record.NOMBRE}`);
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
        console.log(`🚗 Creando vehículo: ${record.MARCA} ${record.MODELO}`);
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
        console.log(`✅ Registro ${i + 1} importado exitosamente`);
      } catch (error: any) {
        console.error(`❌ Error en registro ${i + 1}:`, error);
        errors.push(`Error en registro ${record.NOMBRE || 'desconocido'}: ${error.message}`);
        skipped++;
      }
    }

    console.log(`🎉 Importación completada: ${imported} importados, ${skipped} omitidos`);

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
