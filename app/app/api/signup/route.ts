
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { RolUsuario } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName } = await req.json()

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password y nombre completo son requeridos' },
        { status: 400 }
      )
    }

    // Obtener el tenant del header inyectado por el middleware
    const headersList = headers()
    const tenantSlug = headersList.get('x-tenant-slug') || 'default'

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug }
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 400 }
      )
    }

    // Verificar si el usuario ya existe EN ESTE TENANT
    const existingUser = await prisma.user.findFirst({
      where: { email, tenantId: tenant.id }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con este email' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const userCount = await prisma.user.count({
      where: { tenantId: tenant.id }
    })
    const role = userCount === 0 ? RolUsuario.ADMIN : RolUsuario.ADMIN

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: fullName,
        role,
        tenantId: tenant.id
      }
    })

    return NextResponse.json(
      {
        message: 'Usuario creado exitosamente',
        userId: user.id,
        role: user.role
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
