
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAPI() {
  try {
    // Test de verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { email: 'admin@servyauto.com' }
    });
    console.log('Usuario encontrado:', user ? 'Sí' : 'No');
    
    // Test de hash password
    const isValid = await bcrypt.compare('admin123', user.password);
    console.log('Contraseña válida:', isValid);
    
    // Test de crear usuario
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: await bcrypt.hash('test123', 12),
      role: 'OPERADOR',
      activo: true
    };
    
    const newUser = await prisma.user.create({
      data: testUser,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        activo: true
      }
    });
    
    console.log('Usuario de prueba creado:', newUser);
    
    // Eliminar usuario de prueba
    await prisma.user.delete({ where: { id: newUser.id } });
    console.log('Usuario de prueba eliminado');
    
  } catch (error) {
    console.error('Error en test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPI();
