
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';

interface ExcelRecord {
  'DIA / HORA'?: string;
  'NOMBRE'?: string;
  'TELÉFONO'?: string | number;
  'MARCA Y MODELO'?: string;
  'MATRÍCULA'?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Iniciando importación...');
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
    const data = XLSX.utils.sheet_to_json(worksheet, { range: 7 }) as ExcelRecord[];

    console.log(`📊 Total de registros en el archivo: ${data.length}`);

    // Filtrar registros de febrero 2025
    const februaryRecords = data.filter((record: ExcelRecord) => {
      const fecha = record['DIA / HORA'];
      
      if (!fecha || typeof fecha !== 'string') {
        return false;
      }
      
      // Parsear formato "DD/MM/YYYY HH H"
      const match = fecha.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (!match) {
        return false;
      }
      
      const month = parseInt(match[2]);
      const year = parseInt(match[3]);
      
      return year === 2025 && month === 2;
    });

    console.log(`📅 Registros de febrero 2025: ${februaryRecords.length}`);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    console.log('🔄 Comenzando importación de registros...');

    for (let i = 0; i < februaryRecords.length; i++) {
      const record = februaryRecords[i];
      
      try {
        const nombre = record['NOMBRE'];
        const marcaModelo = record['MARCA Y MODELO'];
        const matricula = record['MATRÍCULA'];
        const telefono = record['TELÉFONO']?.toString() || null;

        console.log(`📝 Procesando registro ${i + 1}/${februaryRecords.length}: ${nombre || 'Sin nombre'}`);
        
        // Verificar datos mínimos requeridos (solo matrícula y marca/modelo)
        if (!marcaModelo || !matricula) {
          console.log(`⚠️ Registro ${i + 1} omitido: faltan marca/modelo o matrícula`);
          skipped++;
          continue;
        }

        // Limpiar matrícula (quitar espacios)
        const matriculaLimpia = matricula.trim();

        // Verificar si el vehículo ya existe por matrícula (en cualquier local)
        const existingVehiculo = await prisma.vehiculo.findFirst({
          where: { matricula: matriculaLimpia },
        });

        if (existingVehiculo) {
          console.log(`⚠️ Vehículo ${matriculaLimpia} ya existe - omitido`);
          skipped++;
          continue;
        }

        // Separar marca y modelo (tomar la primera palabra como marca)
        const partes = marcaModelo.trim().split(/\s+/);
        const marca = partes[0] || 'Sin marca';
        const modelo = partes.slice(1).join(' ') || 'Sin modelo';

        // Verificar si el cliente ya existe (por teléfono o nombre)
        let existingCliente = null;
        if (telefono) {
          existingCliente = await prisma.cliente.findFirst({
            where: { telefono: telefono },
          });
        } else if (nombre) {
          existingCliente = await prisma.cliente.findFirst({
            where: { nombre: nombre.trim() },
          });
        }

        let clienteId: string;

        if (existingCliente) {
          console.log(`✅ Cliente encontrado: ${existingCliente.nombre}`);
          clienteId = existingCliente.id;
        } else {
          // Crear nuevo cliente
          const nombreCliente = nombre?.trim() || 'Cliente sin nombre';
          console.log(`➕ Creando nuevo cliente: ${nombreCliente}`);
          const newCliente = await prisma.cliente.create({
            data: {
              nombre: nombreCliente,
              telefono: telefono || 'Sin teléfono',
              email: undefined,
              direccion: undefined,
            },
          });
          clienteId = newCliente.id;
        }

        // Crear nuevo vehículo
        console.log(`🚗 Creando vehículo: ${marca} ${modelo} (${matriculaLimpia})`);
        await prisma.vehiculo.create({
          data: {
            clienteId: clienteId,
            marca: marca,
            modelo: modelo,
            matricula: matriculaLimpia,
            anio: 2024, // Año por defecto
            color: undefined,
          },
        });
        imported++;
        console.log(`✅ Registro ${i + 1} importado exitosamente`);
      } catch (error: any) {
        console.error(`❌ Error en registro ${i + 1}:`, error);
        errors.push(`Error en registro ${i + 1}: ${error.message}`);
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
