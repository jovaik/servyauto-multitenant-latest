
/**
 * Transformación de perspectiva
 * 
 * Aplica transformación de perspectiva a una imagen basándose
 * en cuatro puntos de esquina.
 */

import { Point } from '../types/invoice-types';

/**
 * Aplicar transformación de perspectiva (versión async para Files)
 */
export async function applyPerspectiveTransform(
  source: File | HTMLCanvasElement,
  corners: { topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point }
): Promise<{ blob: Blob; canvas: HTMLCanvasElement }> {
  // Si recibimos un File, convertirlo a canvas primero
  let sourceCanvas: HTMLCanvasElement;
  
  if (source instanceof File) {
    sourceCanvas = await fileToCanvas(source);
  } else {
    sourceCanvas = source;
  }
  
  return applyPerspectiveTransformInternal(sourceCanvas, corners);
}

/**
 * Convertir File a Canvas
 */
async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      } else {
        reject(new Error('No se pudo obtener contexto 2D'));
      }
    };
    img.onerror = () => reject(new Error('Error al cargar imagen'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Aplicar transformación de perspectiva (lógica interna)
 */
function applyPerspectiveTransformInternal(
  sourceCanvas: HTMLCanvasElement,
  corners: { topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point }
): Promise<{ blob: Blob; canvas: HTMLCanvasElement }> {
  const { topLeft, topRight, bottomRight, bottomLeft } = corners;
  
  // Calcular dimensiones del documento
  const widthTop = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
  const widthBottom = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y);
  const width = Math.max(widthTop, widthBottom);
  
  const heightLeft = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y);
  const heightRight = Math.hypot(bottomRight.x - topRight.x, bottomRight.y - topRight.y);
  const height = Math.max(heightLeft, heightRight);
  
  // Crear canvas de destino
  const destCanvas = document.createElement('canvas');
  destCanvas.width = width;
  destCanvas.height = height;
  const destCtx = destCanvas.getContext('2d');
  
  if (!destCtx) {
    throw new Error('No se pudo obtener contexto 2D');
  }
  
  // Calcular matriz de transformación
  const srcPoints = [
    topLeft.x, topLeft.y,
    topRight.x, topRight.y,
    bottomRight.x, bottomRight.y,
    bottomLeft.x, bottomLeft.y
  ];
  
  const dstPoints = [
    0, 0,
    width, 0,
    width, height,
    0, height
  ];
  
  // Aplicar transformación punto por punto
  const srcCtx = sourceCanvas.getContext('2d');
  if (!srcCtx) {
    throw new Error('No se pudo obtener contexto de origen');
  }
  
  const srcData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const destData = destCtx.createImageData(width, height);
  
  // Transformación bilineal
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Mapear punto de destino a origen
      const srcX = mapPoint(x, y, dstPoints, srcPoints, 0);
      const srcY = mapPoint(x, y, dstPoints, srcPoints, 1);
      
      if (srcX >= 0 && srcX < sourceCanvas.width && srcY >= 0 && srcY < sourceCanvas.height) {
        const srcIndex = (Math.floor(srcY) * sourceCanvas.width + Math.floor(srcX)) * 4;
        const destIndex = (y * width + x) * 4;
        
        destData.data[destIndex] = srcData.data[srcIndex];
        destData.data[destIndex + 1] = srcData.data[srcIndex + 1];
        destData.data[destIndex + 2] = srcData.data[srcIndex + 2];
        destData.data[destIndex + 3] = 255;
      }
    }
  }
  
  destCtx.putImageData(destData, 0, 0);
  
  // Convertir canvas a blob
  return new Promise((resolve, reject) => {
    destCanvas.toBlob((blob) => {
      if (blob) {
        resolve({ blob, canvas: destCanvas });
      } else {
        reject(new Error('No se pudo convertir canvas a blob'));
      }
    }, 'image/jpeg', 0.95);
  });
}

/**
 * Mapear punto usando transformación de perspectiva
 */
function mapPoint(
  x: number,
  y: number,
  src: number[],
  dst: number[],
  axis: number
): number {
  // Interpolación bilineal simplificada
  const u = x / (dst[2] - dst[0]);
  const v = y / (dst[5] - dst[1]);
  
  const x1 = src[0] + u * (src[2] - src[0]);
  const x2 = src[6] + u * (src[4] - src[6]);
  
  return x1 + v * (x2 - x1) + (axis === 1 ? v * (src[7] - src[1]) : 0);
}

/**
 * Detectar esquinas del documento usando IA
 */
export async function detectDocumentCorners(
  file: File,
  imageWidth: number,
  imageHeight: number
): Promise<{ topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point } | null> {
  try {
    // Convertir imagen a base64
    const base64 = await fileToBase64(file);
    
    // Llamar a API de detección
    const response = await fetch('/api/document-detection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: base64,
        width: imageWidth,
        height: imageHeight
      })
    });
    
    if (!response.ok) {
      throw new Error('Error en detección de documento');
    }
    
    const data = await response.json();
    
    if (data.success && data.corners) {
      return data.corners;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error al detectar esquinas:', error);
    return null;
  }
}

/**
 * Convertir archivo a base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
