'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Plus, Trash2, RefreshCw, Wifi, Building2, Settings2, BarChart3, User, Wallet, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useSession } from 'next-auth/react'

interface SumUpReader {
  id: string
  name: string
  status: string
  localId?: string | null
  localNombre?: string | null
  userId?: string | null
  userNombre?: string | null
  cuentaTpvId?: string | null
  cuentaTpvNombre?: string | null
}

interface CuentaTpv {
  id: string
  nombre: string
  proveedor: string
  userId?: string | null
  userNombre?: string | null
  localId?: string | null
  localNombre?: string | null
  activo: boolean
  esDefault: boolean
  tieneApiKey?: boolean
  tieneAffiliateKey?: boolean
}

interface Local {
  id: string
  nombre: string
}

interface Usuario {
  id: string
  name?: string | null
  email: string
  localId?: string | null
}

interface SumUpConfigData {
  modoAsignacion: 'COMPARTIDO' | 'POR_LOCAL'
  trackingPorLocal: boolean
}

interface Transaction {
  id: string
  amount: number
  status: string
  localNombre: string
  readerNombre: string
  creadoPorNombre: string
  createdAt: string
  description?: string
}

export function SumUpConfig() {
  const { data: session } = useSession()
  const [readers, setReaders] = useState<SumUpReader[]>([])
  const [locales, setLocales] = useState<Local[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cuentas, setCuentas] = useState<CuentaTpv[]>([])
  const [config, setConfig] = useState<SumUpConfigData>({ modoAsignacion: 'COMPARTIDO', trackingPorLocal: true })
  // Dialogo cuenta TPV
  const [cuentaDialogOpen, setCuentaDialogOpen] = useState(false)
  const [savingCuenta, setSavingCuenta] = useState(false)
  const [editingCuenta, setEditingCuenta] = useState<CuentaTpv | null>(null)
  const [cuentaForm, setCuentaForm] = useState<{ nombre: string; proveedor: string; sumupApiKey: string; sumupAffiliateKey: string; userId: string; localId: string }>({ nombre: '', proveedor: 'SUMUP', sumupApiKey: '', sumupAffiliateKey: '', userId: '', localId: '' })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totales, setTotales] = useState({ total: 0, pagadas: 0, pendientes: 0 })
  const [loading, setLoading] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [pairing, setPairing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pairingCode, setPairingCode] = useState('')
  const [readerName, setReaderName] = useState('')
  const [selectedLocalForReader, setSelectedLocalForReader] = useState<string>('')
  const { toast } = useToast()
  
  const isSuperAdmin = (session?.user as any)?.role === 'SUPER_ADMIN'

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Cargar lectores y config
      const readersRes = await fetch('/api/sumup/readers')
      if (readersRes.ok) {
        const data = await readersRes.json()
        setReaders(data.readers || [])
        if (data.config) {
          setConfig(data.config)
        }
      }

      // Cargar locales
      const localesRes = await fetch('/api/locales')
      if (localesRes.ok) {
        const data = await localesRes.json()
        setLocales(data || [])
      }

      // Cargar usuarios (para asignar TPV a colaborador)
      const usuariosRes = await fetch('/api/usuarios')
      if (usuariosRes.ok) {
        const data = await usuariosRes.json()
        setUsuarios(Array.isArray(data) ? data : (data.usuarios || []))
      }

      // Cargar cuentas TPV
      const cuentasRes = await fetch('/api/cuentas-tpv')
      if (cuentasRes.ok) {
        const data = await cuentasRes.json()
        setCuentas(Array.isArray(data) ? data : (data.cuentas || []))
      }

      // Cargar transacciones recientes
      const transRes = await fetch('/api/sumup/transactions')
      if (transRes.ok) {
        const data = await transRes.json()
        setTransactions(data.transactions || [])
        setTotales(data.totales || { total: 0, pagadas: 0, pendientes: 0 })
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true)
      const response = await fetch('/api/sumup/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        toast({
          title: '✅ Configuración guardada',
          description: 'Los cambios se han aplicado correctamente',
        })
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'No se pudo guardar la configuración',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive',
      })
    } finally {
      setSavingConfig(false)
    }
  }

  const handlePairReader = async () => {
    if (!pairingCode) {
      toast({
        title: 'Error',
        description: 'Introduce el código de emparejamiento del terminal',
        variant: 'destructive',
      })
      return
    }

    try {
      setPairing(true)
      const response = await fetch('/api/sumup/readers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairingCode,
          name: readerName || 'ServyAuto Terminal',
          localId: config.modoAsignacion === 'POR_LOCAL' ? selectedLocalForReader || null : null,
        }),
      })

      if (response.ok) {
        toast({
          title: '✅ Terminal emparejado',
          description: 'El terminal SumUp está listo para cobrar',
        })
        setDialogOpen(false)
        setPairingCode('')
        setReaderName('')
        setSelectedLocalForReader('')
        loadData()
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.error || 'No se pudo emparejar el terminal',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión con SumUp',
        variant: 'destructive',
      })
    } finally {
      setPairing(false)
    }
  }

  const handleAssignLocal = async (readerId: string, localId: string | null) => {
    try {
      const response = await fetch(`/api/sumup/readers/${readerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localId }),
      })

      if (response.ok) {
        toast({
          title: '✅ Asignación actualizada',
        })
        loadData()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la asignación',
        variant: 'destructive',
      })
    }
  }

  const handleAssignUser = async (readerId: string, userId: string | null) => {
    try {
      const response = await fetch(`/api/sumup/readers/${readerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId || '' }),
      })
      if (response.ok) {
        toast({ title: '✅ Responsable del TPV actualizado' })
        loadData()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo asignar el responsable', variant: 'destructive' })
    }
  }

  const handleAssignCuenta = async (readerId: string, cuentaTpvId: string | null) => {
    try {
      const response = await fetch(`/api/sumup/readers/${readerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuentaTpvId: cuentaTpvId || '' }),
      })
      if (response.ok) {
        toast({ title: '✅ Cuenta TPV del datáfono actualizada' })
        loadData()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo asignar la cuenta TPV', variant: 'destructive' })
    }
  }

  const openCuentaDialog = (cuenta: CuentaTpv | null) => {
    if (cuenta) {
      setEditingCuenta(cuenta)
      setCuentaForm({
        nombre: cuenta.nombre,
        proveedor: cuenta.proveedor || 'SUMUP',
        sumupApiKey: '',
        sumupAffiliateKey: '',
        userId: cuenta.userId || '',
        localId: cuenta.localId || '',
      })
    } else {
      setEditingCuenta(null)
      setCuentaForm({ nombre: '', proveedor: 'SUMUP', sumupApiKey: '', sumupAffiliateKey: '', userId: '', localId: '' })
    }
    setCuentaDialogOpen(true)
  }

  const handleSaveCuenta = async () => {
    if (!cuentaForm.nombre.trim()) {
      toast({ title: 'Error', description: 'El nombre de la cuenta es obligatorio', variant: 'destructive' })
      return
    }
    try {
      setSavingCuenta(true)
      const isEdit = !!editingCuenta
      const url = isEdit ? `/api/cuentas-tpv/${editingCuenta!.id}` : '/api/cuentas-tpv'
      const method = isEdit ? 'PUT' : 'POST'
      // Las claves solo se envían si el usuario las ha escrito (para no borrarlas al editar)
      const payload: any = {
        nombre: cuentaForm.nombre.trim().toUpperCase(),
        proveedor: cuentaForm.proveedor,
        userId: cuentaForm.userId || null,
        localId: cuentaForm.localId || null,
      }
      if (cuentaForm.sumupApiKey.trim()) payload.sumupApiKey = cuentaForm.sumupApiKey.trim()
      if (cuentaForm.sumupAffiliateKey.trim()) payload.sumupAffiliateKey = cuentaForm.sumupAffiliateKey.trim()
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (response.ok) {
        toast({ title: isEdit ? '✅ Cuenta TPV actualizada' : '✅ Cuenta TPV creada' })
        setCuentaDialogOpen(false)
        loadData()
      } else {
        const error = await response.json()
        toast({ title: 'Error', description: error.error || 'No se pudo guardar la cuenta', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSavingCuenta(false)
    }
  }

  const handleDeleteCuenta = async (cuenta: CuentaTpv) => {
    if (cuenta.esDefault) {
      toast({ title: 'No permitido', description: 'No se puede eliminar la cuenta por defecto', variant: 'destructive' })
      return
    }
    if (!confirm(`¿Eliminar la cuenta TPV "${cuenta.nombre}"?`)) return
    try {
      const response = await fetch(`/api/cuentas-tpv/${cuenta.id}`, { method: 'DELETE' })
      if (response.ok) {
        toast({ title: 'Cuenta TPV eliminada' })
        loadData()
      } else {
        const error = await response.json()
        toast({ title: 'Error', description: error.error || 'No se pudo eliminar', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
  }

  const handleUnpairReader = async (readerId: string, readerName: string) => {
    if (!confirm(`¿Desemparejar el terminal "${readerName}"?`)) return

    try {
      const response = await fetch(`/api/sumup/readers/${readerId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({ title: 'Terminal desemparejado' })
        loadData()
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive',
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'FAILED': return 'bg-red-100 text-red-800'
      case 'CANCELLED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Tabs defaultValue="terminales" className="space-y-4">
      <TabsList>
        <TabsTrigger value="terminales" className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Terminales
        </TabsTrigger>
        {isSuperAdmin && (
          <TabsTrigger value="cuentas" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Cuentas TPV
          </TabsTrigger>
        )}
        {isSuperAdmin && (
          <TabsTrigger value="configuracion" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Configuración
          </TabsTrigger>
        )}
        <TabsTrigger value="transacciones" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Transacciones
        </TabsTrigger>
      </TabsList>

      {/* TAB: Terminales */}
      <TabsContent value="terminales">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Terminales SumUp
                </CardTitle>
                <CardDescription>
                  {config.modoAsignacion === 'POR_LOCAL' 
                    ? 'Cada terminal está asignado a un local específico'
                    : 'Todos los terminales son accesibles desde cualquier local'
                  }
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Emparejar Terminal
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Emparejar Terminal SumUp Solo</DialogTitle>
                      <DialogDescription>
                        En el terminal Solo, ve a Conexiones → API → Conectar para obtener el código
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Código de emparejamiento</Label>
                        <Input
                          value={pairingCode}
                          onChange={(e) => setPairingCode(e.target.value)}
                          placeholder="Ej: ABC123"
                          className="text-lg font-mono text-center"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nombre del terminal</Label>
                        <Input
                          value={readerName}
                          onChange={(e) => setReaderName(e.target.value)}
                          placeholder="Ej: Terminal Marbella"
                        />
                      </div>
                      {config.modoAsignacion === 'POR_LOCAL' && (
                        <div className="space-y-2">
                          <Label>Asignar a local</Label>
                          <Select value={selectedLocalForReader} onValueChange={setSelectedLocalForReader}>
                            <SelectTrigger>
                              <SelectValue placeholder="Compartido (todos los locales)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Compartido (todos los locales)</SelectItem>
                              {locales.map((local) => (
                                <SelectItem key={local.id} value={local.id}>
                                  {local.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <Button
                        onClick={handlePairReader}
                        disabled={pairing || !pairingCode}
                        className="w-full"
                      >
                        {pairing ? 'Emparejando...' : 'Emparejar Terminal'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Cargando terminales...</div>
            ) : readers.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No hay terminales emparejados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {readers.map((reader) => (
                  <div key={reader.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <Wifi className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{reader.name}</p>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {reader.localNombre ? (
                            <Badge variant="outline">
                              <Building2 className="h-3 w-3 mr-1" />
                              {reader.localNombre}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Compartido</Badge>
                          )}
                          {reader.userNombre ? (
                            <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
                              <User className="h-3 w-3 mr-1" />
                              {reader.userNombre}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-400">Sin responsable</Badge>
                          )}
                          {reader.cuentaTpvNombre ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                              <Wallet className="h-3 w-3 mr-1" />
                              {reader.cuentaTpvNombre}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-400">Sin cuenta TPV</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {config.modoAsignacion === 'POR_LOCAL' && isSuperAdmin && (
                        <Select
                          value={reader.localId || ''}
                          onValueChange={(value) => handleAssignLocal(reader.id, value || null)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Asignar local" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Compartido</SelectItem>
                            {locales.map((local) => (
                              <SelectItem key={local.id} value={local.id}>
                                {local.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {isSuperAdmin && (
                        <Select
                          value={reader.userId || ''}
                          onValueChange={(value) => handleAssignUser(reader.id, value || null)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Asignar responsable" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Sin responsable</SelectItem>
                            {usuarios.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name || u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {isSuperAdmin && (
                        <Select
                          value={reader.cuentaTpvId || ''}
                          onValueChange={(value) => handleAssignCuenta(reader.id, value || null)}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Asignar cuenta TPV" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Sin cuenta TPV</SelectItem>
                            {cuentas.filter((c) => c.activo).map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnpairReader(reader.id, reader.name)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">¿Cómo funciona?</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>En el terminal Solo, ve a <strong>Conexiones → API → Conectar</strong></li>
                <li>Copia el código que aparece en pantalla</li>
                <li>Introdúcelo aquí y pulsa "Emparejar Terminal"</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* TAB: Cuentas TPV (solo SUPER_ADMIN) */}
      {isSuperAdmin && (
        <TabsContent value="cuentas">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Cuentas TPV
                  </CardTitle>
                  <CardDescription>
                    Cada cuenta es una pasarela de cobro (p. ej. una cuenta SumUp de un colaborador). Varios datáfonos pueden compartir la misma cuenta. El dinero se reporta por cuenta.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => openCuentaDialog(null)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva Cuenta
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Cargando cuentas...</div>
              ) : cuentas.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No hay cuentas TPV</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cuentas.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-full">
                          <Wallet className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{c.nombre}</p>
                            {c.esDefault && <Badge variant="secondary">Por defecto</Badge>}
                            {!c.activo && <Badge variant="outline" className="text-gray-400">Inactiva</Badge>}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <Badge variant="outline">{c.proveedor}</Badge>
                            <Badge className={c.tieneApiKey ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'}>
                              <KeyRound className="h-3 w-3 mr-1" />
                              {c.tieneApiKey ? 'Clave propia' : 'Usa clave central'}
                            </Badge>
                            {c.userNombre && (
                              <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
                                <User className="h-3 w-3 mr-1" />
                                {c.userNombre}
                              </Badge>
                            )}
                            {c.localNombre && (
                              <Badge variant="outline">
                                <Building2 className="h-3 w-3 mr-1" />
                                {c.localNombre}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openCuentaDialog(c)}>
                          Editar
                        </Button>
                        {!c.esDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCuenta(c)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">¿Cómo funciona?</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>La cuenta <strong>por defecto</strong> usa la clave SumUp central de la aplicación.</li>
                  <li>Para un colaborador autónomo con su propia cuenta SumUp, crea una cuenta nueva y pon su <strong>clave API</strong>.</li>
                  <li>En la pestaña <strong>Terminales</strong>, asigna cada datáfono a la cuenta que le corresponda.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Dialogo crear/editar cuenta */}
          <Dialog open={cuentaDialogOpen} onOpenChange={setCuentaDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCuenta ? 'Editar cuenta TPV' : 'Nueva cuenta TPV'}</DialogTitle>
                <DialogDescription>
                  Una cuenta agrupa los cobros de una pasarela concreta. El dinero se reporta por cuenta.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nombre de la cuenta</Label>
                  <Input
                    value={cuentaForm.nombre}
                    onChange={(e) => setCuentaForm({ ...cuentaForm, nombre: e.target.value.toUpperCase() })}
                    placeholder="Ej: SUMUP BARTO"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Proveedor</Label>
                  <Select value={cuentaForm.proveedor} onValueChange={(v) => setCuentaForm({ ...cuentaForm, proveedor: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUMUP">SumUp</SelectItem>
                      <SelectItem value="UNICAJA" disabled>Unicaja (próximamente)</SelectItem>
                      <SelectItem value="REVOLUT" disabled>Revolut (próximamente)</SelectItem>
                      <SelectItem value="OTRO" disabled>Otro (próximamente)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Clave API SumUp {editingCuenta && <span className="text-xs text-gray-400">(déjala vacía para no cambiarla)</span>}</Label>
                  <Input
                    type="password"
                    value={cuentaForm.sumupApiKey}
                    onChange={(e) => setCuentaForm({ ...cuentaForm, sumupApiKey: e.target.value })}
                    placeholder={editingCuenta?.tieneApiKey ? '•••••• (ya configurada)' : 'sup_sk_...'}
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-gray-500">Si la dejas vacía, la cuenta usará la clave SumUp central de la aplicación.</p>
                </div>
                <div className="space-y-2">
                  <Label>Affiliate key SumUp <span className="text-xs text-gray-400">(opcional)</span></Label>
                  <Input
                    type="password"
                    value={cuentaForm.sumupAffiliateKey}
                    onChange={(e) => setCuentaForm({ ...cuentaForm, sumupAffiliateKey: e.target.value })}
                    placeholder={editingCuenta?.tieneAffiliateKey ? '•••••• (ya configurada)' : ''}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Responsable (colaborador) <span className="text-xs text-gray-400">(opcional)</span></Label>
                  <Select value={cuentaForm.userId} onValueChange={(v) => setCuentaForm({ ...cuentaForm, userId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin responsable</SelectItem>
                      {usuarios.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Local por defecto <span className="text-xs text-gray-400">(opcional)</span></Label>
                  <Select value={cuentaForm.localId} onValueChange={(v) => setCuentaForm({ ...cuentaForm, localId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sin local" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin local</SelectItem>
                      {locales.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveCuenta} disabled={savingCuenta || !cuentaForm.nombre.trim()} className="w-full">
                  {savingCuenta ? 'Guardando...' : (editingCuenta ? 'Guardar cambios' : 'Crear cuenta')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      )}

      {/* TAB: Configuración (solo SUPER_ADMIN) */}
      {isSuperAdmin && (
        <TabsContent value="configuracion">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Configuración de SumUp
              </CardTitle>
              <CardDescription>
                Define cómo se gestionan los terminales entre locales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Modo de asignación de terminales</Label>
                  <p className="text-sm text-gray-500 mb-3">
                    Define si cada terminal pertenece a un local o si todos son compartidos
                  </p>
                  <Select
                    value={config.modoAsignacion}
                    onValueChange={(value: 'COMPARTIDO' | 'POR_LOCAL') => 
                      setConfig({ ...config, modoAsignacion: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMPARTIDO">
                        <div className="flex flex-col">
                          <span className="font-medium">🌐 Compartido</span>
                          <span className="text-xs text-gray-500">Todos los terminales accesibles desde cualquier local</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="POR_LOCAL">
                        <div className="flex flex-col">
                          <span className="font-medium">🏢 Por Local</span>
                          <span className="text-xs text-gray-500">Cada terminal asignado a un local específico</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Tracking por local</Label>
                    <p className="text-sm text-gray-500">
                      Registrar qué local genera cada cobro (recomendado)
                    </p>
                  </div>
                  <Switch
                    checked={config.trackingPorLocal}
                    onCheckedChange={(checked) => setConfig({ ...config, trackingPorLocal: checked })}
                  />
                </div>
              </div>

              <Button onClick={handleSaveConfig} disabled={savingConfig} className="w-full">
                {savingConfig ? 'Guardando...' : 'Guardar Configuración'}
              </Button>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-medium text-amber-900 mb-2">⚠️ Nota importante</h4>
                <p className="text-sm text-amber-800">
                  Independientemente del modo, siempre se registra qué local genera cada cobro 
                  para tener un control de facturación por local en el TPV.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {/* TAB: Transacciones */}
      <TabsContent value="transacciones">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Transacciones SumUp
            </CardTitle>
            <CardDescription>
              Historial de cobros realizados con los terminales
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Totales */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-700">{totales.pagadas.toFixed(2)} €</p>
                <p className="text-sm text-green-600">Cobrados</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-yellow-700">{totales.pendientes.toFixed(2)} €</p>
                <p className="text-sm text-yellow-600">Pendientes</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-700">{totales.total.toFixed(2)} €</p>
                <p className="text-sm text-blue-600">Total</p>
              </div>
            </div>

            {/* Lista de transacciones */}
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay transacciones registradas
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.slice(0, 20).map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(t.status)}>
                        {t.status === 'PAID' ? 'Pagado' : t.status === 'PENDING' ? 'Pendiente' : t.status}
                      </Badge>
                      <div>
                        <p className="font-medium">{t.amount.toFixed(2)} €</p>
                        <p className="text-xs text-gray-500">{t.description || 'Sin descripción'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{t.localNombre}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(t.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
