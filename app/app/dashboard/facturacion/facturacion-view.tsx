
'use client'

import React, { useState, useEffect } from 'react'
import { 
  CreditCard, 
  FileText, 
  Euro, 
  TrendingUp, 
  Plus,
  Download,
  RefreshCw,
  Filter,
  Search,
  MoreHorizontal,
  ArrowUpDown,
  Eye
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Factura {
  id: string
  numero: string
  tipo: 'TICKET' | 'FACTURA'
  fecha: string
  cliente: {
    nombre: string
    apellido: string
  }
  total: number
  estado: 'PENDIENTE' | 'PAGADA' | 'VENCIDA' | 'CANCELADA'
  metodoPago?: string
  pdfPath?: string
}

export function FacturacionView() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'TICKET' | 'FACTURA'>('ALL')
  const [stats, setStats] = useState({
    totalFacturas: 0,
    totalTickets: 0,
    ingresosMes: 0,
    pendientesCobro: 0
  })

  useEffect(() => {
    loadFacturas()
    loadStats()
  }, [])

  const loadFacturas = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/facturas')
      if (response.ok) {
        const data = await response.json()
        setFacturas(data || [])
      }
    } catch (error) {
      console.error('Error loading facturas:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/facturas/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const convertirAFactura = async (facturaId: string) => {
    try {
      const response = await fetch(`/api/facturas/${facturaId}/convertir`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        loadFacturas()
        // TODO: Show success notification
      }
    } catch (error) {
      console.error('Error converting to factura:', error)
    }
  }

  const descargarPDF = async (facturaId: string) => {
    try {
      const response = await fetch(`/api/facturas/${facturaId}/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `factura-${facturaId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'PAGADA': return 'bg-green-100 text-green-800 border-green-200'
      case 'VENCIDA': return 'bg-red-100 text-red-800 border-red-200'
      case 'CANCELADA': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTipoColor = (tipo: string) => {
    return tipo === 'FACTURA' 
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-purple-100 text-purple-800 border-purple-200'
  }

  const filteredFacturas = facturas.filter(factura => {
    const matchesSearch = searchTerm === '' || 
      factura.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${factura.cliente.nombre} ${factura.cliente.apellido}`.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'ALL' || factura.tipo === filterType
    
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
          <p className="text-gray-600">
            Gestión de facturas, tickets y reportes financieros
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFacturas}</div>
            <p className="text-xs text-muted-foreground">Documentos generados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTickets}</div>
            <p className="text-xs text-muted-foreground">Tickets emitidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
            <Euro className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.ingresosMes.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Facturación mensual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.pendientesCobro.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Por cobrar</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por número o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={filterType === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('ALL')}
              >
                Todos
              </Button>
              <Button
                variant={filterType === 'TICKET' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('TICKET')}
              >
                Tickets
              </Button>
              <Button
                variant={filterType === 'FACTURA' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('FACTURA')}
              >
                Facturas
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={loadFacturas}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Facturas Table */}
      <Card>
        <CardHeader>
          <CardTitle>Facturas y Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Método Pago</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFacturas.map((factura) => (
                  <TableRow key={factura.id}>
                    <TableCell className="font-medium">
                      {factura.numero}
                    </TableCell>
                    <TableCell>
                      <Badge className={getTipoColor(factura.tipo)}>
                        {factura.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {factura.cliente.nombre} {factura.cliente.apellido}
                    </TableCell>
                    <TableCell>
                      {format(new Date(factura.fecha), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>€{factura.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={getEstadoColor(factura.estado)}>
                        {factura.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {factura.metodoPago || '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => descargarPDF(factura.id)}>
                            <Download className="mr-2 h-4 w-4" />
                            Descargar PDF
                          </DropdownMenuItem>
                          {factura.tipo === 'TICKET' && (
                            <DropdownMenuItem onClick={() => convertirAFactura(factura.id)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Convertir a Factura
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalles
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {!loading && filteredFacturas.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No se encontraron facturas que coincidan con los criterios de búsqueda.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
