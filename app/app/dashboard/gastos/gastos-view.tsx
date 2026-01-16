
'use client'

import React, { useState, useEffect } from 'react'
import { 
  TrendingDown, 
  Plus,
  RefreshCw,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  Receipt,
  Download
} from 'lucide-react'
import { generarPDFGastos } from '@/lib/pdf-generator'
import { exportarGastosExcel } from '@/lib/excel-generator'
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
import { NuevoGastoDialog } from '@/components/nuevo-gasto-dialog'
import { EditarGastoDialog } from '@/components/editar-gasto-dialog'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Gasto {
  id: string
  concepto: string
  fecha: string
  proveedor: string | null
  tipoGasto: string
  importe: number
  tipo: 'TICKET' | 'FACTURA'
  iva: number
}

export function GastosView() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'TICKET' | 'FACTURA'>('ALL')
  const [stats, setStats] = useState({
    totalGastosMes: 0,
    totalFacturas: 0,
    totalTickets: 0,
    totalGastos: 0
  })

  useEffect(() => {
    loadGastos()
    loadStats()
  }, [])

  const loadGastos = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/gastos')
      if (response.ok) {
        const data = await response.json()
        setGastos(data || [])
      }
    } catch (error) {
      console.error('Error loading gastos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/gastos/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const eliminarGasto = async (gastoId: string, concepto: string) => {
    if (!confirm(`¿Está seguro que desea eliminar el gasto "${concepto}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const response = await fetch(`/api/gastos/${gastoId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Gasto eliminado correctamente')
        loadGastos()
        loadStats()
      } else {
        throw new Error('Error en la respuesta del servidor')
      }
    } catch (error) {
      console.error('Error deleting gasto:', error)
      alert('Error al eliminar el gasto. Por favor intenta de nuevo.')
    }
  }

  const getTipoColor = (tipo: string) => {
    return tipo === 'FACTURA' 
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-purple-100 text-purple-800 border-purple-200'
  }

  const getTipoIcon = (tipo: string) => {
    return tipo === 'FACTURA' ? FileText : Receipt
  }

  const filteredGastos = gastos.filter(gasto => {
    const matchesSearch = searchTerm === '' || 
      gasto.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gasto.proveedor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gasto.tipoGasto.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'ALL' || gasto.tipo === filterType
    
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gastos</h1>
          <p className="text-gray-600">
            Gestión de gastos y compras del taller
          </p>
        </div>
        <NuevoGastoDialog onGastoCreado={loadGastos} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalGastosMes.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Mes actual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFacturas}</div>
            <p className="text-xs text-muted-foreground">Total de facturas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets</CardTitle>
            <Receipt className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTickets}</div>
            <p className="text-xs text-muted-foreground">Total de tickets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGastos}</div>
            <p className="text-xs text-muted-foreground">Registros totales</p>
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
                  placeholder="Buscar por concepto, proveedor o tipo..."
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

            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                const total = filteredGastos.reduce((sum, g) => sum + g.importe, 0)
                const porCategoria: Record<string, number> = {}
                filteredGastos.forEach(g => {
                  porCategoria[g.tipoGasto] = (porCategoria[g.tipoGasto] || 0) + g.importe
                })
                await generarPDFGastos(filteredGastos, { total, porCategoria }, 'Período seleccionado')
              }}
              className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
            >
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                const total = filteredGastos.reduce((sum, g) => sum + g.importe, 0)
                const porCategoria: Record<string, number> = {}
                filteredGastos.forEach(g => {
                  porCategoria[g.tipoGasto] = (porCategoria[g.tipoGasto] || 0) + g.importe
                })
                await exportarGastosExcel(filteredGastos, { total, porCategoria }, 'Período seleccionado')
              }}
              className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            >
              <Download className="h-4 w-4 mr-1" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={loadGastos}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gastos Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Gastos</CardTitle>
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
                  <TableHead>Concepto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Tipo Gasto</TableHead>
                  <TableHead>Tipo Doc.</TableHead>
                  <TableHead>Importe</TableHead>
                  <TableHead>IVA</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGastos.map((gasto) => {
                  const TipoIcon = getTipoIcon(gasto.tipo)
                  return (
                    <TableRow key={gasto.id}>
                      <TableCell className="font-medium">
                        {gasto.concepto}
                      </TableCell>
                      <TableCell>
                        {format(new Date(gasto.fecha), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        {gasto.proveedor || '-'}
                      </TableCell>
                      <TableCell>
                        {gasto.tipoGasto}
                      </TableCell>
                      <TableCell>
                        <Badge className={getTipoColor(gasto.tipo)}>
                          <TipoIcon className="h-3 w-3 mr-1" />
                          {gasto.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        €{gasto.importe.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {gasto.iva}%
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <EditarGastoDialog 
                              gasto={gasto}
                              onGastoActualizado={loadGastos}
                            />
                            <DropdownMenuItem 
                              onClick={() => eliminarGasto(gasto.id, gasto.concepto)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          
          {!loading && filteredGastos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No se encontraron gastos que coincidan con los criterios de búsqueda.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
