
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onChange, ...props }, ref) => {
    // Convertir a mayúsculas automáticamente
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      e.target.value = e.target.value.toUpperCase()
      e.target.setSelectionRange(start, end)
      if (onChange) {
        onChange(e)
      }
    }

    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
