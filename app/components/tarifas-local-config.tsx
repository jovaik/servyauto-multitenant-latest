'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus, Save, Car, Euro, Building2, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  getAvailableBrands,
  getModelsForBrand,
  detectVehicleCategory,
  CATEGORY_LABELS,
  CATEGORY_EMOJIS,
  CATEGORY_COLORS,
  type VehicleCategory,
} from '@/lib/vehicle-categories'

interface Local {
  id: string
  nombre: string
}

interface Servicio {
  id: string
  nombre: string
  precio: number
}

interface CategoriaOverride {
  id: string
  localId: string
  marca: string
  modelo: string
  categoria: string
}

interface PrecioOverride {
  id: string
  localId: string
  servicioId: string
  precio: number
  servicio: { id: string; nombre: string; precio: number }
}

const CATEGORIAS = [
  { value: 'PEQ', label: 'Pequeño', emoji: '🚗' },
  { value: 'MED', label: 'Mediano', emoji: '🚙' },
  { value: 'GR', label: 'Grande', emoji: '🚐' },
  { value: 'EXTGR', label: 'Extra Grande', emoji: '🏎️' },
]

export function TarifasLocalConfig() {
  const [locales, setLocales] = useState<Local[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [selectedLocalId, setSelectedLocalId] = useState<string>('')
  const [categoriaOverrides, setCategoriaOverrides] = useState<CategoriaOverride[]>([])
  const [precioOverrides, setPrecioOverrides] = useState<PrecioOverride[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'categoria' | 'precio'>('categoria')

  // Form state para nueva categoría override
  const [newCatMarca, setNewCatMarca] = useState('')
  const [newCatModelo, setNewCatModelo] = useState('')
  const [newCatCategoria, setNewCatCategoria] = useState('')
  const [brandSearch, setBrandSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)

  // Form state para nuevo precio override
  const [newPrecioServicioId, setNewPrecioServicioId] = useState('')
  const [newPrecio, setNewPrecio] = useState('')

  useEffect(() => {
    loadLocales()
    loadServicios()
  }, [])

  const loadLocales = async () => {
    try {
      const res = await fetch('/api/locales')
      if (res.ok) {
        const data = await res.json()
        const activos = (data || []).filter((l: any) => l.activo)
        setLocales(activos)
        if (activos.length === 1) setSelectedLocalId(activos[0].id)
      }
    } catch (e) { console.error('Error cargando locales:', e) }
  }

  const loadServicios = async () => {
    try {
      const res = await fetch('/api/servicios')
      if (res.ok) {
        const data = await res.json()
        setServicios((data || []).filter((s: any) => s.activo))
      }
    } catch (e) { console.error('Error cargando servicios:', e) }
  }

  const loadOverrides = useCallback(async () => {
    if (!selectedLocalId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/overrides-local?localId=${selectedLocalId}`)
      if (res.ok) {
        const data = await res.json()
        setCategoriaOverrides(data.categoriaOverrides || [])
        setPrecioOverrides(data.precioOverrides || [])
      }
    } catch (e) { console.error('Error cargando overrides:', e) }
    setLoading(false)
  }, [selectedLocalId])

  useEffect(() => {
    if (selectedLocalId) loadOverrides()
  }, [selectedLocalId, loadOverrides])

  const addCategoriaOverride = async () => {
    if (!newCatMarca || !newCatModelo || !newCatCategoria) {
      toast.error('Completa marca, modelo y categoría')
      return
    }
    try {
      const res = await fetch('/api/overrides-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'categoria',
          localId: selectedLocalId,
          marca: newCatMarca,
          modelo: newCatModelo,
          categoria: newCatCategoria,
        }),
      })
      if (res.ok) {
        toast.success('Override de categoría guardado')
        setNewCatMarca('')
        setNewCatModelo('')
        setNewCatCategoria('')
        setBrandSearch('')
        setModelSearch('')
        loadOverrides()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al guardar')
      }
    } catch (e) { toast.error('Error de conexión') }
  }

  const addPrecioOverride = async () => {
    if (!newPrecioServicioId || !newPrecio) {
      toast.error('Selecciona servicio y precio')
      return
    }
    try {
      const res = await fetch('/api/overrides-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'precio',
          localId: selectedLocalId,
          servicioId: newPrecioServicioId,
          precio: parseFloat(newPrecio),
        }),
      })
      if (res.ok) {
        toast.success('Override de precio guardado')
        setNewPrecioServicioId('')
        setNewPrecio('')
        loadOverrides()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al guardar')
      }
    } catch (e) { toast.error('Error de conexión') }
  }

  const deleteOverride = async (id: string, tipo: 'categoria' | 'precio') => {
    if (!confirm('¿Eliminar este override?')) return
    try {
      const res = await fetch(`/api/overrides-local?id=${id}&tipo=${tipo}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Override eliminado')
        loadOverrides()
      }
    } catch (e) { toast.error('Error al eliminar') }
  }

  const brands = getAvailableBrands()
  const filteredBrands = brands.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()))
  const models = newCatMarca ? getModelsForBrand(newCatMarca) : []
  const filteredModels = models.filter(m => m.modelo.toLowerCase().includes(modelSearch.toLowerCase()))

  // Detección de categoría global
  const globalCat = newCatMarca && newCatModelo ? detectVehicleCategory(newCatMarca, newCatModelo) : null

  // Servicios que aún no tienen override en este local
  const serviciosSinOverride = servicios.filter(
    s => !precioOverrides.some(po => po.servicioId === s.id)
  )

  const localName = locales.find(l => l.id === selectedLocalId)?.nombre?.replace('SERVYAUTO ', '') || ''

  return (
    <div className="space-y-6">
      {/* Selector de local */}
      <div className="flex items-center gap-4">
        <Building2 className="h-5 w-5 text-blue-600" />
        <div className="flex-1">
          <Label className="text-sm font-medium">Local</Label>
          <Select value={selectedLocalId} onValueChange={setSelectedLocalId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un local..." />
            </SelectTrigger>
            <SelectContent>
              {locales.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  {l.nombre.replace('SERVYAUTO ', '')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedLocalId && (
        <div className="text-center py-12 text-gray-500">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Selecciona un local para configurar sus tarifas especiales</p>
        </div>
      )}

      {selectedLocalId && (
        <>
          {/* Toggle tipo de override */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'categoria' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('categoria')}
              className="flex items-center gap-2"
            >
              <Car className="h-4 w-4" />
              Categoría por Vehículo
            </Button>
            <Button
              variant={activeTab === 'precio' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('precio')}
              className="flex items-center gap-2"
            >
              <Euro className="h-4 w-4" />
              Precio por Servicio
            </Button>
          </div>

          {/* === CATEGORÍA OVERRIDES === */}
          {activeTab === 'categoria' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Car className="h-5 w-5" />
                  Categoría Forzada en {localName}
                </CardTitle>
                <CardDescription>
                  Cambia la categoría de un vehículo solo para este local. 
                  Ej: Porsche 911 → "Grande" en Laguna Village, pero sigue siendo "Mediano" en los demás.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Form para añadir */}
                <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {/* Brand selector */}
                    <div className="relative">
                      <Label className="text-xs">Marca</Label>
                      <div
                        className="flex items-center border rounded-md px-3 py-2 bg-white cursor-pointer text-sm"
                        onClick={() => { setShowBrandDropdown(!showBrandDropdown); setShowModelDropdown(false) }}
                      >
                        <span className={newCatMarca ? 'text-gray-900' : 'text-gray-400'}>
                          {newCatMarca || 'Seleccionar...'}
                        </span>
                      </div>
                      {showBrandDropdown && (
                        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                          <div className="sticky top-0 bg-white p-2 border-b">
                            <div className="flex items-center gap-2 border rounded px-2 py-1">
                              <Search className="h-3 w-3 text-gray-400" />
                              <input
                                className="flex-1 text-sm outline-none bg-transparent"
                                placeholder="Buscar marca..."
                                value={brandSearch}
                                onChange={(e) => setBrandSearch(e.target.value)}
                                autoFocus
                              />
                            </div>
                          </div>
                          {filteredBrands.map(b => (
                            <button
                              key={b}
                              className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 transition-colors"
                              onClick={() => {
                                setNewCatMarca(b)
                                setNewCatModelo('')
                                setNewCatCategoria('')
                                setBrandSearch('')
                                setModelSearch('')
                                setShowBrandDropdown(false)
                                setShowModelDropdown(true)
                              }}
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Model selector */}
                    <div className="relative">
                      <Label className="text-xs">Modelo</Label>
                      <div
                        className={`flex items-center border rounded-md px-3 py-2 bg-white text-sm ${newCatMarca ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                        onClick={() => { if (newCatMarca) { setShowModelDropdown(!showModelDropdown); setShowBrandDropdown(false) } }}
                      >
                        <span className={newCatModelo ? 'text-gray-900' : 'text-gray-400'}>
                          {newCatModelo || 'Seleccionar...'}
                        </span>
                      </div>
                      {showModelDropdown && newCatMarca && (
                        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                          <div className="sticky top-0 bg-white p-2 border-b">
                            <div className="flex items-center gap-2 border rounded px-2 py-1">
                              <Search className="h-3 w-3 text-gray-400" />
                              <input
                                className="flex-1 text-sm outline-none bg-transparent"
                                placeholder="Buscar modelo..."
                                value={modelSearch}
                                onChange={(e) => setModelSearch(e.target.value)}
                                autoFocus
                              />
                            </div>
                          </div>
                          {filteredModels.map(m => (
                            <button
                              key={m.modelo}
                              className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between"
                              onClick={() => {
                                setNewCatModelo(m.modelo)
                                setModelSearch('')
                                setShowModelDropdown(false)
                              }}
                            >
                              <span>{m.modelo}</span>
                              {m.category && (
                                <span className="text-xs opacity-60">
                                  {CATEGORY_EMOJIS[m.category as VehicleCategory]} {m.category}
                                </span>
                              )}
                            </button>
                          ))}
                          {/* Escribir modelo libre */}
                          <div className="border-t px-3 py-2">
                            <Input
                              className="text-sm h-8"
                              placeholder="Otro modelo..."
                              value={newCatModelo}
                              onChange={(e) => setNewCatModelo(e.target.value.toUpperCase())}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Categoría forzada */}
                    <div>
                      <Label className="text-xs">Categoría forzada</Label>
                      <Select value={newCatCategoria} onValueChange={setNewCatCategoria}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Cat..." />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIAS.map(c => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.emoji} {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {globalCat && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          Global: {CATEGORY_EMOJIS[globalCat]} {CATEGORY_LABELS[globalCat]}
                        </p>
                      )}
                    </div>

                    <div className="flex items-end">
                      <Button size="sm" onClick={addCategoriaOverride} className="w-full">
                        <Plus className="h-4 w-4 mr-1" /> Añadir
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Lista de overrides existentes */}
                {loading ? (
                  <p className="text-sm text-gray-500 text-center py-4">Cargando...</p>
                ) : categoriaOverrides.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    No hay overrides de categoría para este local. Se usarán las categorías globales.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {categoriaOverrides.map(co => {
                      const globalCategory = detectVehicleCategory(co.marca, co.modelo)
                      return (
                        <div key={co.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-sm">{co.marca} {co.modelo}</span>
                            {globalCategory && (
                              <Badge variant="outline" className="text-xs opacity-50 line-through">
                                {CATEGORY_EMOJIS[globalCategory]} {CATEGORY_LABELS[globalCategory]}
                              </Badge>
                            )}
                            <span className="text-gray-400">→</span>
                            <Badge className={`${CATEGORY_COLORS[co.categoria as VehicleCategory]?.bg || 'bg-gray-100'} ${CATEGORY_COLORS[co.categoria as VehicleCategory]?.text || 'text-gray-800'} ${CATEGORY_COLORS[co.categoria as VehicleCategory]?.border || 'border-gray-300'}`}>
                              {CATEGORIAS.find(c => c.value === co.categoria)?.emoji} {CATEGORY_LABELS[co.categoria as VehicleCategory] || co.categoria}
                            </Badge>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => deleteOverride(co.id, 'categoria')}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* === PRECIO OVERRIDES === */}
          {activeTab === 'precio' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Euro className="h-5 w-5" />
                  Precios Especiales en {localName}
                </CardTitle>
                <CardDescription>
                  Cambia el precio de un servicio solo para este local.
                  Ej: "Lavado Exterior MED" cuesta 15€ en general, pero 20€ en Laguna Village.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Form para añadir */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Servicio</Label>
                      <Select value={newPrecioServicioId} onValueChange={setNewPrecioServicioId}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Seleccionar servicio..." />
                        </SelectTrigger>
                        <SelectContent>
                          {serviciosSinOverride.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.nombre} — {s.precio.toFixed(2)}€
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Precio especial (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={newPrecio}
                        onChange={(e) => setNewPrecio(e.target.value)}
                        placeholder="20.00"
                        className="text-sm"
                      />
                      {newPrecioServicioId && newPrecio && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          Precio global: {servicios.find(s => s.id === newPrecioServicioId)?.precio.toFixed(2)}€
                        </p>
                      )}
                    </div>
                    <div className="flex items-end">
                      <Button size="sm" onClick={addPrecioOverride} className="w-full">
                        <Plus className="h-4 w-4 mr-1" /> Añadir
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Lista de overrides existentes */}
                {loading ? (
                  <p className="text-sm text-gray-500 text-center py-4">Cargando...</p>
                ) : precioOverrides.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    No hay precios especiales para este local. Se usarán los precios globales.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {precioOverrides.map(po => {
                      const diff = po.precio - po.servicio.precio
                      const diffColor = diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : 'text-gray-500'
                      return (
                        <div key={po.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-medium text-sm">{po.servicio.nombre}</span>
                            <Badge variant="outline" className="text-xs opacity-50 line-through">
                              {po.servicio.precio.toFixed(2)}€
                            </Badge>
                            <span className="text-gray-400">→</span>
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                              {po.precio.toFixed(2)}€
                            </Badge>
                            <span className={`text-xs font-medium ${diffColor}`}>
                              ({diff > 0 ? '+' : ''}{diff.toFixed(2)}€)
                            </span>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => deleteOverride(po.id, 'precio')}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
