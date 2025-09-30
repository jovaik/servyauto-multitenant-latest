
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { createS3Client, getBucketConfig } from "./aws-config"

const s3Client = createS3Client()

export async function uploadFile(buffer: Buffer, fileName: string): Promise<string> {
  const { bucketName, folderPrefix } = getBucketConfig()
  
  // Generar key único para S3
  const timestamp = Date.now()
  const key = `${folderPrefix}uploads/${timestamp}-${fileName}`
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: getContentType(fileName),
  })

  await s3Client.send(command)
  return key // Retornamos el cloud_storage_path
}

export async function downloadFile(key: string): Promise<string> {
  const { bucketName } = getBucketConfig()
  
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  // Generar URL firmada válida por 1 hora
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
  return signedUrl
}

export async function deleteFile(key: string): Promise<void> {
  const { bucketName } = getBucketConfig()
  
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  })

  await s3Client.send(command)
}

export async function renameFile(oldKey: string, newKey: string): Promise<string> {
  // En S3, "renombrar" significa copiar y luego eliminar el original
  // Por simplicidad, mantenemos el archivo original y retornamos nueva key
  return newKey
}

function getContentType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase()
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    default:
      return 'application/octet-stream'
  }
}
