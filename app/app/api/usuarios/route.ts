
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { RolUsuario } from '@/lib/types'
import { logActivity } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Filtro opcional por localId
    const { searchParams } = new URL(request.url)
    const localId = searchParams.get('localId')

    const whereClause: any = {}
    if (localId) {
      whereClause.localId = localId
    }

    const usuarios = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        activo: true,
        puedeEliminar: true,
        localId: true,
        tpvNombre: true,
        local: {
          select: {
            id: true,
            nombre: true,
            nombreComercial: true,
          }
        },
        localesAsignados: {
          select: {
            localId: true,
            local: {
              select: {
                id: true,
                nombre: true,
                nombreComercial: true,
              }
            }
          }
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(usuarios)
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, password, role, activo, localId, puedeEliminar, tpvNombre } = body

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, contraseña y rol son requeridos' }, 
        { status: 400 }
      )
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con este email' }, 
        { status: 400 }
      )
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Crear usuario
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as RolUsuario,
        activo: activo ?? true,
        puedeEliminar: puedeEliminar ?? false,
        localId: localId || null, // null = superadmin (ve todo)
        tpvNombre: tpvNombre || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        activo: true,
        puedeEliminar: true,
        localId: true,
        tpvNombre: true,
        local: {
          select: {
            id: true,
            nombre: true,
            nombreComercial: true,
          }
        },
        createdAt: true,
        updatedAt: true,
      }
    })

    console.log(`✅ Usuario creado: ${name} (${email}) - Local: ${localId || 'Todos (SuperAdmin)'}`)

    logActivity({ action: 'CREATE', entity: 'USUARIO', entityId: newUser.id, description: `Usuario creado: ${name} (${email}) - Rol: ${role}` }).catch(() => {})

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error('Error al crear usuario:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
