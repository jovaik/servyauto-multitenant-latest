
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadFile } from '@/lib/s3'

// POST - Subir imagen a S3
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || 'public'
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se envió ningún archivo' },
        { status: 400 }
      )
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen' },
        { status: 400 }
      )
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'La imagen no puede superar los 5MB' },
        { status: 400 }
      )
    }

    // Convertir a Buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Generar nombre único
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${folder}/${timestamp}-${sanitizedName}`
    
    // Subir a S3
    const cloudStoragePath = await uploadFile(buffer, fileName)
    
    // Generar URL pública
    const publicUrl = `${process.env.NEXTAUTH_URL}/api/images/${cloudStoragePath.replace(process.env.AWS_FOLDER_PREFIX || '', '')}`

    return NextResponse.json({ 
      success: true,
      cloudStoragePath,
      url: publicUrl
    })
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json(
      { error: 'Error al subir la imagen' },
      { status: 500 }
    )
  }
}
