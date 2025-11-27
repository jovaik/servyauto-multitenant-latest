/**
 * Script para cargar tipos de servicio predefinidos
 * Ejecutar con: node scripts/seed-tipos-servicio.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tiposServicio = [
  {
    nombre: 'Cambio de Batería',
    codigo: 'BAT',
    margenDefecto: 30,
    categoria: 'BATERIAS',
    descripcion: 'Cambio de batería de vehículo',
    activo: true
  },
  {
    nombre: 'Pastillas de Freno',
    codigo: 'FRE',
    margenDefecto: 40,
    categoria: 'FRENOS',
    descripcion: 'Cambio de pastillas de freno delanteras o traseras',
    activo: true
  },
  {
    nombre: 'Cambio de Aceite',
    codigo: 'ACE',
    margenDefecto: 25,
    categoria: 'ACEITE',
    descripcion: 'Cambio de aceite y filtro',
    activo: true
  },
  {
    nombre: 'Filtros',
    codigo: 'FIL',
    margenDefecto: 35,
    categoria: 'OTROS',
    descripcion: 'Cambio de filtros (aire, polen, combustible)',
    activo: true
  },
  {
    nombre: 'Neumáticos',
    codigo: 'NEU',
    margenDefecto: 30,
    categoria: 'NEUMATICOS',
    descripcion: 'Cambio de neumáticos',
    activo: true
  },
  {
    nombre: 'Reparación Eléctrica',
    codigo: 'ELE',
    margenDefecto: 50,
    categoria: 'ELECTRICA',
    descripcion: 'Reparaciones del sistema eléctrico',
    activo: true
  },
  {
    nombre: 'Diagnóstico',
    codigo: 'DIA',
    margenDefecto: 0,
    categoria: 'OTROS',
    descripcion: 'Diagnóstico y revisión técnica',
    activo: true
  },
  {
    nombre: 'Discos de Freno',
    codigo: 'DIS',
    margenDefecto: 40,
    categoria: 'FRENOS',
    descripcion: 'Cambio de discos de freno',
    activo: true
  },
  {
    nombre: 'Líquidos',
    codigo: 'LIQ',
    margenDefecto: 30,
    categoria: 'OTROS',
    descripcion: 'Cambio de líquidos (refrigerante, frenos, dirección)',
    activo: true
  },
  {
    nombre: 'Escobillas',
    codigo: 'ESC',
    margenDefecto: 40,
    categoria: 'OTROS',
    descripcion: 'Cambio de escobillas limpiaparabrisas',
    activo: true
  }
];

async function main() {
  console.log('⏳ Iniciando carga de tipos de servicio...');

  try {
    for (const tipo of tiposServicio) {
      const existe = await prisma.tipoServicio.findUnique({
        where: { codigo: tipo.codigo }
      });

      if (existe) {
        console.log(`✅ ${tipo.nombre} (${tipo.codigo}) - Ya existe, actualizando...`);
        await prisma.tipoServicio.update({
          where: { codigo: tipo.codigo },
          data: tipo
        });
      } else {
        console.log(`➕ ${tipo.nombre} (${tipo.codigo}) - Creando...`);
        await prisma.tipoServicio.create({
          data: tipo
        });
      }
    }

    const total = await prisma.tipoServicio.count();
    console.log(`\n✨ ¡Listo! Total de tipos de servicio en BD: ${total}`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
