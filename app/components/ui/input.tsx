
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, ...props }, ref) => {
    // Convertir a mayúsculas automáticamente (excepto para passwords, email y otros tipos especiales)
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type !== 'password' && type !== 'email' && type !== 'number' && type !== 'date' && type !== 'time' && type !== 'datetime-local') {
        const start = e.target.selectionStart
        const end = e.target.selectionEnd
        e.target.value = e.target.value.toUpperCase()
        // Solo usar setSelectionRange si el tipo de input lo soporta
        if (start !== null && end !== null) {
          e.target.setSelectionRange(start, end)
        }
      }
      if (onChange) {
        onChange(e)
      }
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
