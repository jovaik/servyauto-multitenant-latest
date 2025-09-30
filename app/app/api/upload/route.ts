
import { NextRequest, NextResponse } from 'next/server'
import { uploadFile } from '@/lib/s3'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No se encontró archivo' }, { status: 400 })
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Tipo de archivo no válido. Solo se permiten imágenes.' 
      }, { status: 400 })
    }

    // Validar tamaño (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'El archivo es demasiado grande. Máximo 10MB.' 
      }, { status: 400 })
    }

    // Convertir a Buffer y subir a S3
    const buffer = Buffer.from(await file.arrayBuffer())
    const cloudStoragePath = await uploadFile(buffer, file.name)

    return NextResponse.json({ 
      success: true, 
      cloud_storage_path: cloudStoragePath,
      message: 'Imagen subida correctamente' 
    })

  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
