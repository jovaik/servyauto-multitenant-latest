'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Plus,
  ParkingCircle,
  Banknote,
  CreditCard,
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
  Building2,
  DollarSign,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface IngresoAdicional {
  id: string;
  concepto: string;
  descripcion?: string;
  importe: number;
  fecha: string;
  metodoPago: string;
  observaciones?: string;
  creadoPorNombre?: string;
  local?: {
    id: string;
    nombre: string;
    nombreComercial?: string;
  };
}

const CONCEPTOS_PREDEFINIDOS = [
  'Recaudación Parking',
  'Máquina Expendedora',
  'Alquiler de Espacio',
  'Comisión Servicios',
  'Venta de Productos',
  'Otros Ingresos',
];

export default function IngresosAdicionalesView() {
  const [ingresos, setIngresos] = useState<IngresoAdicional[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIngreso, setEditingIngreso] = useState<IngresoAdicional | null>(null);
  
  // Filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  
  // Formulario
  const [formData, setFormData] = useState({
    concepto: '',
    conceptoPersonalizado: '',
    descripcion: '',
    importe: '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    metodoPago: 'EFECTIVO',
    observaciones: '',
  });

  const loadIngresos = async () => {
    try {
      let url = '/api/ingresos-adicionales';
      const params = new URLSearchParams();
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin) params.append('fechaFin', fechaFin);
      if (params.toString()) url += '?' + params.toString();

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setIngresos(data);
      }
    } catch (error) {
      console.error('Error cargando ingresos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIngresos();
  }, [fechaInicio, fechaFin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const concepto = formData.concepto === 'OTRO' 
      ? formData.conceptoPersonalizado 
      : formData.concepto;

    if (!concepto || !formData.importe) {
      alert('Concepto e importe son obligatorios');
      return;
    }

    try {
      const url = editingIngreso 
        ? `/api/ingresos-adicionales/${editingIngreso.id}`
        : '/api/ingresos-adicionales';
      
      const response = await fetch(url, {
        method: editingIngreso ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concepto,
          descripcion: formData.descripcion || null,
          importe: parseFloat(formData.importe),
          fecha: formData.fecha,
          metodoPago: formData.metodoPago,
          observaciones: formData.observaciones || null,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        resetForm();
        loadIngresos();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar el ingreso');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este ingreso?')) return;
    
    try {
      const response = await fetch(`/api/ingresos-adicionales/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        loadIngresos();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleEdit = (ingreso: IngresoAdicional) => {
    setEditingIngreso(ingreso);
    const isPreset = CONCEPTOS_PREDEFINIDOS.includes(ingreso.concepto);
    setFormData({
      concepto: isPreset ? ingreso.concepto : 'OTRO',
      conceptoPersonalizado: isPreset ? '' : ingreso.concepto,
      descripcion: ingreso.descripcion || '',
      importe: ingreso.importe.toString(),
      fecha: format(new Date(ingreso.fecha), 'yyyy-MM-dd'),
      metodoPago: ingreso.metodoPago,
      observaciones: ingreso.observaciones || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      concepto: '',
      conceptoPersonalizado: '',
      descripcion: '',
      importe: '',
      fecha: format(new Date(), 'yyyy-MM-dd'),
      metodoPago: 'EFECTIVO',
      observaciones: '',
    });
    setEditingIngreso(null);
  };

  const totalIngresos = ingresos.reduce((sum, i) => sum + i.importe, 0);
  const totalEfectivo = ingresos
    .filter(i => i.metodoPago === 'EFECTIVO')
    .reduce((sum, i) => sum + i.importe, 0);
  const totalTarjeta = ingresos
    .filter(i => i.metodoPago !== 'EFECTIVO')
    .reduce((sum, i) => sum + i.importe, 0);

  const getMetodoPagoIcon = (metodo: string) => {
    switch (metodo) {
      case 'EFECTIVO':
        return <Banknote className="h-4 w-4 text-green-600" />;
      case 'TPV_SUMUP':
      case 'TPV_UNICAJA':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getMetodoPagoLabel = (metodo: string) => {
    switch (metodo) {
      case 'EFECTIVO': return 'Efectivo';
      case 'TPV_SUMUP': return 'TPV SumUp';
      case 'TPV_UNICAJA': return 'TPV Unicaja';
      default: return metodo;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ParkingCircle className="h-6 w-6 text-blue-600" />
            Ingresos Adicionales
          </h1>
          <p className="text-muted-foreground">
            Parking, máquinas expendedoras y otros ingresos
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Ingreso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingIngreso ? 'Editar Ingreso' : 'Nuevo Ingreso Adicional'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Concepto *</Label>
                <Select
                  value={formData.concepto}
                  onValueChange={(value) => setFormData({ ...formData, concepto: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un concepto" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONCEPTOS_PREDEFINIDOS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                    <SelectItem value="OTRO">Otro (especificar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.concepto === 'OTRO' && (
                <div>
                  <Label>Concepto Personalizado *</Label>
                  <Input
                    value={formData.conceptoPersonalizado}
                    onChange={(e) => setFormData({ ...formData, conceptoPersonalizado: e.target.value })}
                    placeholder="Describe el concepto"
                  />
                </div>
              )}

              <div>
                <Label>Descripción (opcional)</Label>
                <Input
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Detalles adicionales"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Importe (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.importe}
                    onChange={(e) => setFormData({ ...formData, importe: e.target.value })}
                    placeholder="0.00"
                    className="text-lg font-semibold"
                  />
                </div>
                <div>
                  <Label>Fecha</Label>
                  <Input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Método de Pago</Label>
                <Select
                  value={formData.metodoPago}
                  onValueChange={(value) => setFormData({ ...formData, metodoPago: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO">
                      <span className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" /> Efectivo
                      </span>
                    </SelectItem>
                    <SelectItem value="TPV_SUMUP">
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" /> TPV SumUp
                      </span>
                    </SelectItem>
                    <SelectItem value="TPV_UNICAJA">
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" /> TPV Unicaja
                      </span>
                    </SelectItem>
                    <SelectItem value="REVOLUT">
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" /> Revolut
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Observaciones</Label>
                <Textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  {editingIngreso ? 'Guardar Cambios' : 'Registrar Ingreso'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtrar por fecha:</span>
            </div>
            <div>
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-40"
              />
            </div>
            {(fechaInicio || fechaFin) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFechaInicio('');
                  setFechaFin('');
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ingresos Adicionales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              €{totalIngresos.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {ingresos.length} registro{ingresos.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Banknote className="h-4 w-4 text-green-600" />
              Efectivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              €{totalEfectivo.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              Tarjeta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              €{totalTarjeta.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead>Método Pago</TableHead>
                <TableHead>Registrado por</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : ingresos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay ingresos adicionales registrados
                  </TableCell>
                </TableRow>
              ) : (
                ingresos.map((ingreso) => (
                  <TableRow key={ingreso.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(ingreso.fecha), 'dd/MM/yyyy', { locale: es })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{ingreso.concepto}</div>
                        {ingreso.descripcion && (
                          <div className="text-xs text-muted-foreground">{ingreso.descripcion}</div>
                        )}
                        {ingreso.local && (
                          <Badge variant="outline" className="mt-1">
                            <Building2 className="h-3 w-3 mr-1" />
                            {ingreso.local.nombreComercial || ingreso.local.nombre}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-lg font-semibold text-green-600">
                        €{ingreso.importe.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMetodoPagoIcon(ingreso.metodoPago)}
                        <span className="text-sm">{getMetodoPagoLabel(ingreso.metodoPago)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {ingreso.creadoPorNombre || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(ingreso)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(ingreso.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
