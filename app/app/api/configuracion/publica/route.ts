
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET - Obtener configuración pública
export async function GET() {
  try {
    const configs = await prisma.configuracion.findMany({
      where: {
        OR: [
          { clave: { startsWith: 'publica.' } },
          { clave: { startsWith: 'empresa.' } },
          { clave: { startsWith: 'horarios.' } }
        ]
      }
    })

    const configMap: Record<string, any> = {}
    configs.forEach((config: any) => {
      configMap[config.clave] = config.valor
    })

    return NextResponse.json(configMap)
  } catch (error) {
    console.error('Error fetching public config:', error)
    return NextResponse.json(
      { error: 'Error al cargar configuración' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar configuración pública
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const data = await request.json()

    // Actualizar o crear cada configuración
    for (const [clave, valor] of Object.entries(data)) {
      if (valor === undefined || valor === null) continue

      const categoria = clave.split('.')[0]
      
      await prisma.configuracion.upsert({
        where: { clave },
        update: { 
          valor: String(valor),
          updatedAt: new Date()
        },
        create: {
          clave,
          valor: String(valor),
          tipo: 'TEXTO',
          categoria: categoria.toUpperCase(),
          descripcion: `Configuración de página pública: ${clave}`
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating public config:', error)
    return NextResponse.json(
      { error: 'Error al actualizar configuración' },
      { status: 500 }
    )
  }
}
