/**
 * Rotación de imágenes basada en metadatos EXIF
 * Esta es una versión simplificada que retorna el archivo original
 */

export async function rotateImageIfNeeded(file: File): Promise<File> {
  // Por ahora, simplemente retorna el archivo original
  // En una versión futura se puede implementar la detección y rotación EXIF
  return Promise.resolve(file);
}
