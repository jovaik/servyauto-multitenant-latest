import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listReaders, pairReader, getMerchantInfo } from '@/lib/sumup'

// GET - Listar lectores emparejados
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const readers = await listReaders()
    return NextResponse.json({ readers })
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

    const { pairingCode, name } = await request.json()

    if (!pairingCode) {
      return NextResponse.json(
        { error: 'Se requiere código de emparejamiento' },
        { status: 400 }
      )
    }

    const reader = await pairReader(pairingCode, name || 'ServyAuto Terminal')
    return NextResponse.json({ reader })
  } catch (error: any) {
    console.error('Error emparejando lector SumUp:', error)
    return NextResponse.json(
      { error: error.message || 'Error al emparejar lector' },
      { status: 500 }
    )
  }
}
