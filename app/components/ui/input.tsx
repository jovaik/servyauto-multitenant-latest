
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  noUppercase?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, autoCapitalize, noUppercase, ...props }, ref) => {
    // Tipos de input que NO deben convertirse a mayúsculas
    const skipUppercase = ['password', 'email', 'number', 'date', 'time', 'datetime-local', 'file', 'checkbox', 'radio', 'url', 'tel']
    
    // Si se especifica autoCapitalize="none" o noUppercase explícitamente, respetarlo
    const explicitlyDisabled = autoCapitalize === 'none' || noUppercase === true
    
    // Solo usar handler personalizado para campos que necesitan conversión a mayúsculas
    const shouldConvertToUppercase = !explicitlyDisabled && !skipUppercase.includes(type || 'text')
    
    // Handler para convertir a mayúsculas
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (shouldConvertToUppercase) {
        const start = e.target.selectionStart
        const end = e.target.selectionEnd
        e.target.value = e.target.value.toUpperCase()
        // Solo usar setSelectionRange si el tipo de input lo soporta
        if (start !== null && end !== null) {
          try {
            e.target.setSelectionRange(start, end)
          } catch (error) {
            // Ignorar errores de setSelectionRange en tipos que no lo soportan
          }
        }
      }
      if (onChange) {
        onChange(e)
      }
    }

    return (
      <input
        type={type}
        autoCapitalize={autoCapitalize}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        style={{ textTransform: 'none' }}
        ref={ref}
        onChange={shouldConvertToUppercase ? handleChange : onChange}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
