
import { NextRequest, NextResponse } from 'next/server'
import { downloadFile } from '@/lib/s3'

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const key = decodeURIComponent(params.key)
    
    // Generar URL firmada
    const signedUrl = await downloadFile(key)
    
    // Redirigir a la URL firmada
    return NextResponse.redirect(signedUrl)
    
  } catch (error) {
    console.error('Error serving image:', error)
    return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 })
  }
}
