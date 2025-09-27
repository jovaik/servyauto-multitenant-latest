
'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, Clock, User, Car, CreditCard, Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Cliente {
  id: string
  nombre: string
  apellido: string
  email?: string
  telefono: string
  vehiculos: Vehiculo[]
}

interface Vehiculo {
  id: string
  marca: string
  modelo: string
  matricula: string
  anio: number
  clienteId: string
}

interface Servicio {
  id: string
  nombre: string
  precio: number
  duracion: number
}

interface NuevaCitaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  selectedDate: Date
  preselectedSlot?: {time: string, box: string} | null
}

export function NuevaCitaDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  selectedDate,
  preselectedSlot 
}: NuevaCitaDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [showNewVehiculo, setShowNewVehiculo] = useState(false)
  const [boxes, setBoxes] = useState(['Box 1', 'Box 2', 'Box 3'])
  
  const [formData, setFormData] = useState({
    fecha: format(selectedDate, 'yyyy-MM-dd'),
    horaInicio: preselectedSlot?.time || '',
    horaFin: '',
    box: preselectedSlot?.box || '',
    clienteId: '',
    vehiculoId: '',
    servicios: [] as string[],
    observaciones: '',
    metodoPago: '',
  })

  // Nuevo vehículo para cliente existente
  const [newVehiculo, setNewVehiculo] = useState({
    marca: '',
    modelo: '',
    matricula: '',
    anio: new Date().getFullYear()
  })

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00'
  ]

  const metodosPago = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA']

  useEffect(() => {
    if (open) {
      loadClientes()
      loadServicios()
      loadBoxes()
      setFormData(prev => ({ 
        ...prev, 
        fecha: format(selectedDate, 'yyyy-MM-dd'),
        horaInicio: preselectedSlot?.time || '',
        box: preselectedSlot?.box || ''
      }))
    }
  }, [open, selectedDate, preselectedSlot])

  const loadBoxes = async () => {
    try {
      const response = await fetch('/api/configuracion')
      if (response.ok) {
        const configs = await response.json()
        const boxesConfig = configs?.find((c: any) => c.clave === 'boxes.nombres')
        if (boxesConfig) {
          const boxNames = JSON.parse(boxesConfig.valor)
          setBoxes(boxNames)
        }
      }
    } catch (error) {
      console.error('Error loading boxes:', error)
    }
  }

  const loadClientes = async () => {
    try {
      const response = await fetch('/api/clientes')
      if (response.ok) {
        const data = await response.json()
        setClientes(data || [])
      }
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  const loadServicios = async () => {
    try {
      const response = await fetch('/api/servicios')
      if (response.ok) {
        const data = await response.json()
        setServicios(data || [])
      }
    } catch (error) {
      console.error('Error loading services:', error)
    }
  }

  const getClienteVehiculos = () => {
    const cliente = clientes?.find(c => c.id === formData.clienteId)
    return cliente?.vehiculos || []
  }

  const addNewVehiculo = async () => {
    if (!formData.clienteId || !newVehiculo.marca || !newVehiculo.modelo || !newVehiculo.matricula) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos del vehículo",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/vehiculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newVehiculo,
          clienteId: formData.clienteId
        })
      })

      if (response.ok) {
        const vehiculo = await response.json()
        // Refresh clientes to get updated vehicle list
        await loadClientes()
        setFormData(prev => ({ ...prev, vehiculoId: vehiculo.id }))
        setShowNewVehiculo(false)
        setNewVehiculo({
          marca: '',
          modelo: '',
          matricula: '',
          anio: new Date().getFullYear()
        })
        toast({
          title: "¡Éxito!",
          description: "Vehículo agregado correctamente",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al agregar vehículo",
        variant: "destructive",
      })
    }
  }

  const calculateEndTime = (startTime: string, servicioIds: string[]) => {
    if (!startTime || servicioIds.length === 0) return ''
    
    const totalDuration = servicioIds.reduce((total, servicioId) => {
      const servicio = servicios?.find((s: Servicio) => s.id === servicioId)
      return total + (servicio?.duracion || 0)
    }, 0)
    
    const [hours, minutes] = startTime.split(':').map(Number)
    const startMinutes = hours * 60 + minutes
    const endMinutes = startMinutes + totalDuration
    const endHours = Math.floor(endMinutes / 60)
    const endMins = endMinutes % 60
    
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    if (formData.horaInicio && formData.servicios.length > 0) {
      const endTime = calculateEndTime(formData.horaInicio, formData.servicios)
      setFormData(prev => ({ ...prev, horaFin: endTime }))
    }
  }, [formData.horaInicio, formData.servicios, servicios])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fecha || !formData.horaInicio || !formData.horaFin || 
        !formData.box || !formData.clienteId || !formData.vehiculoId) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...formData,
        servicios: formData.servicios.map(servicioId => ({
          servicioId,
          precio: servicios?.find(s => s.id === servicioId)?.precio || 0
        }))
      }

      const response = await fetch('/api/citas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: "¡Éxito!",
          description: "Cita creada correctamente",
        })
        onSuccess()
        resetForm()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || 'Error al crear la cita',
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al crear la cita",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      fecha: format(selectedDate, 'yyyy-MM-dd'),
      horaInicio: preselectedSlot?.time || '',
      horaFin: '',
      box: preselectedSlot?.box || '',
      clienteId: '',
      vehiculoId: '',
      servicios: [],
      observaciones: '',
      metodoPago: '',
    })
    setNewVehiculo({
      marca: '',
      modelo: '',
      matricula: '',
      anio: new Date().getFullYear()
    })
    setShowNewVehiculo(false)
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Nueva Cita
            {preselectedSlot && (
              <span className="ml-2 text-sm font-normal text-blue-600">
                ({preselectedSlot.box} - {preselectedSlot.time})
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {preselectedSlot 
              ? `Reservando cita para el ${format(selectedDate, "d 'de' MMMM", { locale: es })} a las ${preselectedSlot.time} en ${preselectedSlot.box}`
              : `Programa una nueva cita para el ${format(selectedDate, "d 'de' MMMM", { locale: es })}`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fecha y Horario */}
          <Card className={preselectedSlot ? "bg-blue-50 border-blue-200" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                Fecha y Horario {preselectedSlot && "(Preseleccionado)"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha *</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="box">Box *</Label>
                  <Select value={formData.box || ""} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, box: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un box" />
                    </SelectTrigger>
                    <SelectContent>
                      {boxes.map((box) => (
                        <SelectItem key={box} value={box}>
                          {box}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horaInicio">Hora inicio *</Label>
                  <Select value={formData.horaInicio || ""} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, horaInicio: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Hora inicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horaFin">Hora fin</Label>
                  <Input
                    id="horaFin"
                    value={formData.horaFin}
                    placeholder="Se calculará automáticamente"
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cliente y Vehículo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center">
                <User className="mr-2 h-4 w-4" />
                Cliente y Vehículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={formData.clienteId || ""} onValueChange={(value) => 
                  setFormData(prev => ({ 
                    ...prev, 
                    clienteId: value, 
                    vehiculoId: "" 
                  }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes?.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        <div className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          {cliente.nombre} {cliente.apellido} - {cliente.telefono}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Vehículo *</Label>
                  {formData.clienteId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowNewVehiculo(!showNewVehiculo)}
                    >
                      <Settings className="mr-1 h-3 w-3" />
                      {showNewVehiculo ? 'Cancelar' : 'Nuevo Vehículo'}
                    </Button>
                  )}
                </div>
                
                {!showNewVehiculo ? (
                  <Select value={formData.vehiculoId || ""} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, vehiculoId: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder={formData.clienteId ? "Selecciona un vehículo" : "Primero selecciona un cliente"} />
                    </SelectTrigger>
                    <SelectContent>
                      {getClienteVehiculos()?.map((vehiculo) => (
                        <SelectItem key={vehiculo.id} value={vehiculo.id}>
                          <div className="flex items-center">
                            <Car className="mr-2 h-4 w-4" />
                            <div className="flex flex-col">
                              <span>{vehiculo.marca} {vehiculo.modelo}</span>
                              <span className="text-xs text-gray-500">{vehiculo.matricula}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Marca *</Label>
                        <Input
                          value={newVehiculo.marca}
                          onChange={(e) => setNewVehiculo(prev => ({ ...prev, marca: e.target.value }))}
                          placeholder="Ej: Ford, Toyota, BMW"
                          required
                        />
                      </div>
                      <div>
                        <Label>Modelo *</Label>
                        <Input
                          value={newVehiculo.modelo}
                          onChange={(e) => setNewVehiculo(prev => ({ ...prev, modelo: e.target.value }))}
                          placeholder="Ej: Focus, Corolla, X3"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Matrícula *</Label>
                        <Input
                          value={newVehiculo.matricula}
                          onChange={(e) => setNewVehiculo(prev => ({ ...prev, matricula: e.target.value.toUpperCase() }))}
                          placeholder="1234ABC"
                          required
                        />
                      </div>
                      <div>
                        <Label>Año</Label>
                        <Input
                          type="number"
                          value={newVehiculo.anio}
                          onChange={(e) => setNewVehiculo(prev => ({ ...prev, anio: parseInt(e.target.value) }))}
                          min="1980"
                          max={new Date().getFullYear() + 1}
                        />
                      </div>
                    </div>
                    <Button type="button" onClick={addNewVehiculo} size="sm" className="w-full">
                      Agregar Vehículo
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Servicios */}
          <div className="space-y-2">
            <Label>Servicios</Label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3">
              {servicios?.map((servicio) => (
                <label key={servicio.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.servicios.includes(servicio.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({ 
                          ...prev, 
                          servicios: [...prev.servicios, servicio.id] 
                        }))
                      } else {
                        setFormData(prev => ({ 
                          ...prev, 
                          servicios: prev.servicios.filter(s => s !== servicio.id) 
                        }))
                      }
                    }}
                  />
                  <span className="text-sm">
                    {servicio.nombre} (€{servicio.precio} - {servicio.duracion}min)
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Método de Pago */}
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select value={formData.metodoPago || ""} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, metodoPago: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona método de pago" />
              </SelectTrigger>
              <SelectContent>
                {metodosPago.map((metodo) => (
                  <SelectItem key={metodo} value={metodo}>
                    <div className="flex items-center">
                      <CreditCard className="mr-2 h-4 w-4" />
                      {metodo}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              placeholder="Observaciones adicionales..."
              value={formData.observaciones}
              onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Cita'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
