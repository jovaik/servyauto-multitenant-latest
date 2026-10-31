'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Clock, Layers } from 'lucide-react'
import { FacturacionView } from './facturacion-view'
import { PendientesFacturarView } from './pendientes-facturar-view'
import { FacturacionAgrupadaView } from '../facturacion-agrupada/facturacion-agrupada-view'

type TabId = 'facturas' | 'pendientes' | 'agrupada'

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'facturas', label: 'Facturas y Tickets', icon: CreditCard },
  { id: 'pendientes', label: 'Pendientes de facturar', icon: Clock },
  { id: 'agrupada', label: 'Agrupar: Ticket / Factura', icon: Layers },
]

export function FacturacionHub() {
  const [tab, setTab] = useState<TabId>('facturas')

  // Permite entrar directo a una pestaña con ?tab=pendientes (SSR-safe)
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
                  active
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className={tab === 'facturas' ? '' : 'hidden'}>
        <FacturacionView />
      </div>
      {tab === 'pendientes' && <PendientesFacturarView />}
      {tab === 'agrupada' && <FacturacionAgrupadaView />}
    </div>
  )
}
