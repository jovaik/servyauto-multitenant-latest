import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listReaders, pairReader, getLocalSumUpKeys } from '@/lib/sumup'
import { prisma } from '@/lib/db'
import { getLocalContext } from '@/lib/local-context'

// GET - Listar lectores (filtrados según modo y local del usuario)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener configuración
    const config = await prisma.sumUpConfig.findFirst()
    const modoAsignacion = config?.modoAsignacion || 'COMPARTIDO'

    // Obtener contexto local para determinar qué API key usar
    const localContextForKey = await getLocalContext()
    const localKeysForReaders = await getLocalSumUpKeys(localContextForKey?.selectedLocalId)

    // Obtener lectores de SumUp API (usando la key del local si tiene)
    const sumupReaders = await listReaders(localKeysForReaders.apiKey)

    // Obtener lectores registrados en nuestra BD
    const dbReaders = await prisma.sumUpReader.findMany({
      include: { local: true, user: { select: { id: true, name: true, email: true } } },
    })

    // Mapear y enriquecer con datos locales
    const readers = sumupReaders.map((sr: any) => {
      const dbReader = dbReaders.find((r: any) => r.sumupReaderId === sr.id)
      return {
        id: sr.id,
        name: dbReader?.nombre || sr.name || `Terminal ${sr.id.slice(-4)}`,
        status: sr.status || 'unknown',
        localId: dbReader?.localId || null,
        localNombre: dbReader?.local?.nombre || null,
        userId: dbReader?.userId || null,
        userNombre: dbReader?.user?.name || dbReader?.user?.email || null,
        dbId: dbReader?.id || null,
      }
    })

    // Filtrar según modo y contexto del usuario
    const localContext = await getLocalContext()
    let filteredReaders = readers

    if (modoAsignacion === 'POR_LOCAL' && localContext?.selectedLocalId) {
      // En modo POR_LOCAL, mostrar los del local actual + los compartidos (sin local)
      // + SIEMPRE los TPV propios de un autónomo (userId), que deben aparecer tanto
      // para el autónomo como para el local (regla de negocio).
      filteredReaders = readers.filter(
        (r: any) => !r.localId || r.localId === localContext.selectedLocalId || r.userId
      )
    }

    return NextResponse.json({ 
      readers: filteredReaders,
      config: { modoAsignacion, trackingPorLocal: config?.trackingPorLocal ?? true }
    })
  } catch (error: any) {
    console.error('Error listando lectores SumUp:', error)
    return NextResponse.json(
      { error: error.message || 'Error al listar lectores' },
      { status: 500 }
    )
  }
}

// POST - Emparejar nuevo lector
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { pairingCode, name, localId } = await request.json()

    if (!pairingCode) {
      return NextResponse.json(
        { error: 'Se requiere código de emparejamiento' },
        { status: 400 }
      )
    }

    // Obtener API key del local si se especifica
    const localKeysForPair = await getLocalSumUpKeys(localId)

    // Emparejar en SumUp
    const reader = await pairReader(pairingCode, name || 'ServyAuto Terminal', localKeysForPair.apiKey)

    // Registrar en nuestra BD
    const dbReader = await prisma.sumUpReader.create({
      data: {
        sumupReaderId: reader.id,
        nombre: name || 'ServyAuto Terminal',
        localId: localId || null, // null = compartido
        activo: true,
      },
      include: { local: true },
    })

    return NextResponse.json({ 
      reader: {
        id: reader.id,
        name: dbReader.nombre,
        localId: dbReader.localId,
        localNombre: dbReader.local?.nombre || null,
      }
    })
  } catch (error: any) {
    console.error('Error emparejando lector SumUp:', error)
    return NextResponse.json(
      { error: error.message || 'Error al emparejar lector' },
      { status: 500 }
    )
  }
}
