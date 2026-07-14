'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ScrollText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  Download,
  RefreshCw,
  Settings,
  Eye,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ActivityLog {
  id: string
  userId: string | null
  userName: string | null
  userEmail: string | null
  action: string
  entity: string
  entityId: string | null
  description: string
  details: any
  ipAddress: string | null
  createdAt: string
}

interface FilterUser {
  userId: string
  userName: string | null
  userEmail: string | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const actionIcons: Record<string, React.ReactNode> = {
  CREATE: <Plus className="h-4 w-4 text-green-500" />,
  UPDATE: <Pencil className="h-4 w-4 text-blue-500" />,
  DELETE: <Trash2 className="h-4 w-4 text-red-500" />,
  LOGIN: <LogIn className="h-4 w-4 text-purple-500" />,
  LOGOUT: <LogOut className="h-4 w-4 text-gray-500" />,
  EXPORT: <Download className="h-4 w-4 text-orange-500" />,
  CONVERT: <RefreshCw className="h-4 w-4 text-teal-500" />,
  VIEW: <Eye className="h-4 w-4 text-gray-400" />,
  CONFIG: <Settings className="h-4 w-4 text-yellow-500" />,
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  LOGIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  LOGOUT: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  EXPORT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  CONVERT: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  VIEW: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  CONFIG: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
}

const entityLabels: Record<string, string> = {
  FACTURA: 'Factura',
  GASTO: 'Gasto',
  CLIENTE: 'Cliente',
  VEHICULO: 'Vehículo',
  CITA: 'Cita',
  USUARIO: 'Usuario',
  SERVICIO: 'Servicio',
  LOCAL: 'Local',
  CIERRE_CAJA: 'Cierre Caja',
  CONFIGURACION: 'Configuración',
  PROVEEDOR: 'Proveedor',
  SISTEMA: 'Sistema',
}

export function ActividadView() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedEntity, setSelectedEntity] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [availableUsers, setAvailableUsers] = useState<FilterUser[]>([])
  const [availableEntities, setAvailableEntities] = useState<string[]>([])
  const [availableActions, setAvailableActions] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '50')
      if (search) params.set('search', search)
      if (selectedUser) params.set('userId', selectedUser)
      if (selectedEntity) params.set('entity', selectedEntity)
      if (selectedAction) params.set('action', selectedAction)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const res = await fetch(`/api/activity-log?${params.toString()}`)
      if (!res.ok) throw new Error('Error al obtener los logs')

      const data = await res.json()
      setLogs(data.logs)
      setPagination(data.pagination)
      if (data.filters) {
        setAvailableUsers(data.filters.users || [])
        setAvailableEntities(data.filters.entities || [])
        setAvailableActions(data.filters.actions || [])
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }, [search, selectedUser, selectedEntity, selectedAction, dateFrom, dateTo])

  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  const clearFilters = () => {
    setSearch('')
    setSelectedUser('')
    setSelectedEntity('')
    setSelectedAction('')
    setDateFrom('')
    setDateTo('')
  }

  const hasActiveFilters = search || selectedUser || selectedEntity || selectedAction || dateFrom || dateTo

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScrollText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Registro de Actividad</h1>
            <p className="text-sm text-muted-foreground">
              {pagination.total} registros en total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? 'border-primary text-primary' : ''}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-1 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs">
                !
              </span>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchLogs(pagination.page)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Descripción, usuario..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Usuario</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Todos</option>
                  {availableUsers.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.userName || u.userEmail || u.userId}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Entidad</label>
                <select
                  value={selectedEntity}
                  onChange={(e) => setSelectedEntity(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Todas</option>
                  {availableEntities.map((e) => (
                    <option key={e} value={e}>
                      {entityLabels[e] || e}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Acción</label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Todas</option>
                  {availableActions.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Desde</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Hasta</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" /> Limpiar filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ScrollText className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-lg font-medium">No hay registros</p>
              <p className="text-sm">No se encontraron registros de actividad con los filtros actuales</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha/Hora</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuario</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Acción</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entidad</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr
                        className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs">
                              {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium">{log.userName || 'Sistema'}</span>
                          </div>
                          {log.userEmail && (
                            <span className="text-xs text-muted-foreground ml-5">{log.userEmail}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>
                            {actionIcons[log.action]}
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {entityLabels[log.entity] || log.entity}
                          </span>
                          {log.entityId && (
                            <span className="text-xs text-muted-foreground ml-1">#{log.entityId.slice(0, 8)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs">{log.description}</span>
                        </td>
                      </tr>
                      {expandedLog === log.id && log.details && (
                        <tr className="bg-muted/20">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="text-xs">
                              <p className="font-medium mb-1 text-muted-foreground">Detalles:</p>
                              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto max-h-48">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">
                Página {pagination.page} de {pagination.totalPages} ({pagination.total} registros)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchLogs(pagination.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchLogs(pagination.page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
