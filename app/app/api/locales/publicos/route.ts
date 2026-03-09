import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET - Listar locales activos (endpoint público para reservas)
export async function GET() {
  try {
    const locales = await prisma.local.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        nombreComercial: true,
        direccion: true,
        ciudad: true,
      },
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json(locales)
  } catch (error) {
    console.error('Error listando locales públicos:', error)
    return NextResponse.json([], { status: 200 })
  }
}
