
'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, Clock, User, Car, CreditCard } from 'lucide-react'
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
}

export function NuevaCitaDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  selectedDate 
}: NuevaCitaDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  
  const [formData, setFormData] = useState({
    fecha: format(selectedDate, 'yyyy-MM-dd'),
    horaInicio: '',
    horaFin: '',
    box: '',
    clienteId: '',
    vehiculoId: '',
    servicios: [] as string[],
    observaciones: '',
    metodoPago: '',
  })

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00'
  ]

  const boxes = ['Box 1', 'Box 2', 'Box 3']
  const metodosPago = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA']

  useEffect(() => {
    if (open) {
      loadClientes()
      loadServicios()
      setFormData(prev => ({ 
        ...prev, 
        fecha: format(selectedDate, 'yyyy-MM-dd') 
      }))
    }
  }, [open, selectedDate])

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
  }, [formData.horaInicio, formData.servicios])

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
      horaInicio: '',
      horaFin: '',
      box: '',
      clienteId: '',
      vehiculoId: '',
      servicios: [],
      observaciones: '',
      metodoPago: '',
    })
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Nueva Cita
          </DialogTitle>
          <DialogDescription>
            Programa una nueva cita para el {format(selectedDate, "d 'de' MMMM", { locale: es })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fecha y Horario */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="box">Box</Label>
              <Select value={formData.box || "box-placeholder"} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, box: value === "box-placeholder" ? "" : value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un box" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="box-placeholder" disabled>Selecciona un box</SelectItem>
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
              <Label htmlFor="horaInicio">Hora inicio</Label>
              <Select value={formData.horaInicio || "hora-placeholder"} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, horaInicio: value === "hora-placeholder" ? "" : value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Hora inicio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hora-placeholder" disabled>Selecciona hora</SelectItem>
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

          {/* Cliente y Vehículo */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={formData.clienteId || "cliente-placeholder"} onValueChange={(value) => 
                setFormData(prev => ({ 
                  ...prev, 
                  clienteId: value === "cliente-placeholder" ? "" : value, 
                  vehiculoId: "" 
                }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente-placeholder" disabled>Selecciona un cliente</SelectItem>
                  {clientes?.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      <div className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        {cliente.nombre} {cliente.apellido}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vehículo</Label>
              <Select value={formData.vehiculoId || "vehiculo-placeholder"} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, vehiculoId: value === "vehiculo-placeholder" ? "" : value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un vehículo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vehiculo-placeholder" disabled>Selecciona un vehículo</SelectItem>
                  {getClienteVehiculos()?.map((vehiculo) => (
                    <SelectItem key={vehiculo.id} value={vehiculo.id}>
                      <div className="flex items-center">
                        <Car className="mr-2 h-4 w-4" />
                        {vehiculo.marca} {vehiculo.modelo} - {vehiculo.matricula}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Método de Pago */}
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select value={formData.metodoPago || "pago-placeholder"} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, metodoPago: value === "pago-placeholder" ? "" : value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pago-placeholder" disabled>Selecciona método</SelectItem>
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
