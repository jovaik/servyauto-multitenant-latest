export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listReaders, pairReader, getLocalSumUpKeys, resolveSumUpKeys } from '@/lib/sumup'
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

    // Obtener contexto local para determinar qué API key usar como fallback
    const localContextForKey = await getLocalContext()

    // Obtener lectores de TODAS las cuentas TPV SumUp activas. Cada cuenta
    // (p.ej. SUMUP SERVYAUTO, SUMUP BARTO) tiene su propia clave y, por tanto,
    // su propio conjunto de datafonos. Los mergeamos etiquetando cada lector
    // con la cuenta a la que pertenece.
    const cuentas = await prisma.cuentaTpv.findMany({
      where: { activo: true, proveedor: 'SUMUP' },
    })

    let sumupReaders: any[] = []
    const seen = new Set<string>()

    if (cuentas.length > 0) {
      for (const cuenta of cuentas) {
        const keys = await resolveSumUpKeys({
          cuentaTpvId: cuenta.id,
          // Una cuenta sin clave propia usa su local fijo o la central,
          // nunca cambia de identidad al cambiar el filtro de la agenda.
          localId: cuenta.localId,
        })
        try {
          const rs = await listReaders(keys.apiKey)
          for (const r of rs) {
            if (seen.has(r.id)) continue // evitar duplicados si dos cuentas comparten clave
            seen.add(r.id)
            sumupReaders.push({ ...r, _cuentaId: cuenta.id, _cuentaNombre: cuenta.nombre })
          }
        } catch (e) {
          console.error(`Error listando lectores de la cuenta ${cuenta.nombre}:`, e)
        }
      }
    } else {
      // Sin cuentas configuradas: comportamiento anterior (clave del local / central)
      const localKeysForReaders = await getLocalSumUpKeys(localContextForKey?.selectedLocalId)
      sumupReaders = await listReaders(localKeysForReaders.apiKey)
    }

    // Obtener lectores registrados en nuestra BD
    const dbReaders = await prisma.sumUpReader.findMany({
      include: {
        local: true,
        user: { select: { id: true, name: true, email: true } },
        cuentaTpv: { select: { id: true, nombre: true } },
      },
    })

    // Mapear y enriquecer con datos locales
    const readers = sumupReaders.map((sr: any) => {
      const dbReader = dbReaders.find((r: any) => r.sumupReaderId === sr.id)
      // La cuenta autoritativa es la que listó el datafono (su clave). Si no
      // viniera del listado (modo compat), usar la de BD.
      const cuentaTpvId = sr._cuentaId || dbReader?.cuentaTpvId || null
      const cuentaTpvNombre = sr._cuentaNombre || dbReader?.cuentaTpv?.nombre || null
      return {
        id: sr.id,
        name: dbReader?.nombre || sr.name || `Terminal ${sr.id.slice(-4)}`,
        status: sr.status || 'unknown',
        localId: dbReader?.localId || null,
        localNombre: dbReader?.local?.nombre || null,
        userId: dbReader?.userId || null,
        userNombre: dbReader?.user?.name || dbReader?.user?.email || null,
        cuentaTpvId,
        cuentaTpvNombre,
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

    const { pairingCode, name, localId, cuentaTpvId } = await request.json()

    if (!pairingCode) {
      return NextResponse.json(
        { error: 'Se requiere código de emparejamiento' },
        { status: 400 }
      )
    }

    // Clave: la de la cuenta TPV elegida (p.ej. SUMUP BARTO) con fallback al
    // local / central. El datafono se empareja en la cuenta correcta.
    const keysForPair = await resolveSumUpKeys({ cuentaTpvId, localId })

    // Emparejar en SumUp
    const reader = await pairReader(pairingCode, name || 'ServyAuto Terminal', keysForPair.apiKey)

    // Registrar en nuestra BD
    const dbReader = await prisma.sumUpReader.create({
      data: {
        sumupReaderId: reader.id,
        nombre: name || 'ServyAuto Terminal',
        localId: localId || null, // null = compartido
        cuentaTpvId: cuentaTpvId || null,
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
