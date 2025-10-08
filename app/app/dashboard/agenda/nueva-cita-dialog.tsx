
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
  const [showNewCliente, setShowNewCliente] = useState(false)
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

  // Nuevo cliente
  const [newCliente, setNewCliente] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    documento: ''
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

  const metodosPago = ['EFECTIVO', 'TARJETA_SUMUP', 'TPV_UNICAJA']

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
    const vehiculos = cliente?.vehiculos || []
    
    // Debug: log para ayudar a diagnosticar el problema
    if (formData.clienteId && vehiculos.length === 0) {
      console.log('Cliente seleccionado sin vehículos:', {
        clienteId: formData.clienteId,
        clienteNombre: cliente?.nombre + ' ' + cliente?.apellido,
        totalVehiculos: vehiculos.length
      })
    }
    
    return vehiculos
  }

  // Efecto para limpiar vehículo seleccionado cuando cambia el cliente
  useEffect(() => {
    if (formData.clienteId) {
      const vehiculosDisponibles = getClienteVehiculos()
      if (vehiculosDisponibles.length === 0) {
        setFormData(prev => ({ ...prev, vehiculoId: '' }))
      } else if (formData.vehiculoId && !vehiculosDisponibles.find(v => v.id === formData.vehiculoId)) {
        // Si el vehículo seleccionado no pertenece al nuevo cliente, limpiar selección
        setFormData(prev => ({ ...prev, vehiculoId: '' }))
      }
    }
  }, [formData.clienteId, clientes])

  const addNewCliente = async () => {
    if (!newCliente.nombre || !newCliente.apellido || !newCliente.telefono) {
      toast({
        title: "Error",
        description: "Por favor completa al menos: nombre, apellido y teléfono",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCliente)
      })

      const data = await response.json()

      if (response.ok) {
        await loadClientes()
        setFormData(prev => ({ ...prev, clienteId: data.id, vehiculoId: '' }))
        setShowNewCliente(false)
        setNewCliente({
          nombre: '',
          apellido: '',
          email: '',
          telefono: '',
          documento: ''
        })
        toast({
          title: "¡Éxito!",
          description: "Cliente agregado correctamente. Ahora puedes agregar su vehículo.",
        })
        // Automáticamente mostrar el formulario de vehículo
        setShowNewVehiculo(true)
      } else {
        console.error('Error creating client:', data)
        toast({
          title: "Error al crear cliente",
          description: data.error || "Error desconocido. Ver consola para detalles.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating client:', error)
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
      })
    }
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
      const payload = {
        ...newVehiculo,
        clienteId: formData.clienteId,
        anio: newVehiculo.anio || new Date().getFullYear()
      }

      console.log('Enviando vehículo:', payload)

      const response = await fetch('/api/vehiculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh clientes to get updated vehicle list
        await loadClientes()
        setFormData(prev => ({ ...prev, vehiculoId: data.id }))
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
      } else {
        console.error('Error creating vehicle:', data)
        toast({
          title: "Error al crear vehículo",
          description: data.error || "Error desconocido. Ver consola para detalles.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating vehicle:', error)
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
      })
    }
  }



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validación mejorada con mensajes específicos
    const camposFaltantes = []
    if (!formData.fecha) camposFaltantes.push("Fecha")
    if (!formData.horaInicio) camposFaltantes.push("Hora de inicio")
    if (!formData.horaFin) camposFaltantes.push("Hora de recogida")
    if (!formData.box) camposFaltantes.push("Box")
    if (!formData.clienteId) camposFaltantes.push("Cliente")
    if (!formData.vehiculoId) camposFaltantes.push("Vehículo")
    
    if (camposFaltantes.length > 0) {
      toast({
        title: "Faltan campos requeridos",
        description: `Por favor completa: ${camposFaltantes.join(', ')}`,
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
    setNewCliente({
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      documento: ''
    })
    setNewVehiculo({
      marca: '',
      modelo: '',
      matricula: '',
      anio: new Date().getFullYear()
    })
    setShowNewCliente(false)
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
                  <Label htmlFor="horaFin">Hora de recogida *</Label>
                  <Select value={formData.horaFin || ""} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, horaFin: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona hora de recogida" />
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
                <div className="flex items-center justify-between">
                  <Label>Cliente *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowNewCliente(!showNewCliente)
                      if (showNewCliente) {
                        // Si cerramos el formulario de cliente, también cerrar el de vehículo
                        setShowNewVehiculo(false)
                      }
                    }}
                  >
                    <User className="mr-1 h-3 w-3" />
                    {showNewCliente ? 'Cancelar' : 'Nuevo Cliente'}
                  </Button>
                </div>
                
                {!showNewCliente ? (
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
                ) : (
                  <div className="border rounded-lg p-4 space-y-3 bg-blue-50 border-blue-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Nombre *</Label>
                        <Input
                          value={newCliente.nombre}
                          onChange={(e) => setNewCliente(prev => ({ ...prev, nombre: e.target.value }))}
                          placeholder="Nombre"
                          required
                        />
                      </div>
                      <div>
                        <Label>Apellido *</Label>
                        <Input
                          value={newCliente.apellido}
                          onChange={(e) => setNewCliente(prev => ({ ...prev, apellido: e.target.value }))}
                          placeholder="Apellido"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Teléfono *</Label>
                        <Input
                          value={newCliente.telefono}
                          onChange={(e) => setNewCliente(prev => ({ ...prev, telefono: e.target.value }))}
                          placeholder="612345678"
                          required
                        />
                      </div>
                      <div>
                        <Label>Documento (DNI/NIE/CIF)</Label>
                        <Input
                          value={newCliente.documento}
                          onChange={(e) => setNewCliente(prev => ({ ...prev, documento: e.target.value.toUpperCase() }))}
                          placeholder="12345678A"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newCliente.email}
                        onChange={(e) => setNewCliente(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="cliente@email.com"
                      />
                    </div>
                    <Button type="button" onClick={addNewCliente} size="sm" className="w-full">
                      Agregar Cliente y Continuar
                    </Button>
                  </div>
                )}
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
                  <>
                    <Select value={formData.vehiculoId || ""} onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, vehiculoId: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !formData.clienteId 
                            ? "Primero selecciona un cliente" 
                            : getClienteVehiculos().length === 0 
                              ? "Este cliente no tiene vehículos registrados"
                              : "Selecciona un vehículo"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {getClienteVehiculos().length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            <Car className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                            <p className="text-sm">Sin vehículos registrados</p>
                            <p className="text-xs">Usa el botón "Nuevo Vehículo" para agregar uno</p>
                          </div>
                        ) : (
                          getClienteVehiculos().map((vehiculo) => (
                            <SelectItem key={vehiculo.id} value={vehiculo.id}>
                              <div className="flex items-center">
                                <Car className="mr-2 h-4 w-4" />
                                <div className="flex flex-col">
                                  <span>{vehiculo.marca} {vehiculo.modelo}</span>
                                  <span className="text-xs text-gray-500">{vehiculo.matricula}</span>
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {formData.clienteId && getClienteVehiculos().length === 0 && (
                      <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                        ⚠️ Este cliente no tiene vehículos. Haz clic en "Nuevo Vehículo" para agregar uno.
                      </div>
                    )}
                  </>
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
                <SelectItem value="EFECTIVO">
                  <div className="flex items-center">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Efectivo
                  </div>
                </SelectItem>
                <SelectItem value="TARJETA_SUMUP">
                  <div className="flex items-center">
                    <CreditCard className="mr-2 h-4 w-4" />
                    TPV SUMUP
                  </div>
                </SelectItem>
                <SelectItem value="TPV_UNICAJA">
                  <div className="flex items-center">
                    <CreditCard className="mr-2 h-4 w-4" />
                    TPV UNICAJA
                  </div>
                </SelectItem>
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
