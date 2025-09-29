
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@servyauto.com' },
      update: {},
      create: {
        email: 'admin@servyauto.com',
        name: 'Super Admin',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        activo: true,
      },
    })
    
    console.log('Usuario admin creado:', admin)
  } catch (error) {
    console.error('Error al crear usuario admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
