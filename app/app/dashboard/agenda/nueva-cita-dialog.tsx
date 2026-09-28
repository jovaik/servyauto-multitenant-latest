
'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, Clock, User, Car, CreditCard, Settings, ToggleLeft, ToggleRight } from 'lucide-react'
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
import { VehicleBrandModelSelector } from '@/components/vehicle-brand-model-selector'
import { getSelectedLocalId } from '@/lib/local-store'
import { 
  detectVehicleCategory, 
  getVehicleCategoryInfo, 
  filterServicesByCategory,
  CATEGORY_LABELS,
  CATEGORY_EMOJIS,
  CATEGORY_COLORS,
  type VehicleCategory 
} from '@/lib/vehicle-categories'

interface Cliente {
  id: string
  nombre: string
  apellido: string
  email?: string
  telefono: string
  clienteParking: boolean
  clienteVIP: boolean
  clienteEmpresa: boolean
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
  onDepositoRequest?: (data: {
    clienteName: string
    telefono: string
    whatsappUrl: string
    smsUrl: string
  }) => void
  onConfirmacionICSRequest?: (data: {
    clienteName: string
    telefono: string
    whatsappUrl: string
    smsUrl: string
    icsUrl: string
    mensaje: string
  }) => void
}

export function NuevaCitaDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  selectedDate,
  preselectedSlot,
  onDepositoRequest,
  onConfirmacionICSRequest
}: NuevaCitaDialogProps) {
  const { data: session } = useSession() || {}
  const isSuperAdmin = (session?.user as any)?.role === 'SUPER_ADMIN'
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [showNewVehiculo, setShowNewVehiculo] = useState(false)
  const [showNewCliente, setShowNewCliente] = useState(false)
  const [boxes, setBoxes] = useState(['Box 1', 'Box 2', 'Box 3'])
  const [descuentoParking, setDescuentoParking] = useState<{ valor: number, tipo: string }>({ valor: 0, tipo: 'FIJO' })
  const [descuentoVIP, setDescuentoVIP] = useState<{ valor: number, tipo: string }>({ valor: 0, tipo: 'PORCENTAJE' })
  const [descuentoEmpresa, setDescuentoEmpresa] = useState<{ valor: number, tipo: string }>({ valor: 0, tipo: 'PORCENTAJE' })
  const [descuentoManual, setDescuentoManual] = useState<number>(0) // Descuento manual en euros
  const [ticketsDisponibles, setTicketsDisponibles] = useState(0)
  
  const [formData, setFormData] = useState({
    fecha: format(selectedDate, 'yyyy-MM-dd'),
    horaInicio: preselectedSlot?.time || '',
    horaFin: '',
    box: preselectedSlot?.box || '',
    clienteId: '',
    vehiculoId: '',
    servicios: [] as string[],
    ticketsUsados: 0,
    observaciones: '',
    metodoPago: '',
    prescriptorId: '',
    realizadoPorId: '',
  })
  
  // Guardar info del cliente seleccionado para evitar problemas de sincronización
  const [clienteSeleccionadoInfo, setClienteSeleccionadoInfo] = useState<{ 
    clienteParking: boolean, 
    clienteVIP: boolean, 
    clienteEmpresa: boolean 
  } | null>(null)

  // Categoría de vehículo auto-detectada
  const [categoriaVehiculo, setCategoriaVehiculo] = useState<VehicleCategory | null>(null)
  const [modoManualServicios, setModoManualServicios] = useState(false)

  // Overrides por local
  const [categoriaOverrides, setCategoriaOverrides] = useState<{ marca: string; modelo: string; categoria: string }[]>([])
  const [precioOverrides, setPrecioOverrides] = useState<{ servicioId: string; precio: number }[]>([])

  // Colaboradores del local
  const [colaboradores, setColaboradores] = useState<{ id: string; nombre: string; rol: string }[]>([])

  // Autocomplete de matrícula
  const [matriculaBusqueda, setMatriculaBusqueda] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState<any[]>([])
  const [buscandoMatricula, setBuscandoMatricula] = useState(false)
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null)

  // Nuevo cliente
  const [newCliente, setNewCliente] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    documento: '',
    clienteParking: false,
    clienteVIP: false,
    clienteEmpresa: false
  })

  // Nuevo vehículo para cliente existente
  const [newVehiculo, setNewVehiculo] = useState({
    marca: '',
    modelo: '',
    matricula: '',
    anio: new Date().getFullYear()
  })

  // Franjas horarias removidas - ahora se usa input type="time" para mayor flexibilidad

  const metodosPago = ['EFECTIVO', 'TPV_SUMUP', 'TPV_UNICAJA']

  const loadOverridesLocal = async () => {
    try {
      const localId = getSelectedLocalId()
      if (!localId) { setCategoriaOverrides([]); setPrecioOverrides([]); return }
      const res = await fetch(`/api/overrides-local?localId=${localId}`)
      if (res.ok) {
        const data = await res.json()
        setCategoriaOverrides((data.categoriaOverrides || []).map((o: any) => ({ marca: o.marca, modelo: o.modelo, categoria: o.categoria })))
        setPrecioOverrides((data.precioOverrides || []).map((o: any) => ({ servicioId: o.servicioId, precio: o.precio })))
      }
    } catch (e) { console.error('Error cargando overrides:', e) }
  }

  // Helper: detectar categoría considerando overrides del local
  const detectCategoryWithOverrides = (marca: string, modelo: string): VehicleCategory | null => {
    const m = marca.toUpperCase().trim()
    const md = modelo.toUpperCase().trim()
    const override = categoriaOverrides.find(o => o.marca === m && o.modelo === md)
    if (override) return override.categoria as VehicleCategory
    return detectVehicleCategory(marca, modelo)
  }

  // Helper: obtener precio efectivo (con override local si existe)
  const getPrecioEfectivo = (servicioId: string): number => {
    const po = precioOverrides.find(o => o.servicioId === servicioId)
    if (po) return po.precio
    return servicios?.find(s => s.id === servicioId)?.precio || 0
  }

  useEffect(() => {
    if (open) {
      loadClientes()
      loadServicios()
      loadBoxes()
      loadDescuentos()
      loadTicketsDisponibles()
      loadOverridesLocal()
      // Cargar colaboradores del local (o todos si no hay local seleccionado)
      const localId = getSelectedLocalId()
      const colabUrl = localId ? `/api/colaboradores?localId=${localId}&activo=true` : `/api/colaboradores?activo=true`
      fetch(colabUrl).then(r => r.ok ? r.json() : []).then(setColaboradores).catch(() => {})
      setFormData(prev => ({ 
        ...prev, 
        fecha: format(selectedDate, 'yyyy-MM-dd'),
        horaInicio: preselectedSlot?.time || '',
        box: preselectedSlot?.box || ''
      }))
    }
  }, [open, selectedDate, preselectedSlot])

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout)
      }
    }
  }, [debounceTimeout])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.autocomplete-container')) {
        setMostrarResultados(false)
      }
    }

    if (mostrarResultados) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mostrarResultados])

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

  const loadDescuentos = async () => {
    try {
      const response = await fetch('/api/configuracion')
      if (response.ok) {
        const configs = await response.json()
        
        // Descuento Parking
        const descuentoParkingConfig = configs?.find((c: any) => c.clave === 'precios.descuentoParking')
        const tipoParkingConfig = configs?.find((c: any) => c.clave === 'precios.descuentoParkingTipo')
        if (descuentoParkingConfig) {
          setDescuentoParking({
            valor: parseFloat(descuentoParkingConfig.valor) || 0,
            tipo: tipoParkingConfig?.valor || 'FIJO'
          })
        }
        
        // Descuento VIP
        const descuentoVIPConfig = configs?.find((c: any) => c.clave === 'precios.descuentoVIP')
        const tipoVIPConfig = configs?.find((c: any) => c.clave === 'precios.descuentoVIPTipo')
        if (descuentoVIPConfig) {
          setDescuentoVIP({
            valor: parseFloat(descuentoVIPConfig.valor) || 0,
            tipo: tipoVIPConfig?.valor || 'PORCENTAJE'
          })
        }
        
        // Descuento Empresa
        const descuentoEmpresaConfig = configs?.find((c: any) => c.clave === 'precios.descuentoEmpresa')
        const tipoEmpresaConfig = configs?.find((c: any) => c.clave === 'precios.descuentoEmpresaTipo')
        if (descuentoEmpresaConfig) {
          setDescuentoEmpresa({
            valor: parseFloat(descuentoEmpresaConfig.valor) || 0,
            tipo: tipoEmpresaConfig?.valor || 'PORCENTAJE'
          })
        }
      }
    } catch (error) {
      console.error('Error loading descuentos:', error)
    }
  }

  const loadTicketsDisponibles = async () => {
    try {
      const response = await fetch('/api/tickets')
      if (response.ok) {
        const data = await response.json()
        setTicketsDisponibles(data.saldoActual || 0)
      }
    } catch (error) {
      console.error('Error loading tickets:', error)
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

  // Búsqueda en tiempo real con debounce
  const buscarMatriculaAutocomplete = async (query: string) => {
    if (!query || query.length < 2) {
      setResultadosBusqueda([])
      setMostrarResultados(false)
      return
    }

    setBuscandoMatricula(true)
    try {
      const response = await fetch(`/api/vehiculos/buscar?q=${encodeURIComponent(query)}`)
      
      if (response.ok) {
        const data = await response.json()
        setResultadosBusqueda(data.vehiculos || [])
        setMostrarResultados(true)
      }
    } catch (error) {
      console.error('Error buscando vehículos:', error)
    } finally {
      setBuscandoMatricula(false)
    }
  }

  // Handler para el input con debounce
  const handleMatriculaChange = (value: string) => {
    setMatriculaBusqueda(value)
    
    // Cancelar timeout anterior
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }
    
    // Crear nuevo timeout
    const timeout = setTimeout(() => {
      buscarMatriculaAutocomplete(value)
    }, 300) // 300ms de delay
    
    setDebounceTimeout(timeout)
  }

  // Seleccionar un vehículo del autocomplete
  const seleccionarVehiculo = async (vehiculo: any) => {
    console.log('✅ Vehículo seleccionado:', vehiculo)
    
    // Actualizar lista de clientes si no existe
    const clienteExiste = clientes.find(c => c.id === vehiculo.cliente.id)
    if (!clienteExiste) {
      await loadClientes()
    }
    
    // Seleccionar automáticamente cliente y vehículo
    setFormData(prev => ({
      ...prev,
      clienteId: vehiculo.cliente.id,
      vehiculoId: vehiculo.id,
      servicios: [], // Reset servicios al cambiar vehículo
    }))
    
    setClienteSeleccionadoInfo({ 
      clienteParking: vehiculo.cliente.clienteParking || false,
      clienteVIP: vehiculo.cliente.clienteVIP || false,
      clienteEmpresa: vehiculo.cliente.clienteEmpresa || false
    })

    // Auto-detectar categoría del vehículo (con override local si existe)
    const cat = detectCategoryWithOverrides(vehiculo.marca, vehiculo.modelo)
    setCategoriaVehiculo(cat)
    setModoManualServicios(false)
    if (cat) {
      console.log(`🚗 Categoría detectada: ${vehiculo.marca} ${vehiculo.modelo} → ${CATEGORY_LABELS[cat]}`)
    }
    
    toast({
      title: "¡Vehículo seleccionado!",
      description: cat 
        ? `${vehiculo.marca} ${vehiculo.modelo} - ${vehiculo.matricula} → ${CATEGORY_EMOJIS[cat]} ${CATEGORY_LABELS[cat]}`
        : `${vehiculo.marca} ${vehiculo.modelo} - ${vehiculo.matricula}`
    })
    
    // Limpiar búsqueda y ocultar resultados
    setMatriculaBusqueda('')
    setResultadosBusqueda([])
    setMostrarResultados(false)
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
      
      // Actualizar info del cliente seleccionado para el cálculo de descuento
      const clienteActual = clientes?.find(c => c.id === formData.clienteId)
      if (clienteActual) {
        setClienteSeleccionadoInfo({ 
          clienteParking: clienteActual.clienteParking || false,
          clienteVIP: clienteActual.clienteVIP || false,
          clienteEmpresa: clienteActual.clienteEmpresa || false
        })
      }
    } else {
      setClienteSeleccionadoInfo(null)
    }
  }, [formData.clienteId, clientes])

  const addNewCliente = async () => {
    if (!newCliente.nombre || !newCliente.telefono) {
      toast({
        title: "Error",
        description: "Por favor completa al menos: nombre y teléfono",
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
        // Guardar info del cliente inmediatamente para aplicar descuento
        setClienteSeleccionadoInfo({ 
          clienteParking: newCliente.clienteParking,
          clienteVIP: newCliente.clienteVIP,
          clienteEmpresa: newCliente.clienteEmpresa
        })
        await loadClientes()
        setFormData(prev => ({ ...prev, clienteId: data.id, vehiculoId: '' }))
        setShowNewCliente(false)
        setNewCliente({
          nombre: '',
          apellido: '',
          email: '',
          telefono: '',
          documento: '',
          clienteParking: false,
          clienteVIP: false,
          clienteEmpresa: false
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
        descuentoManual: descuentoManual || 0,
        prescriptorId: formData.prescriptorId || null,
        realizadoPorId: formData.realizadoPorId || null,
        servicios: formData.servicios.map(servicioId => ({
          servicioId,
          precio: getPrecioEfectivo(servicioId)
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
        const data = await response.json()
        
        toast({
          title: "¡Éxito!",
          description: "Cita creada correctamente",
        })
        
        resetForm()
        
        // Verificar si hay diálogo de depósito o confirmación ICS que mostrar
        const hasDepositoDialog = !!(data.depositoData && data.depositoData.whatsappUrl && data.depositoData.smsUrl)
        const hasConfirmacionICSDialog = !!(data.confirmacionICSData && data.confirmacionICSData.icsUrl)
        
        // Si NO hay diálogos que mostrar, llamar a onSuccess inmediatamente y cerrar
        if (!hasDepositoDialog && !hasConfirmacionICSDialog) {
          onSuccess()
          onOpenChange(false)
          return
        }
        
        // Si HAY diálogos que mostrar, cerrar este dialog primero
        onOpenChange(false)
        
        // Si se generaron enlaces de confirmación de depósito (nueva cita)
        if (hasDepositoDialog) {
          const { clienteName, telefono, whatsappUrl, smsUrl } = data.depositoData
          
          console.log('✅ Datos de confirmación de depósito recibidos (nueva cita):', data.depositoData)
          
          // Usar callback para activar el dialog en el componente padre
          if (onDepositoRequest) {
            // Delay para asegurar que el dialog de crear se cierre completamente
            setTimeout(() => {
              console.log('🚗 Enviando solicitud de confirmación de depósito al componente padre...')
              onDepositoRequest({
                clienteName,
                telefono,
                whatsappUrl,
                smsUrl
              })
            }, 300)
          }
        }
        
        // Si se generó confirmación con ICS (nueva cita)
        if (hasConfirmacionICSDialog) {
          const { clienteName, telefono, whatsappUrl, smsUrl, icsUrl, mensaje } = data.confirmacionICSData
          
          console.log('✅ Datos de confirmación con ICS recibidos (nueva cita):', data.confirmacionICSData)
          
          // Usar callback para activar el dialog en el componente padre
          if (onConfirmacionICSRequest) {
            // Delay mayor si ya hay dialog de depósito, menor si no
            const delay = hasDepositoDialog ? 600 : 300
            setTimeout(() => {
              console.log('📅 Enviando solicitud de confirmación con ICS al componente padre...')
              onConfirmacionICSRequest({
                clienteName,
                telefono,
                whatsappUrl,
                smsUrl,
                icsUrl,
                mensaje
              })
            }, delay)
          }
        }
        
        // Llamar a onSuccess DESPUÉS de mostrar los diálogos
        const finalDelay = hasDepositoDialog && hasConfirmacionICSDialog ? 700 : 400
        setTimeout(() => {
          onSuccess()
        }, finalDelay)
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
      ticketsUsados: 0,
      observaciones: '',
      metodoPago: '',
      prescriptorId: '',
      realizadoPorId: '',
    })
    setClienteSeleccionadoInfo(null)
    setDescuentoManual(0)
    setNewCliente({
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      documento: '',
      clienteParking: false,
      clienteVIP: false,
      clienteEmpresa: false
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
                  <Label htmlFor="horaInicio">
                    Hora inicio * 
                    <span className="text-xs text-gray-500 ml-2">(Puedes escribir cualquier minuto)</span>
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="horaInicio"
                      type="time"
                      value={formData.horaInicio}
                      onChange={(e) => setFormData(prev => ({ ...prev, horaInicio: e.target.value }))}
                      className="pl-10"
                      required
                      min="06:00"
                      max="23:59"
                      step="60" // 60 segundos = permite cualquier minuto
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Ej: 10:10, 14:23, 16:45
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horaFin">
                    Hora de recogida * 
                    <span className="text-xs text-gray-500 ml-2">(Estimada)</span>
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="horaFin"
                      type="time"
                      value={formData.horaFin}
                      onChange={(e) => setFormData(prev => ({ ...prev, horaFin: e.target.value }))}
                      className="pl-10"
                      required
                      min="06:00"
                      max="23:59"
                      step="60"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Hora estimada de entrega al cliente
                  </p>
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
              {/* 🔍 Buscador Autocomplete de Matrícula */}
              <div className="space-y-2 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg relative autocomplete-container">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="h-5 w-5 text-blue-600" />
                  <Label className="text-base font-semibold text-blue-900">Búsqueda rápida</Label>
                </div>
                <p className="text-xs text-blue-700 mb-3">
                  Busca por matrícula, nombre del cliente o teléfono
                </p>
                <div className="relative autocomplete-container">
                  <Input
                    placeholder="Matrícula, nombre o teléfono..."
                    value={matriculaBusqueda}
                    onChange={(e) => handleMatriculaChange(e.target.value)}
                    onFocus={() => {
                      if (resultadosBusqueda.length > 0) {
                        setMostrarResultados(true)
                      }
                    }}
                    className="text-lg pr-10"
                  />
                  {buscandoMatricula && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                  )}
                  
                  {/* Dropdown de resultados */}
                  {mostrarResultados && resultadosBusqueda.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-blue-300 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                      {resultadosBusqueda.map((vehiculo) => (
                        <button
                          key={vehiculo.id}
                          type="button"
                          onClick={() => seleccionarVehiculo(vehiculo)}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <div className="bg-blue-600 text-white font-mono text-xs px-2 py-1 rounded">
                                {vehiculo.matricula}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900">
                                {vehiculo.cliente.nombre} {vehiculo.cliente.apellido}
                              </div>
                              <div className="text-sm text-gray-600">
                                {vehiculo.marca} {vehiculo.modelo}
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <div className="text-xs text-gray-500">{vehiculo.cliente.telefono}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Mensaje cuando no hay resultados */}
                  {mostrarResultados && resultadosBusqueda.length === 0 && !buscandoMatricula && matriculaBusqueda.length >= 2 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-xl p-4 text-center">
                      <p className="text-gray-600 text-sm">
                        No se encontraron resultados para "<span className="font-semibold">{matriculaBusqueda}</span>"
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        Puedes dar de alta un nuevo cliente y vehículo abajo
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">o seleccionar manualmente</span>
                </div>
              </div>

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
                  <Select value={formData.clienteId || ""} onValueChange={(value) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      clienteId: value, 
                      vehiculoId: "",
                      servicios: [],
                    }))
                    setCategoriaVehiculo(null)
                    setModoManualServicios(false)
                  }}>
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
                        <Label>Apellido</Label>
                        <Input
                          value={newCliente.apellido}
                          onChange={(e) => setNewCliente(prev => ({ ...prev, apellido: e.target.value }))}
                          placeholder="Apellido"
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
                    {/* Tipos de cliente */}
                    <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded">
                      <Label className="text-sm font-medium text-gray-700">Tipo de cliente (descuentos automáticos)</Label>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="clienteParking"
                            checked={newCliente.clienteParking}
                            onChange={(e) => setNewCliente(prev => ({ ...prev, clienteParking: e.target.checked }))}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                          />
                          <Label htmlFor="clienteParking" className="cursor-pointer text-green-700 text-sm">
                            🅿️ Abonado Parking ({descuentoParking.tipo === 'FIJO' ? `${descuentoParking.valor}€` : `${descuentoParking.valor}%`})
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="clienteVIP"
                            checked={newCliente.clienteVIP}
                            onChange={(e) => setNewCliente(prev => ({ ...prev, clienteVIP: e.target.checked }))}
                            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                          />
                          <Label htmlFor="clienteVIP" className="cursor-pointer text-amber-700 text-sm">
                            ⭐ Cliente VIP ({descuentoVIP.tipo === 'FIJO' ? `${descuentoVIP.valor}€` : `${descuentoVIP.valor}%`})
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="clienteEmpresa"
                            checked={newCliente.clienteEmpresa}
                            onChange={(e) => setNewCliente(prev => ({ ...prev, clienteEmpresa: e.target.checked }))}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <Label htmlFor="clienteEmpresa" className="cursor-pointer text-blue-700 text-sm">
                            🏢 Empresa ({descuentoEmpresa.tipo === 'FIJO' ? `${descuentoEmpresa.valor}€` : `${descuentoEmpresa.valor}%`})
                          </Label>
                        </div>
                      </div>
                    </div>
                    <Button type="button" onClick={addNewCliente} size="sm" className="w-full">
                      Agregar Cliente y Continuar
                    </Button>
                  </div>
                )}
              </div>

              {/* Descuento manual - SIEMPRE VISIBLE */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <Label htmlFor="descuentoManual" className="text-purple-800 text-sm font-medium flex items-center">
                  💰 Descuento manual
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="descuentoManual"
                    type="number"
                    min="0"
                    step="0.01"
                    value={descuentoManual || ''}
                    onChange={(e) => setDescuentoManual(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-24 bg-white"
                  />
                  <span className="text-purple-700 text-sm">€ de descuento adicional</span>
                </div>
              </div>

              {/* Información de descuentos automáticos y tickets - solo si hay cliente */}
              {formData.clienteId && (
                  <div className="space-y-2">
                    <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-blue-900">Descuentos automáticos del cliente</h4>
                      </div>
                      <div className="space-y-1 text-sm">
                        {/* Descuentos automáticos del cliente */}
                        {(clienteSeleccionadoInfo?.clienteParking || clienteSeleccionadoInfo?.clienteVIP || clienteSeleccionadoInfo?.clienteEmpresa) ? (
                          <div className="space-y-1">
                            {clienteSeleccionadoInfo?.clienteParking && (
                              <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                                <span className="text-green-800">🅿️ Abonado Parking</span>
                                <span className="text-green-700 font-medium">
                                  -{descuentoParking.tipo === 'FIJO' ? `${descuentoParking.valor}€` : `${descuentoParking.valor}%`}
                                </span>
                              </div>
                            )}
                            {clienteSeleccionadoInfo?.clienteVIP && (
                              <div className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded">
                                <span className="text-amber-800">⭐ Cliente VIP</span>
                                <span className="text-amber-700 font-medium">
                                  -{descuentoVIP.tipo === 'FIJO' ? `${descuentoVIP.valor}€` : `${descuentoVIP.valor}%`}
                                </span>
                              </div>
                            )}
                            {clienteSeleccionadoInfo?.clienteEmpresa && (
                              <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-300 rounded">
                                <span className="text-blue-800">🏢 Empresa</span>
                                <span className="text-blue-700 font-medium">
                                  -{descuentoEmpresa.tipo === 'FIJO' ? `${descuentoEmpresa.valor}€` : `${descuentoEmpresa.valor}%`}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center p-2 bg-gray-50 border border-gray-200 rounded">
                            <span className="text-gray-600">Cliente regular (sin descuentos automáticos)</span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 rounded mt-2">
                          <span className="text-amber-900">
                            <strong>Tickets disponibles:</strong>
                          </span>
                          <span className="text-amber-700 font-bold text-lg">
                            {ticketsDisponibles}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
              )}

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
                    <Select value={formData.vehiculoId || ""} onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, vehiculoId: value, servicios: [] }))
                      // Auto-detectar categoría al seleccionar vehículo del dropdown (con override local)
                      const veh = getClienteVehiculos().find(v => v.id === value)
                      if (veh) {
                        const cat = detectCategoryWithOverrides(veh.marca, veh.modelo)
                        setCategoriaVehiculo(cat)
                        setModoManualServicios(false)
                      }
                    }}>
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
                    {/* Badge de categoría auto-detectada */}
                    {formData.vehiculoId && categoriaVehiculo && (
                      <div className={`flex items-center gap-2 p-2 rounded-lg border ${CATEGORY_COLORS[categoriaVehiculo].bg} ${CATEGORY_COLORS[categoriaVehiculo].border}`}>
                        <span className="text-lg">{CATEGORY_EMOJIS[categoriaVehiculo]}</span>
                        <span className={`text-sm font-semibold ${CATEGORY_COLORS[categoriaVehiculo].text}`}>
                          Categoría: {CATEGORY_LABELS[categoriaVehiculo]}
                        </span>
                        <span className={`text-xs ${CATEGORY_COLORS[categoriaVehiculo].text} opacity-75`}>
                          (precio según tamaño)
                        </span>
                      </div>
                    )}
                    {formData.vehiculoId && !categoriaVehiculo && (
                      <div className="flex items-center gap-2 p-2 rounded-lg border bg-yellow-50 border-yellow-300">
                        <span className="text-lg">⚠️</span>
                        <span className="text-sm font-medium text-yellow-800">
                          Modelo no reconocido — selecciona los servicios manualmente
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                    <VehicleBrandModelSelector
                      marca={newVehiculo.marca}
                      modelo={newVehiculo.modelo}
                      onMarcaChange={(marca) => setNewVehiculo(prev => ({ ...prev, marca, modelo: marca !== prev.marca ? '' : prev.modelo }))}
                      onModeloChange={(modelo) => {
                        setNewVehiculo(prev => ({ ...prev, modelo }))
                        // Re-detectar con overrides locales
                        const cat = detectCategoryWithOverrides(newVehiculo.marca, modelo)
                        setCategoriaVehiculo(cat)
                        if (cat) setModoManualServicios(false)
                      }}
                      onCategoryDetected={(cat) => {
                        // El componente detecta globalmente, pero nosotros re-chequeamos con overrides
                        const effectiveCat = detectCategoryWithOverrides(newVehiculo.marca, newVehiculo.modelo)
                        setCategoriaVehiculo(effectiveCat || cat)
                        if (effectiveCat || cat) setModoManualServicios(false)
                      }}
                      compact
                    />
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

          {/* Servicios - filtrados por categoría del vehículo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Servicios</Label>
              {categoriaVehiculo && isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setModoManualServicios(!modoManualServicios)
                    setFormData(prev => ({ ...prev, servicios: [] }))
                  }}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {modoManualServicios ? (
                    <ToggleRight className="h-4 w-4 text-orange-500" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}
                  {modoManualServicios ? 'Modo manual (todos)' : 'Filtrado automático'}
                </button>
              )}
            </div>
            {categoriaVehiculo && !modoManualServicios && (
              <div className={`text-xs px-2 py-1 rounded ${CATEGORY_COLORS[categoriaVehiculo].bg} ${CATEGORY_COLORS[categoriaVehiculo].text}`}>
                {CATEGORY_EMOJIS[categoriaVehiculo]} Mostrando servicios para vehículo <strong>{CATEGORY_LABELS[categoriaVehiculo]}</strong>
              </div>
            )}
            {modoManualServicios && (
              <div className="text-xs px-2 py-1 rounded bg-orange-50 text-orange-700">
                ⚠️ Modo manual: mostrando TODOS los servicios sin filtrar por tamaño
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
              {((!categoriaVehiculo || modoManualServicios) 
                ? servicios 
                : filterServicesByCategory(servicios || [], categoriaVehiculo)
              )?.map((servicio) => (
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
                    {servicio.nombre} (€{getPrecioEfectivo(servicio.id).toFixed(2)}
                    {precioOverrides.some(po => po.servicioId === servicio.id) && (
                      <span className="text-xs text-blue-600 ml-1" title="Precio especial de este local">📍</span>
                    )}
                    {' '}- {servicio.duracion}min)
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Resumen de precios */}
          {formData.servicios.length > 0 && (() => {
            const subtotal = formData.servicios.reduce((sum, servicioId) => {
              return sum + getPrecioEfectivo(servicioId)
            }, 0)
            
            // Calcular descuentos automáticos
            let descuentoParkingAplicado = 0
            let descuentoVIPAplicado = 0
            let descuentoEmpresaAplicado = 0
            
            if (clienteSeleccionadoInfo?.clienteParking) {
              descuentoParkingAplicado = descuentoParking.tipo === 'FIJO' 
                ? descuentoParking.valor 
                : (subtotal * descuentoParking.valor) / 100
            }
            
            if (clienteSeleccionadoInfo?.clienteVIP) {
              descuentoVIPAplicado = descuentoVIP.tipo === 'FIJO' 
                ? descuentoVIP.valor 
                : (subtotal * descuentoVIP.valor) / 100
            }
            
            if (clienteSeleccionadoInfo?.clienteEmpresa) {
              descuentoEmpresaAplicado = descuentoEmpresa.tipo === 'FIJO' 
                ? descuentoEmpresa.valor 
                : (subtotal * descuentoEmpresa.valor) / 100
            }
            
            const totalDescuentosAuto = descuentoParkingAplicado + descuentoVIPAplicado + descuentoEmpresaAplicado
            const totalDescuentos = totalDescuentosAuto + descuentoManual
            const total = Math.max(0, subtotal - totalDescuentos)
            
            return (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center text-blue-900">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Resumen de Precios
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal servicios:</span>
                    <span className="font-medium">€{subtotal.toFixed(2)}</span>
                  </div>
                  
                  {/* Descuentos automáticos */}
                  {descuentoParkingAplicado > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">🅿️ Dto. Parking:</span>
                      <span className="font-medium text-green-600">-€{descuentoParkingAplicado.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {descuentoVIPAplicado > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-600">⭐ Dto. VIP:</span>
                      <span className="font-medium text-amber-600">-€{descuentoVIPAplicado.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {descuentoEmpresaAplicado > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-600">🏢 Dto. Empresa:</span>
                      <span className="font-medium text-blue-600">-€{descuentoEmpresaAplicado.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {/* Descuento manual */}
                  {descuentoManual > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-600">💰 Dto. Manual:</span>
                      <span className="font-medium text-purple-600">-€{descuentoManual.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {totalDescuentos > 0 && (
                    <div className="flex justify-between text-sm border-t pt-2 text-red-600">
                      <span>Total descuentos:</span>
                      <span className="font-medium">-€{totalDescuentos.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-base font-bold border-t-2 pt-2 border-blue-300">
                    <span className="text-blue-900">TOTAL A COBRAR:</span>
                    <span className="text-blue-900 text-lg">€{total.toFixed(2)}</span>
                  </div>
                  
                  {totalDescuentos > 0 && (
                    <div className="text-xs text-green-700 bg-green-100 p-2 rounded mt-2 border border-green-200">
                      ✓ Descuentos aplicados correctamente
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })()}

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
                <SelectItem value="TPV_SUMUP">
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

          {/* Colaboradores (prescriptor / realizado por) */}
          {colaboradores.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prescriptor</Label>
                <Select value={formData.prescriptorId || "_none"} onValueChange={(v) => setFormData(prev => ({ ...prev, prescriptorId: v === '_none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Sin prescriptor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sin prescriptor</SelectItem>
                    {colaboradores.filter(c => c.rol === 'PRESCRIPTOR' || c.rol === 'RESPONSABLE').map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Realizado por</Label>
                <Select value={formData.realizadoPorId || "_none"} onValueChange={(v) => setFormData(prev => ({ ...prev, realizadoPorId: v === '_none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sin asignar</SelectItem>
                    {colaboradores.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre} ({c.rol === 'RESPONSABLE' ? 'Resp.' : c.rol === 'PRESCRIPTOR' ? 'Presc.' : 'Op.'})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

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