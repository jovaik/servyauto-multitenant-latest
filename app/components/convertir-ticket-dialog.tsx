

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, FileText, Building2, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ConvertirTicketDialogProps {
  ticketId: string
  ticketNumero: string
  clienteId?: string
  clienteNombre?: string
  clienteApellido?: string
  clienteDocumento?: string
  clienteTelefono?: string
  clienteDireccion?: string
  onConvertido: () => void
}

export function ConvertirTicketDialog({ ticketId, ticketNumero, clienteId, clienteNombre, clienteApellido, clienteDocumento, clienteTelefono, clienteDireccion, onConvertido }: ConvertirTicketDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cargandoDatos, setCargandoDatos] = useState(false)
  const [datosFacturacion, setDatosFacturacion] = useState({
    nombreFiscal: '',
    nif: '',
    direccion: '',
    ciudad: '',
    codigoPostal: '',
    telefono: ''
  })

  // Al abrir el diálogo, cargar datos de facturación previos del cliente
  const cargarDatosFacturacion = useCallback(async () => {
    if (!clienteId) return
    
    setCargandoDatos(true)
    try {
      // Buscar facturas previas de este cliente que tengan datosFacturacion
      const res = await fetch(`/api/facturas?clienteId=${clienteId}&tipo=FACTURA&limit=1`)
      if (res.ok) {
        const facturas = await res.json()
        const facturasArr = Array.isArray(facturas) ? facturas : (facturas.facturas || [])
        
        // Buscar datosFacturacion en facturas previas
        for (const fac of facturasArr) {
          if (fac.datosFacturacion) {
            try {
              const datos = typeof fac.datosFacturacion === 'string' 
                ? JSON.parse(fac.datosFacturacion) 
                : fac.datosFacturacion
              if (datos.nombreFiscal || datos.nif) {
                setDatosFacturacion({
                  nombreFiscal: datos.nombreFiscal || '',
                  nif: datos.nif || '',
                  direccion: datos.direccion || '',
                  ciudad: datos.ciudad || '',
                  codigoPostal: datos.codigoPostal || '',
                  telefono: datos.telefono || '',
                })
                setCargandoDatos(false)
                return
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }
    } catch (err) {
      console.error('Error cargando datos de facturación previos:', err)
    }
    
    // Si no hay datos de facturación previos, usar datos del cliente
    setDatosFacturacion({
      nombreFiscal: [clienteNombre, clienteApellido].filter(Boolean).join(' ').trim() || '',
      nif: clienteDocumento || '',
      direccion: clienteDireccion || '',
      ciudad: '',
      codigoPostal: '',
      telefono: clienteTelefono || '',
    })
    setCargandoDatos(false)
  }, [clienteId, clienteNombre, clienteApellido, clienteDocumento, clienteTelefono, clienteDireccion])

  useEffect(() => {
    if (open) {
      cargarDatosFacturacion()
    }
  }, [open, cargarDatosFacturacion])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!datosFacturacion.nombreFiscal || !datosFacturacion.nif) {
      alert('Por favor complete al menos el Nombre Fiscal y NIF/CIF')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch(`/api/facturas/${ticketId}/convertir`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datosFacturacion: JSON.stringify(datosFacturacion)
        })
      })

      if (response.ok) {
        const factura = await response.json()
        setOpen(false)
        resetForm()
        onConvertido()
        
        alert(`Ticket convertido correctamente a factura: ${factura.numero}`)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Error al convertir el ticket')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al convertir el ticket a factura. Intente de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setDatosFacturacion({
      nombreFiscal: '',
      nif: '',
      direccion: '',
      ciudad: '',
      codigoPostal: '',
      telefono: ''
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <RefreshCw className="mr-2 h-4 w-4" />
          Convertir a Factura
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Convertir Ticket a Factura
          </DialogTitle>
          <DialogDescription>
            Complete los datos de facturación para convertir el ticket {ticketNumero} en una factura oficial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {cargandoDatos && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando datos de facturación previos...
            </div>
          )}
          {/* Datos de Facturación */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombreFiscal">Nombre Fiscal *</Label>
                <Input
                  id="nombreFiscal"
                  value={datosFacturacion.nombreFiscal}
                  onChange={(e) => setDatosFacturacion({...datosFacturacion, nombreFiscal: e.target.value})}
                  placeholder="Nombre o razón social"
                  required
                />
              </div>
              <div>
                <Label htmlFor="nif">NIF/CIF *</Label>
                <Input
                  id="nif"
                  value={datosFacturacion.nif}
                  onChange={(e) => setDatosFacturacion({...datosFacturacion, nif: e.target.value})}
                  placeholder="12345678A o A12345678"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={datosFacturacion.direccion}
                onChange={(e) => setDatosFacturacion({...datosFacturacion, direccion: e.target.value})}
                placeholder="Dirección completa"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input
                  id="ciudad"
                  value={datosFacturacion.ciudad}
                  onChange={(e) => setDatosFacturacion({...datosFacturacion, ciudad: e.target.value})}
                  placeholder="Ciudad"
                />
              </div>
              <div>
                <Label htmlFor="codigoPostal">Código Postal</Label>
                <Input
                  id="codigoPostal"
                  value={datosFacturacion.codigoPostal}
                  onChange={(e) => setDatosFacturacion({...datosFacturacion, codigoPostal: e.target.value})}
                  placeholder="28000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={datosFacturacion.telefono}
                onChange={(e) => setDatosFacturacion({...datosFacturacion, telefono: e.target.value})}
                placeholder="+34 600 000 000"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Convirtiendo...' : 'Convertir a Factura'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

