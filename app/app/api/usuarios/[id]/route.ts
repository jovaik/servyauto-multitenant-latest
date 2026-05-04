
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLocalContext } from '@/lib/local-context'
import bcrypt from 'bcryptjs'
import { RolUsuario } from '@/lib/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const localContext = await getLocalContext()
    const tenantId = localContext?.tenantId || null

    const usuario = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        activo: true,
        localId: true,
        tenantId: true,
        local: {
          select: { id: true, nombre: true, nombreComercial: true }
        },
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Validación de pertenencia al tenant (Grupo C)
    if (tenantId && usuario.tenantId && usuario.tenantId !== tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    return NextResponse.json(usuario)
  } catch (error) {
    console.error('Error al obtener usuario:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const localContext = await getLocalContext()
    const tenantId = localContext?.tenantId || null

    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Validación de pertenencia al tenant (Grupo C)
    if (tenantId && existingUser.tenantId && existingUser.tenantId !== tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role, activo, localId } = body
    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (email !== undefined) {
      if (email !== existingUser.email) {
        const emailInUse = await prisma.user.findFirst({
          where: { email, ...(tenantId ? { tenantId } : {}) }
        })
        if (emailInUse) {
          return NextResponse.json({ error: 'El email ya está en uso por otro usuario' }, { status: 400 })
        }
      }
      updateData.email = email
    }
    if (role !== undefined) updateData.role = role as RolUsuario
    if (activo !== undefined) updateData.activo = activo
    if (localId !== undefined) {
      updateData.localId = localId === '' || localId === null ? null : localId
    }
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 12)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No hay datos para actualizar' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        activo: true,
        localId: true,
        local: { select: { id: true, nombre: true, nombreComercial: true } },
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error al actualizar usuario:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const localContext = await getLocalContext()
    const tenantId = localContext?.tenantId || null

    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Validación de pertenencia al tenant (Grupo C)
    if (tenantId && existingUser.tenantId && existingUser.tenantId !== tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (params.id === (session.user as any).id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
    }

    await prisma.user.delete({ where: { id: params.id } })

    return NextResponse.json({ message: 'Usuario eliminado correctamente' })
  } catch (error) {
    console.error('Error al eliminar usuario:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
