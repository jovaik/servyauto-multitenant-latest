'use client'

import { useState, useEffect } from 'react'
import { Wrench, Package, ListChecks } from 'lucide-react'
import ServiciosTallerView from './servicios-taller-view'
import { CatalogoRepuestosView } from './catalogo-repuestos-view'
import { CatalogoServiciosView } from './catalogo-servicios-view'

type TabId = 'servicios' | 'repuestos' | 'catalogo'

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'servicios', label: 'Taller Rápido', icon: Wrench },
  { id: 'repuestos', label: 'Catálogo de repuestos', icon: Package },
  { id: 'catalogo', label: 'Servicios (línea rápida)', icon: ListChecks },
]

export function TallerRapidoHub() {
  const [tab, setTab] = useState<TabId>('servicios')

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab') as TabId | null
    if (t && TABS.some((x) => x.id === t)) setTab(t)
  }, [])

  const cambiarTab = (id: TabId) => {
    setTab(id)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', id)
      window.history.replaceState({}, '', url.toString())
    } catch {}
  }

  return (
    <div>
      <div className="border-b mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => cambiarTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  active ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className={tab === 'servicios' ? '' : 'hidden'}><ServiciosTallerView /></div>
      {tab === 'repuestos' && <CatalogoRepuestosView />}
      {tab === 'catalogo' && <CatalogoServiciosView />}
    </div>
  )
}
