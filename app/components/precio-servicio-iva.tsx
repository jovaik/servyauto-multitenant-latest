'use client'

import { Input } from '@/components/ui/input'
import { precioConIva } from '@/lib/precio-iva'

export function PrecioServicioIva({ precio, anadirIva, onPrecioChange, onIvaChange, nombre }: {
  precio: number
  anadirIva: boolean
  onPrecioChange: (precio: number) => void
  onIvaChange: (checked: boolean) => void
  nombre: string
}) {
  return <div className="flex flex-wrap items-center gap-2 text-slate-700">
    <label className="text-xs">
      {anadirIva ? 'Base / ud. (€)' : 'Precio final / ud. (€)'}
      <Input type="number" min="0" step="0.01" value={precio || ''}
        aria-label={`${nombre}: ${anadirIva ? 'base sin IVA' : 'precio final'}`}
        onChange={e => onPrecioChange(Number(e.target.value) || 0)}
        className="w-24 h-8 text-sm bg-white text-slate-900" />
    </label>
    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
      <input type="checkbox" checked={anadirIva} onChange={e => onIvaChange(e.target.checked)} aria-label={`Añadir IVA (21 %) a ${nombre}`} />
      Añadir IVA (21 %)
    </label>
    {anadirIva && <span className="text-xs font-semibold text-green-700">Final/ud.: {precioConIva(precio, true).toFixed(2)} €</span>}
  </div>
}
