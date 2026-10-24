export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Catálogo de tipos de servicio rápido (línea rápida). Común a todos los locales.
const DEFAULTS = [
  { nombre: 'Batería', codigo: 'BATERIA', categoria: 'BATERIA' },
  { nombre: 'Frenos', codigo: 'FRENOS', categoria: 'FRENOS' },
  { nombre: 'Neumáticos', codigo: 'NEUMATICOS', categoria: 'NEUMATICOS' },
  { nombre: 'Aceite y Filtros', codigo: 'ACEITE', categoria: 'ACEITE' },
  { nombre: 'Mecánica General', codigo: 'MECANICA', categoria: 'MECANICA' },
  { nombre: 'Electricidad', codigo: 'ELECTRICIDAD', categoria: 'ELECTRICIDAD' },
  { nombre: 'Chapa y Pintura', codigo: 'CHAPA_PINTURA', categoria: 'CHAPA' },
  { nombre: 'Otros', codigo: 'OTROS', categoria: 'OTROS' },
]

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    let tipos = await prisma.tipoServicio.findMany({ orderBy: { nombre: 'asc' } })
    // Sembrar los por defecto la primera vez (idempotente)
    if (tipos.length === 0) {
      for (const d of DEFAULTS) {
        await prisma.tipoServicio.upsert({
          where: { codigo: d.codigo },
          update: {},
          create: { nombre: d.nombre, codigo: d.codigo, categoria: d.categoria },
        })
      }
      tipos = await prisma.tipoServicio.findMany({ orderBy: { nombre: 'asc' } })
    }
    const { searchParams } = new URL(req.url)
    if (searchParams.get('activos') === '1') tipos = tipos.filter((t) => t.activo)
    return NextResponse.json(tipos)
  } catch (e: any) {
    console.error('Error GET tipos-servicio:', e)
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const body = await req.json()
    const { nombre, categoria } = body
    if (!nombre || !nombre.trim()) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    // codigo único a partir del nombre
    const base = nombre.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
    let codigo = base || `TIPO_${Date.now()}`
    let i = 1
    while (await prisma.tipoServicio.findUnique({ where: { codigo } })) {
      codigo = `${base}_${i++}`
    }
    const tipo = await prisma.tipoServicio.create({
      data: { nombre: nombre.trim(), codigo, categoria: (categoria || 'OTROS').trim() },
    })
    return NextResponse.json(tipo, { status: 201 })
  } catch (e: any) {
    console.error('Error POST tipos-servicio:', e)
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 })
  }
}
