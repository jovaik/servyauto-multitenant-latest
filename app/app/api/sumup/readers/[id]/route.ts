import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { unpairReader } from '@/lib/sumup'

// DELETE - Desemparejar lector
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await unpairReader(params.id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error desemparejando lector SumUp:', error)
    return NextResponse.json(
      { error: error.message || 'Error al desemparejar lector' },
      { status: 500 }
    )
  }
}
