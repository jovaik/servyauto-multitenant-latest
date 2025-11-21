/**
 * Detección automática de esquinas de documentos usando IA
 * Esta es una versión simplificada que retorna detección básica
 */

export interface Point {
  x: number;
  y: number;
}

export interface DocumentCorners {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export async function detectDocumentCorners(
  imageDataUrl: string
): Promise<DocumentCorners | null> {
  try {
    // Llamar al endpoint de detección
    const response = await fetch('/api/document-detection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageDataUrl }),
    });

    if (!response.ok) {
      throw new Error('Error en detección');
    }

    const data = await response.json();
    
    if (data.success && data.corners) {
      return data.corners;
    }

    return null;
  } catch (error) {
    console.error('[DETECTION] Error:', error);
    return null;
  }
}
