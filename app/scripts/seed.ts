
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Crear usuario admin por defecto (test account)
  const hashedPassword = await bcrypt.hash('johndoe123', 12)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      password: hashedPassword,
      name: 'John Doe',
      role: 'admin',
    },
  })

  console.log('✅ Usuario admin creado:', adminUser.email)

  // Crear servicios básicos
  const servicios = [
    { nombre: 'Cambio de aceite', descripcion: 'Cambio de aceite y filtro', precio: 45.00, duracion: 60 },
    { nombre: 'Revisión general', descripcion: 'Revisión completa del vehículo', precio: 80.00, duracion: 120 },
    { nombre: 'Cambio de frenos', descripcion: 'Cambio de pastillas de freno', precio: 120.00, duracion: 90 },
    { nombre: 'Alineación', descripcion: 'Alineación de ruedas', precio: 35.00, duracion: 45 },
    { nombre: 'Cambio de neumáticos', descripcion: 'Montaje de neumáticos nuevos', precio: 25.00, duracion: 30 },
  ]

  for (const servicio of servicios) {
    const existingServicio = await prisma.servicio.findFirst({
      where: { nombre: servicio.nombre }
    })
    
    if (!existingServicio) {
      await prisma.servicio.create({
        data: servicio,
      })
    }
  }

  console.log('✅ Servicios creados')

  // Crear clientes de ejemplo
  const cliente1 = await prisma.cliente.upsert({
    where: { email: 'maria.garcia@email.com' },
    update: {},
    create: {
      nombre: 'María',
      apellido: 'García',
      email: 'maria.garcia@email.com',
      telefono: '600123456',
      direccion: 'Calle Mayor 123, Madrid',
      dni: '12345678A',
    },
  })

  const cliente2 = await prisma.cliente.upsert({
    where: { email: 'carlos.lopez@email.com' },
    update: {},
    create: {
      nombre: 'Carlos',
      apellido: 'López',
      email: 'carlos.lopez@email.com',
      telefono: '600987654',
      direccion: 'Avenida de la Paz 45, Barcelona',
      dni: '87654321B',
    },
  })

  console.log('✅ Clientes creados')

  // Crear vehículos de ejemplo
  const vehiculo1 = await prisma.vehiculo.upsert({
    where: { matricula: '1234ABC' },
    update: {},
    create: {
      marca: 'Volkswagen',
      modelo: 'Golf',
      anio: 2020,
      color: 'Azul',
      matricula: '1234ABC',
      kilometraje: 45000,
      motor: '1.6 TDI',
      combustible: 'Diésel',
      clienteId: cliente1.id,
    },
  })

  const vehiculo2 = await prisma.vehiculo.upsert({
    where: { matricula: '5678DEF' },
    update: {},
    create: {
      marca: 'Toyota',
      modelo: 'Corolla',
      anio: 2019,
      color: 'Blanco',
      matricula: '5678DEF',
      kilometraje: 62000,
      motor: '1.8 Hybrid',
      combustible: 'Híbrido',
      clienteId: cliente2.id,
    },
  })

  console.log('✅ Vehículos creados')

  // Crear una cita de ejemplo
  const hoy = new Date()
  const citaDate = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 10, 0, 0)

  const cita = await prisma.cita.create({
    data: {
      fecha: citaDate,
      horaInicio: '10:00',
      horaFin: '11:00',
      box: 'Box 1',
      estado: 'PENDIENTE',
      observaciones: 'Primera revisión del vehículo',
      total: 80.00,
      clienteId: cliente1.id,
      vehiculoId: vehiculo1.id,
    },
  })

  console.log('✅ Cita de ejemplo creada')

  console.log('🎉 Seed completado exitosamente!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error durante el seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
