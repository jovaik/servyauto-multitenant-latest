'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ChevronDown, Search, Car } from 'lucide-react'
import {
  getAvailableBrands,
  getModelsForBrand,
  detectVehicleCategory,
  CATEGORY_LABELS,
  CATEGORY_EMOJIS,
  CATEGORY_COLORS,
  type VehicleCategory,
} from '@/lib/vehicle-categories'

interface VehicleBrandModelSelectorProps {
  marca: string
  modelo: string
  onMarcaChange: (marca: string) => void
  onModeloChange: (modelo: string) => void
  onCategoryDetected?: (category: VehicleCategory | null) => void
  compact?: boolean // Para formularios más pequeños
}

export function VehicleBrandModelSelector({
  marca,
  modelo,
  onMarcaChange,
  onModeloChange,
  onCategoryDetected,
  compact = false,
}: VehicleBrandModelSelectorProps) {
  const [showBrandDropdown, setShowBrandDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [brandSearch, setBrandSearch] = useState('')
  const [modelSearch, setModelSearch] = useState('')
  const [marcaOtro, setMarcaOtro] = useState(false)
  const [modeloOtro, setModeloOtro] = useState(false)
  const brandRef = useRef<HTMLDivElement>(null)
  const modelRef = useRef<HTMLDivElement>(null)

  const allBrands = getAvailableBrands()
  const modelsForBrand = marca && !marcaOtro ? getModelsForBrand(marca) : []

  // Filtrar marcas según búsqueda
  const filteredBrands = brandSearch
    ? allBrands.filter(b => b.includes(brandSearch.toUpperCase()))
    : allBrands

  // Filtrar modelos según búsqueda
  const filteredModels = modelSearch
    ? modelsForBrand.filter(m => m.modelo.includes(modelSearch.toUpperCase()))
    : modelsForBrand

  // Detectar categoría cuando cambian marca/modelo
  useEffect(() => {
    if (marca && modelo && onCategoryDetected) {
      const cat = detectVehicleCategory(marca, modelo)
      onCategoryDetected(cat)
    }
  }, [marca, modelo, onCategoryDetected])

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (brandRef.current && !brandRef.current.contains(e.target as Node)) {
        setShowBrandDropdown(false)
      }
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectBrand = useCallback((brand: string) => {
    onMarcaChange(brand)
    onModeloChange('') // Reset modelo al cambiar marca
    setBrandSearch('')
    setShowBrandDropdown(false)
    setMarcaOtro(false)
    setModeloOtro(false)
    // Abrir automáticamente el dropdown de modelo
    setTimeout(() => setShowModelDropdown(true), 100)
  }, [onMarcaChange, onModeloChange])

  const handleSelectModel = useCallback((model: string) => {
    onModeloChange(model)
    setModelSearch('')
    setShowModelDropdown(false)
    setModeloOtro(false)
  }, [onModeloChange])

  const handleBrandOtro = useCallback(() => {
    setMarcaOtro(true)
    onMarcaChange('')
    onModeloChange('')
    setBrandSearch('')
    setShowBrandDropdown(false)
    setModeloOtro(true) // Si marca es "otro", modelo también
  }, [onMarcaChange, onModeloChange])

  const handleModelOtro = useCallback(() => {
    setModeloOtro(true)
    onModeloChange('')
    setModelSearch('')
    setShowModelDropdown(false)
  }, [onModeloChange])

  // Categoría detectada para mostrar badge
  const detectedCat = marca && modelo ? detectVehicleCategory(marca, modelo) : null

  return (
    <div className="space-y-3">
      <div className={compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-2 gap-3'}>
        {/* === MARCA === */}
        <div className="space-y-1" ref={brandRef}>
          <Label className="text-sm">Marca *</Label>
          {marcaOtro ? (
            <div className="space-y-1">
              <Input
                value={marca}
                onChange={(e) => onMarcaChange(e.target.value.toUpperCase())}
                placeholder="Escribe la marca..."
                className="uppercase font-semibold"
                autoFocus
              />
              <button
                type="button"
                onClick={() => { setMarcaOtro(false); onMarcaChange(''); onModeloChange(''); setModeloOtro(false) }}
                className="text-xs text-blue-600 hover:underline"
              >
                ← Volver al listado
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => { setShowBrandDropdown(!showBrandDropdown); setShowModelDropdown(false) }}
                className={`w-full flex items-center justify-between px-3 py-2 border rounded-md text-left transition-colors ${
                  marca 
                    ? 'bg-white border-gray-300 font-semibold' 
                    : 'bg-gray-50 border-gray-300 text-gray-500'
                } hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <span className={`truncate ${!marca ? 'text-gray-400' : ''}`}>
                  {marca || 'Seleccionar marca'}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
              </button>

              {showBrandDropdown && (
                <div className="absolute z-[60] w-full mt-1 bg-white border-2 border-blue-300 rounded-lg shadow-xl max-h-64 overflow-hidden">
                  {/* Buscador */}
                  <div className="sticky top-0 bg-white border-b p-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={brandSearch}
                        onChange={(e) => setBrandSearch(e.target.value)}
                        placeholder="Buscar marca..."
                        className="pl-8 h-8 text-sm"
                        autoFocus
                      />
                    </div>
                  </div>
                  {/* Lista */}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredBrands.map((brand) => (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => handleSelectBrand(brand)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${
                          brand === marca ? 'bg-blue-100 font-semibold text-blue-900' : 'text-gray-800'
                        }`}
                      >
                        {brand}
                      </button>
                    ))}
                    {filteredBrands.length === 0 && (
                      <div className="p-3 text-center text-sm text-gray-500">
                        No encontrado
                      </div>
                    )}
                    {/* Opción "Otra marca" */}
                    <button
                      type="button"
                      onClick={handleBrandOtro}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 border-t border-gray-200 text-orange-700 font-medium"
                    >
                      ✏️ Otra marca (escribir manualmente)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* === MODELO === */}
        <div className="space-y-1" ref={modelRef}>
          <Label className="text-sm">Modelo *</Label>
          {modeloOtro ? (
            <div className="space-y-1">
              <Input
                value={modelo}
                onChange={(e) => onModeloChange(e.target.value.toUpperCase())}
                placeholder="Escribe el modelo..."
                className="uppercase font-semibold"
                autoFocus
              />
              {!marcaOtro && (
                <button
                  type="button"
                  onClick={() => { setModeloOtro(false); onModeloChange('') }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  ← Volver al listado
                </button>
              )}
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (!marca) return
                  setShowModelDropdown(!showModelDropdown)
                  setShowBrandDropdown(false)
                }}
                disabled={!marca}
                className={`w-full flex items-center justify-between px-3 py-2 border rounded-md text-left transition-colors ${
                  !marca 
                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                    : modelo
                      ? 'bg-white border-gray-300 font-semibold'
                      : 'bg-gray-50 border-gray-300 text-gray-500'
                } hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:hover:border-gray-200`}
              >
                <span className={`truncate ${!modelo ? 'text-gray-400' : ''}`}>
                  {!marca ? 'Primero selecciona marca' : modelo || 'Seleccionar modelo'}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
              </button>

              {showModelDropdown && marca && (
                <div className="absolute z-[60] w-full mt-1 bg-white border-2 border-blue-300 rounded-lg shadow-xl max-h-64 overflow-hidden">
                  {/* Buscador */}
                  <div className="sticky top-0 bg-white border-b p-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        placeholder="Buscar modelo..."
                        className="pl-8 h-8 text-sm"
                        autoFocus
                      />
                    </div>
                  </div>
                  {/* Lista agrupada por categoría */}
                  <div className="max-h-48 overflow-y-auto">
                    {filteredModels.length > 0 ? (
                      filteredModels.map((m) => (
                        <button
                          key={m.modelo}
                          type="button"
                          onClick={() => handleSelectModel(m.modelo)}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors flex items-center justify-between ${
                            m.modelo === modelo ? 'bg-blue-100 font-semibold text-blue-900' : 'text-gray-800'
                          }`}
                        >
                          <span>{m.modelo}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_COLORS[m.category].bg} ${CATEGORY_COLORS[m.category].text}`}>
                            {CATEGORY_EMOJIS[m.category]} {CATEGORY_LABELS[m.category]}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-sm text-gray-500">
                        No hay modelos registrados para {marca}
                      </div>
                    )}
                    {/* Opción "Otro modelo" */}
                    <button
                      type="button"
                      onClick={handleModelOtro}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50 border-t border-gray-200 text-orange-700 font-medium"
                    >
                      ✏️ Otro modelo (escribir manualmente)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Badge de categoría detectada */}
      {marca && modelo && detectedCat && (
        <div className={`flex items-center gap-2 p-2 rounded-lg border ${CATEGORY_COLORS[detectedCat].bg} ${CATEGORY_COLORS[detectedCat].border}`}>
          <span className="text-lg">{CATEGORY_EMOJIS[detectedCat]}</span>
          <span className={`text-sm font-semibold ${CATEGORY_COLORS[detectedCat].text}`}>
            Categoría: {CATEGORY_LABELS[detectedCat]}
          </span>
        </div>
      )}
      {marca && modelo && !detectedCat && (
        <div className="flex items-center gap-2 p-2 rounded-lg border bg-yellow-50 border-yellow-300">
          <span className="text-sm text-yellow-800">⚠️ Modelo no reconocido — selecciona servicio manualmente</span>
        </div>
      )}
    </div>
  )
}
