require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      activo: true,
      password: true
    }
  })
  
  console.log('\n=== USUARIOS REGISTRADOS ===\n')
  users.forEach(user => {
    console.log(`ID: ${user.id}`)
    console.log(`Nombre: ${user.name}`)
    console.log(`Email: ${user.email}`)
    console.log(`Rol: ${user.role}`)
    console.log(`Activo: ${user.activo}`)
    console.log(`Password Hash: ${user.password ? user.password.substring(0, 20) + '...' : 'N/A'}`)
    console.log('---')
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
