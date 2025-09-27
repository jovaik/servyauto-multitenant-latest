
'use client'

import React, { useState, useEffect } from 'react'
import { Car, User, Plus, Calendar, Wrench } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Vehiculo {
  id: string
  marca: string
  modelo: string
  anio: number
  color?: string
  matricula: string
  kilometraje?: number
  motor?: string
  combustible?: string
  observaciones?: string
  cliente?: {
    id: string
    nombre: string
    apellido: string
    telefono: string
  }
  createdAt: Date
}

export function VehiculosView() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVehiculos()
  }, [])

  const loadVehiculos = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/vehiculos')
      
      if (response.ok) {
        const data = await response.json()
        setVehiculos(data || [])
      }
    } catch (error) {
      console.error('Error loading vehicles:', error)
    } finally {
      setLoading(false)
    }
  }

  const getVehiculosByMarca = () => {
    const marcas = vehiculos?.reduce((acc, vehiculo) => {
      acc[vehiculo.marca] = (acc[vehiculo.marca] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    return Object.entries(marcas).sort(([,a], [,b]) => b - a)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehículos</h1>
          <p className="text-gray-600">
            Gestiona la información de todos los vehículos registrados
          </p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => alert('Funcionalidad de Nuevo Vehículo - En desarrollo')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Vehículo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Vehículos</p>
                <p className="text-3xl font-bold">{vehiculos?.length || 0}</p>
              </div>
              <Car className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Marcas Diferentes</p>
                <p className="text-3xl font-bold">
                  {new Set(vehiculos?.map(v => v.marca)).size || 0}
                </p>
              </div>
              <Wrench className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Año Promedio</p>
                <p className="text-3xl font-bold">
                  {vehiculos?.length > 0 
                    ? Math.round(vehiculos.reduce((sum, v) => sum + v.anio, 0) / vehiculos.length)
                    : 0
                  }
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Km Promedio</p>
                <p className="text-3xl font-bold">
                  {vehiculos?.length > 0 
                    ? Math.round(vehiculos.reduce((sum, v) => sum + (v.kilometraje || 0), 0) / vehiculos.length).toLocaleString()
                    : '0'
                  }
                </p>
              </div>
              <Car className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Brands */}
      {vehiculos?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Marcas Más Comunes</CardTitle>
            <CardDescription>
              Distribución por marcas de vehículos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {getVehiculosByMarca().map(([marca, count]) => (
                <Badge key={marca} variant="secondary" className="text-sm">
                  {marca}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicles List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Car className="mr-2 h-5 w-5" />
            Lista de Vehículos
          </CardTitle>
          <CardDescription>
            {vehiculos?.length || 0} vehículos registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Cargando vehículos...</p>
            </div>
          ) : vehiculos?.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vehiculos.map((vehiculo) => (
                <div 
                  key={vehiculo.id} 
                  className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Car className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {vehiculo.marca} {vehiculo.modelo}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {vehiculo.matricula}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {vehiculo.anio}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    {vehiculo.color && (
                      <div>
                        <strong>Color:</strong> {vehiculo.color}
                      </div>
                    )}
                    {vehiculo.kilometraje && (
                      <div>
                        <strong>Kilometraje:</strong> {vehiculo.kilometraje.toLocaleString()} km
                      </div>
                    )}
                    {vehiculo.motor && (
                      <div>
                        <strong>Motor:</strong> {vehiculo.motor}
                      </div>
                    )}
                    {vehiculo.combustible && (
                      <div>
                        <strong>Combustible:</strong> {vehiculo.combustible}
                      </div>
                    )}
                    {vehiculo.cliente && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex items-center text-blue-600">
                          <User className="mr-1 h-3 w-3" />
                          <strong>Propietario:</strong> {vehiculo.cliente.nombre} {vehiculo.cliente.apellido}
                        </div>
                      </div>
                    )}
                    {vehiculo.observaciones && (
                      <div className="pt-2">
                        <strong>Observaciones:</strong> {vehiculo.observaciones}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Car className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No hay vehículos registrados aún</p>
              <p className="text-sm mt-2">
                Los vehículos se registran junto con los clientes al programar citas
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
