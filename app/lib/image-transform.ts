
/**
 * Utilidades para transformación de imágenes
 * 
 * Funciones auxiliares para compresión, rotación y procesamiento
 * de imágenes en el navegador.
 */

/**
 * Rotar imagen si es necesario basándose en EXIF
 */
export async function rotateImageIfNeeded(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        } else {
          reject(new Error('No se pudo obtener contexto 2D'));
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convertir imagen a escala de grises
 */
export function convertToGrayscale(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Comprimir imagen para reducir tamaño
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto 2D'));
          return;
        }
        
        // Calcular nuevas dimensiones
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar imagen
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Error al comprimir imagen'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Error al cargar imagen'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Error al leer archivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Rotar imagen en grados (0, 90, 180, 270)
 */
export function rotateImage(
  canvas: HTMLCanvasElement,
  degrees: number
): HTMLCanvasElement {
  const rotatedCanvas = document.createElement('canvas');
  const ctx = rotatedCanvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('No se pudo obtener contexto 2D');
  }
  
  const radians = (degrees * Math.PI) / 180;
  
  if (degrees === 90 || degrees === 270) {
    rotatedCanvas.width = canvas.height;
    rotatedCanvas.height = canvas.width;
  } else {
    rotatedCanvas.width = canvas.width;
    rotatedCanvas.height = canvas.height;
  }
  
  ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
  ctx.rotate(radians);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  
  return rotatedCanvas;
}
