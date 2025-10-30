require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function resetPassword() {
  const email = 'josemillanfdez@gmail.com'
  const newPassword = 'melaCua14'
  
  try {
    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    // Actualizar usuario
    const user = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    })
    
    console.log('\n✅ CONTRASEÑA RESETEADA EXITOSAMENTE\n')
    console.log('Email:', email)
    console.log('Nueva contraseña:', newPassword)
    console.log('Rol:', user.role)
    console.log('\nYa puedes iniciar sesión con estas credenciales en:')
    console.log('https://app.servyauto.com')
  } catch (error) {
    console.error('❌ Error al resetear contraseña:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

resetPassword()
