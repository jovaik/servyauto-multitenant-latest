
'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Calendar, Clock, User, Car, CreditCard, Trash2 } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Cita, EstadoCita, MetodoPago } from '@/lib/types'

interface EditarCitaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  cita: Cita
}

export function EditarCitaDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  cita 
}: EditarCitaDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  const [formData, setFormData] = useState({
    fecha: '',
    horaInicio: '',
    horaFin: '',
    box: '',
    estado: EstadoCita.PENDIENTE,
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
  const estados = Object.values(EstadoCita)
  const metodosPago = Object.values(MetodoPago)

  useEffect(() => {
    if (open && cita) {
      setFormData({
        fecha: format(new Date(cita.fecha), 'yyyy-MM-dd'),
        horaInicio: cita.horaInicio,
        horaFin: cita.horaFin,
        box: cita.box,
        estado: cita.estado,
        observaciones: cita.observaciones || '',
        metodoPago: cita.metodoPago || '',
      })
    }
  }, [open, cita])

  const getEstadoBadge = (estado: EstadoCita) => {
    const variants = {
      [EstadoCita.PENDIENTE]: 'default',
      [EstadoCita.CONFIRMADA]: 'secondary',
      [EstadoCita.EN_PROCESO]: 'default',
      [EstadoCita.COMPLETADA]: 'default',
      [EstadoCita.CANCELADA]: 'destructive',
      [EstadoCita.NO_SHOW]: 'destructive',
    } as const

    return (
      <Badge variant={variants[estado]}>
        {estado.replace('_', ' ')}
      </Badge>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)
    try {
      const response = await fetch(`/api/citas/${cita.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "¡Éxito!",
          description: "Cita actualizada correctamente",
        })
        onSuccess()
        onOpenChange(false)
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || 'Error al actualizar la cita',
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar la cita",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta cita?')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/citas/${cita.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: "¡Éxito!",
          description: "Cita eliminada correctamente",
        })
        onSuccess()
        onOpenChange(false)
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || 'Error al eliminar la cita',
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar la cita",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Editar Cita
          </DialogTitle>
          <DialogDescription>
            Modifica los detalles de la cita
          </DialogDescription>
        </DialogHeader>

        {/* Client and Vehicle Info */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex items-center">
            <User className="mr-2 h-4 w-4 text-gray-600" />
            <span className="font-medium">
              {cita?.cliente?.nombre} {cita?.cliente?.apellido}
            </span>
          </div>
          <div className="flex items-center">
            <Car className="mr-2 h-4 w-4 text-gray-600" />
            <span>
              {cita?.vehiculo?.marca} {cita?.vehiculo?.modelo} - {cita?.vehiculo?.matricula}
            </span>
          </div>
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 text-gray-600" />
            <span>Estado actual: </span>
            <span className="ml-2">{getEstadoBadge(cita?.estado)}</span>
          </div>
          {cita?.total && (
            <div className="flex items-center">
              <CreditCard className="mr-2 h-4 w-4 text-gray-600" />
              <span>Total: €{cita.total.toFixed(2)}</span>
            </div>
          )}
        </div>

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
              <Select value={formData.horaFin || "hora-fin-placeholder"} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, horaFin: value === "hora-fin-placeholder" ? "" : value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Hora fin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hora-fin-placeholder" disabled>Selecciona hora fin</SelectItem>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estado */}
          <div className="space-y-2">
            <Label>Estado de la cita</Label>
            <Select value={formData.estado || "estado-placeholder"} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, estado: value === "estado-placeholder" ? EstadoCita.PENDIENTE : value as EstadoCita }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Estado de la cita" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="estado-placeholder" disabled>Selecciona estado</SelectItem>
                {estados.map((estado) => (
                  <SelectItem key={estado} value={estado}>
                    {estado.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <DialogFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleting}
              className="mr-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
            
            <div className="space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Actualizando...' : 'Actualizar Cita'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
