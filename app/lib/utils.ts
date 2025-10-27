import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Convierte un string a MAYÚSCULAS
 * Retorna cadena vacía si el valor es null/undefined
 */
export function toUpperCase(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).toUpperCase()
}

/**
 * Convierte todas las propiedades string de un objeto a MAYÚSCULAS
 * Excluye campos específicos como contraseñas y emails si se especifica
 */
export function toUpperCaseObject<T extends Record<string, any>>(
  obj: T, 
  excludeFields: string[] = ['password', 'confirmPassword']
): T {
  const result: any = { ...obj }
  
  for (const key in result) {
    if (excludeFields.includes(key)) {
      continue
    }
    
    if (typeof result[key] === 'string') {
      result[key] = result[key].toUpperCase()
    }
  }
  
  return result
}