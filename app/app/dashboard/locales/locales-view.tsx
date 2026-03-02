'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Building2, MapPin, Phone, Mail, Palette, Users, Calendar, FileText, Pencil, Trash2, ImageIcon, UserPlus, Shield, UserMinus, Link } from 'lucide-react';
import Image from 'next/image';

interface Usuario {
  id: string;
  name: string | null;
  email: string;
  role: string;
  activo: boolean;
}

interface Local {
  id: string;
  nombre: string;
  nombreComercial: string | null;
  logo: string | null;
  direccion: string | null;
  ciudad: string | null;
  codigoPostal: string | null;
  telefono: string | null;
  email: string | null;
  colorPrimario: string | null;
  activo: boolean;
  _count: {
    usuarios: number;
    clientes: number;
    citas: number;
    facturas: number;
    gastos: number;
  };
}

export default function LocalesView() {
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocal, setEditingLocal] = useState<Local | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Estado para gestión de usuarios del local
  const [usuariosDialogOpen, setUsuariosDialogOpen] = useState(false);
  const [selectedLocalForUsers, setSelectedLocalForUsers] = useState<Local | null>(null);
  const [usuariosDelLocal, setUsuariosDelLocal] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [nuevoUsuarioDialogOpen, setNuevoUsuarioDialogOpen] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    name: '',
    email: '',
    password: '',
    role: 'OPERADOR',
  });
  
  // Estado para asignar usuarios existentes
  const [todosUsuarios, setTodosUsuarios] = useState<(Usuario & { localId?: string | null })[]>([]);
  const [asignarUsuarioDialogOpen, setAsignarUsuarioDialogOpen] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string>('');
  
  const [formData, setFormData] = useState({
    nombre: '',
    nombreComercial: '',
    logo: '',
    direccion: '',
    ciudad: '',
    codigoPostal: '',
    telefono: '',
    email: '',
    colorPrimario: '#3b82f6',
    activo: true,
  });

  useEffect(() => {
    loadLocales();
  }, []);

  const loadLocales = async () => {
    try {
      const res = await fetch('/api/locales');
      if (res.ok) {
        const data = await res.json();
        setLocales(data);
      }
    } catch (error) {
      console.error('Error cargando locales:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los locales', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Funciones para gestión de usuarios del local
  const openUsuariosDialog = async (local: Local) => {
    setSelectedLocalForUsers(local);
    setUsuariosDialogOpen(true);
    await loadUsuariosDelLocal(local.id);
    await loadTodosUsuarios();
  };

  const loadUsuariosDelLocal = async (localId: string) => {
    setLoadingUsuarios(true);
    try {
      const res = await fetch(`/api/usuarios?localId=${localId}`);
      if (res.ok) {
        const data = await res.json();
        setUsuariosDelLocal(data);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const loadTodosUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios');
      if (res.ok) {
        const data = await res.json();
        setTodosUsuarios(data);
      }
    } catch (error) {
      console.error('Error cargando todos los usuarios:', error);
    }
  };

  const handleAsignarUsuarioExistente = async () => {
    if (!selectedLocalForUsers || !usuarioSeleccionado) return;

    try {
      const res = await fetch(`/api/usuarios/${usuarioSeleccionado}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localId: selectedLocalForUsers.id }),
      });

      if (res.ok) {
        toast({ title: 'Usuario asignado', description: 'El usuario ahora tiene acceso a este local' });
        setAsignarUsuarioDialogOpen(false);
        setUsuarioSeleccionado('');
        await loadUsuariosDelLocal(selectedLocalForUsers.id);
        await loadTodosUsuarios();
        loadLocales();
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: error.error || 'Error al asignar usuario', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error asignando usuario:', error);
      toast({ title: 'Error', description: 'Error al asignar usuario', variant: 'destructive' });
    }
  };

  const handleDesasignarUsuario = async (usuarioId: string) => {
    if (!confirm('¿Quitar este usuario del local? Perderá acceso a los datos de este local.')) return;

    try {
      const res = await fetch(`/api/usuarios/${usuarioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ localId: null }),
      });

      if (res.ok) {
        toast({ title: 'Usuario desasignado', description: 'El usuario ya no tiene acceso a este local' });
        if (selectedLocalForUsers) {
          await loadUsuariosDelLocal(selectedLocalForUsers.id);
          loadLocales();
        }
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: error.error || 'Error al desasignar', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error desasignando usuario:', error);
    }
  };

  // Usuarios disponibles para asignar (no están en este local y no son SuperAdmin)
  const usuariosDisponibles = todosUsuarios.filter(
    u => u.localId !== selectedLocalForUsers?.id && u.role !== 'SUPER_ADMIN'
  );

  const handleCrearUsuarioLocal = async () => {
    if (!selectedLocalForUsers) return;
    
    if (!nuevoUsuario.name || !nuevoUsuario.email || !nuevoUsuario.password) {
      toast({ title: 'Error', description: 'Nombre, email y contraseña son obligatorios', variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevoUsuario,
          localId: selectedLocalForUsers.id,
          activo: true,
        }),
      });

      if (res.ok) {
        toast({ title: 'Usuario creado', description: `${nuevoUsuario.name} ahora tiene acceso al local` });
        setNuevoUsuarioDialogOpen(false);
        setNuevoUsuario({ name: '', email: '', password: '', role: 'OPERADOR' });
        await loadUsuariosDelLocal(selectedLocalForUsers.id);
        loadLocales(); // Recargar para actualizar el contador
      } else {
        const error = await res.json();
        toast({ title: 'Error', description: error.error || 'Error al crear usuario', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error creando usuario:', error);
      toast({ title: 'Error', description: 'Error al crear usuario', variant: 'destructive' });
    }
  };

  const getRoleBadge = (role: string) => {
    const roles: { [key: string]: { label: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' } } = {
      SUPER_ADMIN: { label: 'Super Admin', variant: 'destructive' },
      ADMIN: { label: 'Admin', variant: 'default' },
      OPERADOR: { label: 'Operador', variant: 'outline' },
      MECANICO: { label: 'Mecánico', variant: 'secondary' },
    };
    const roleInfo = roles[role] || { label: role, variant: 'outline' as const };
    return <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Solo se permiten imágenes', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'La imagen no puede superar 5MB', variant: 'destructive' });
      return;
    }

    setUploadingLogo(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formDataUpload,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, logo: data.url }));
        toast({ title: 'Logo subido', description: 'El logo se ha subido correctamente' });
      } else {
        throw new Error('Error al subir');
      }
    } catch (error) {
      console.error('Error subiendo logo:', error);
      toast({ title: 'Error', description: 'No se pudo subir el logo', variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }

    try {
      const url = editingLocal ? `/api/locales/${editingLocal.id}` : '/api/locales';
      const method = editingLocal ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast({ title: editingLocal ? 'Local actualizado' : 'Local creado', description: 'Los cambios se han guardado correctamente' });
        setDialogOpen(false);
        resetForm();
        loadLocales();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Error al guardar');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleEdit = (local: Local) => {
    setEditingLocal(local);
    setFormData({
      nombre: local.nombre,
      nombreComercial: local.nombreComercial || '',
      logo: local.logo || '',
      direccion: local.direccion || '',
      ciudad: local.ciudad || '',
      codigoPostal: local.codigoPostal || '',
      telefono: local.telefono || '',
      email: local.email || '',
      colorPrimario: local.colorPrimario || '#3b82f6',
      activo: local.activo,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (local: Local) => {
    if (!confirm(`¿Eliminar el local "${local.nombre}"?`)) return;

    try {
      const res = await fetch(`/api/locales/${local.id}`, { method: 'DELETE' });
      
      if (res.ok) {
        toast({ title: 'Local eliminado' });
        loadLocales();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Error al eliminar');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setEditingLocal(null);
    setFormData({
      nombre: '',
      nombreComercial: '',
      logo: '',
      direccion: '',
      ciudad: '',
      codigoPostal: '',
      telefono: '',
      email: '',
      colorPrimario: '#3b82f6',
      activo: true,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Locales</h1>
          <p className="text-gray-500">Administra los diferentes locales o sucursales</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Local
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLocal ? 'Editar Local' : 'Nuevo Local'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Logo */}
              <div className="space-y-2">
                <Label>Logo del Local</Label>
                <div className="flex items-center gap-4">
                  {formData.logo ? (
                    <div className="relative w-24 h-24 border rounded-lg overflow-hidden">
                      <Image src={formData.logo} alt="Logo" fill className="object-contain" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 border rounded-lg flex items-center justify-center bg-gray-50">
                      <ImageIcon className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="max-w-xs"
                    />
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG. Máximo 5MB</p>
                  </div>
                </div>
              </div>

              {/* Nombre y Nombre Comercial */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del Local *</Label>
                  <Input
                    id="nombre"
                    placeholder="Ej: Local Centro"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombreComercial">Marca Comercial</Label>
                  <Input
                    id="nombreComercial"
                    placeholder="Ej: LavaCar Premium"
                    value={formData.nombreComercial}
                    onChange={(e) => setFormData({ ...formData, nombreComercial: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">Si tiene una marca diferente</p>
                </div>
              </div>

              {/* Dirección */}
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  placeholder="Calle, número..."
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                />
              </div>

              {/* Ciudad y CP */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input
                    id="ciudad"
                    placeholder="Ciudad"
                    value={formData.ciudad}
                    onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codigoPostal">Código Postal</Label>
                  <Input
                    id="codigoPostal"
                    placeholder="29001"
                    value={formData.codigoPostal}
                    onChange={(e) => setFormData({ ...formData, codigoPostal: e.target.value })}
                  />
                </div>
              </div>

              {/* Teléfono y Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    placeholder="952 000 000"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="local@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Color Primario */}
              <div className="space-y-2">
                <Label htmlFor="colorPrimario">Color Corporativo</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="colorPrimario"
                    type="color"
                    value={formData.colorPrimario}
                    onChange={(e) => setFormData({ ...formData, colorPrimario: e.target.value })}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.colorPrimario}
                    onChange={(e) => setFormData({ ...formData, colorPrimario: e.target.value })}
                    className="w-32"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>

              {/* Activo */}
              {editingLocal && (
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.activo}
                    onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                  />
                  <Label>Local activo</Label>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>
                {editingLocal ? 'Guardar Cambios' : 'Crear Local'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {locales.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay locales configurados</h3>
            <p className="text-gray-500 text-center mb-4">Crea tu primer local para empezar a organizar los datos por sucursal</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Local
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locales.map((local) => (
            <Card key={local.id} className={`relative ${!local.activo ? 'opacity-60' : ''}`}>
              {local.colorPrimario && (
                <div 
                  className="absolute top-0 left-0 right-0 h-1 rounded-t-lg" 
                  style={{ backgroundColor: local.colorPrimario }}
                />
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {local.logo ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border">
                        <Image src={local.logo} alt={local.nombre} fill className="object-contain" />
                      </div>
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: local.colorPrimario || '#3b82f6' }}
                      >
                        {local.nombre.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{local.nombre}</CardTitle>
                      {local.nombreComercial && (
                        <CardDescription className="text-sm">{local.nombreComercial}</CardDescription>
                      )}
                    </div>
                  </div>
                  <Badge variant={local.activo ? 'default' : 'secondary'}>
                    {local.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  {local.direccion && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{local.direccion}{local.ciudad && `, ${local.ciudad}`}</span>
                    </div>
                  )}
                  {local.telefono && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{local.telefono}</span>
                    </div>
                  )}
                  {local.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{local.email}</span>
                    </div>
                  )}
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-4 gap-2 py-3 border-t border-b">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500">
                      <Shield className="h-3 w-3" />
                    </div>
                    <div className="font-semibold">{local._count.usuarios}</div>
                    <div className="text-xs text-gray-500">Usuarios</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500">
                      <Users className="h-3 w-3" />
                    </div>
                    <div className="font-semibold">{local._count.clientes}</div>
                    <div className="text-xs text-gray-500">Clientes</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500">
                      <Calendar className="h-3 w-3" />
                    </div>
                    <div className="font-semibold">{local._count.citas}</div>
                    <div className="text-xs text-gray-500">Citas</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-500">
                      <FileText className="h-3 w-3" />
                    </div>
                    <div className="font-semibold">{local._count.facturas}</div>
                    <div className="text-xs text-gray-500">Facturas</div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex justify-between gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => openUsuariosDialog(local)}>
                    <UserPlus className="h-4 w-4 mr-1" />
                    Usuarios ({local._count.usuarios})
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(local)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(local)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Diálogo de Usuarios del Local */}
      <Dialog open={usuariosDialogOpen} onOpenChange={setUsuariosDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuarios de {selectedLocalForUsers?.nombreComercial || selectedLocalForUsers?.nombre}
            </DialogTitle>
            <DialogDescription>
              Gestiona quién tiene acceso a este local
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {loadingUsuarios ? (
              <div className="text-center py-4">Cargando usuarios...</div>
            ) : usuariosDelLocal.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No hay usuarios asignados a este local
              </div>
            ) : (
              <div className="space-y-2">
                {usuariosDelLocal.map((usuario) => (
                  <div key={usuario.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{usuario.name || 'Sin nombre'}</div>
                      <div className="text-sm text-gray-500">{usuario.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(usuario.role)}
                      <Badge variant={usuario.activo ? 'default' : 'secondary'}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDesasignarUsuario(usuario.id)}
                        title="Quitar del local"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline"
                className="flex-1" 
                onClick={() => setAsignarUsuarioDialogOpen(true)}
                disabled={usuariosDisponibles.length === 0}
              >
                <Link className="h-4 w-4 mr-2" />
                Asignar Existente
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => setNuevoUsuarioDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Crear Nuevo
              </Button>
            </div>
            {usuariosDisponibles.length === 0 && (
              <p className="text-xs text-gray-500 text-center">No hay usuarios disponibles para asignar</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para asignar usuario existente */}
      <Dialog open={asignarUsuarioDialogOpen} onOpenChange={setAsignarUsuarioDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Usuario Existente</DialogTitle>
            <DialogDescription>
              Selecciona un usuario para asignarlo a {selectedLocalForUsers?.nombre}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Seleccionar Usuario</Label>
              <Select
                value={usuarioSeleccionado}
                onValueChange={setUsuarioSeleccionado}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un usuario..." />
                </SelectTrigger>
                <SelectContent>
                  {usuariosDisponibles.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      <div className="flex items-center gap-2">
                        <span>{usuario.name || usuario.email}</span>
                        <span className="text-gray-400">({usuario.role})</span>
                        {usuario.localId && <span className="text-orange-500 text-xs">(otro local)</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Los usuarios marcados con "(otro local)" serán transferidos a este local
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAsignarUsuarioDialogOpen(false); setUsuarioSeleccionado(''); }}>
              Cancelar
            </Button>
            <Button onClick={handleAsignarUsuarioExistente} disabled={!usuarioSeleccionado}>
              Asignar Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para crear nuevo usuario del local */}
      <Dialog open={nuevoUsuarioDialogOpen} onOpenChange={setNuevoUsuarioDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Usuario para {selectedLocalForUsers?.nombre}</DialogTitle>
            <DialogDescription>
              Este usuario solo podrá ver datos de este local
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={nuevoUsuario.name}
                onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, name: e.target.value })}
                placeholder="Nombre del empleado"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={nuevoUsuario.email}
                onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                placeholder="email@ejemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Contraseña *</Label>
              <Input
                type="password"
                value={nuevoUsuario.password}
                onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
                placeholder="Contraseña de acceso"
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={nuevoUsuario.role}
                onValueChange={(value) => setNuevoUsuario({ ...nuevoUsuario, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin (gestión completa)</SelectItem>
                  <SelectItem value="OPERADOR">Operador (operaciones diarias)</SelectItem>
                  <SelectItem value="MECANICO">Mecánico (solo citas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNuevoUsuarioDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearUsuarioLocal}>
              Crear Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
