
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
 * Resolver homografía (8 incógnitas) que mapea from[i] -> to[i]
 */
function computeHomography(from: number[], to: number[]): number[] {
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const x = from[i * 2], y = from[i * 2 + 1];
    const u = to[i * 2], v = to[i * 2 + 1];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  // Eliminación gaussiana con pivoteo parcial
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c] || 1e-12;
    for (let k = c; k < 9; k++) A[c][k] /= d;
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c];
      if (f === 0) continue;
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  return [...A.map((row) => row[8]), 1];
}

/**
 * Aplicar transformación de perspectiva (lógica interna)
 */
function applyPerspectiveTransformInternal(
  sourceCanvas: HTMLCanvasElement,
  corners: { topLeft: Point; topRight: Point; bottomRight: Point; bottomLeft: Point }
): Promise<{ blob: Blob; canvas: HTMLCanvasElement }> {
  const { topLeft, topRight, bottomRight, bottomLeft } = corners;
  const sw = sourceCanvas.width, sh = sourceCanvas.height;

  const widthTop = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
  const widthBottom = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y);
  const heightLeft = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y);
  const heightRight = Math.hypot(bottomRight.x - topRight.x, bottomRight.y - topRight.y);
  let width = Math.max(widthTop, widthBottom);
  let height = Math.max(heightLeft, heightRight);

  // Limitar tamaño (máx 2400 px lado largo) y forzar enteros
  const scale = Math.min(1, 2400 / Math.max(width, height, 1));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const destCanvas = document.createElement('canvas');
  destCanvas.width = width;
  destCanvas.height = height;
  const destCtx = destCanvas.getContext('2d');
  const srcCtx = sourceCanvas.getContext('2d');
  if (!destCtx || !srcCtx) throw new Error('No se pudo obtener contexto 2D');

  // Homografía destino(rectángulo) -> origen(cuadrilátero) para mapeo inverso
  const H = computeHomography(
    [0, 0, width, 0, width, height, 0, height],
    [topLeft.x, topLeft.y, topRight.x, topRight.y, bottomRight.x, bottomRight.y, bottomLeft.x, bottomLeft.y]
  );

  const src = srcCtx.getImageData(0, 0, sw, sh).data;
  const destData = destCtx.createImageData(width, height);
  const out = destData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const w = H[6] * x + H[7] * y + H[8];
      let sx = (H[0] * x + H[1] * y + H[2]) / w;
      let sy = (H[3] * x + H[4] * y + H[5]) / w;
      sx = Math.min(Math.max(sx, 0), sw - 1);
      sy = Math.min(Math.max(sy, 0), sh - 1);
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const x1 = Math.min(x0 + 1, sw - 1), y1 = Math.min(y0 + 1, sh - 1);
      const fx = sx - x0, fy = sy - y0;
      const i00 = (y0 * sw + x0) * 4, i10 = (y0 * sw + x1) * 4;
      const i01 = (y1 * sw + x0) * 4, i11 = (y1 * sw + x1) * 4;
      const o = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const top = src[i00 + c] * (1 - fx) + src[i10 + c] * fx;
        const bot = src[i01 + c] * (1 - fx) + src[i11 + c] * fx;
        out[o + c] = top * (1 - fy) + bot * fy;
      }
      out[o + 3] = 255;
    }
  }

  destCtx.putImageData(destData, 0, 0);

  return new Promise((resolve, reject) => {
    destCanvas.toBlob((blob) => {
      if (blob) resolve({ blob, canvas: destCanvas });
      else reject(new Error('No se pudo convertir canvas a blob'));
    }, 'image/jpeg', 0.92);
  });
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
