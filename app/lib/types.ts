
export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  telefono: string;
  direccion?: string;
  dni?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehiculo {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  color?: string;
  matricula: string;
  kilometraje?: number;
  motor?: string;
  combustible?: string;
  observaciones?: string;
  clienteId: string;
  cliente?: Cliente;
  createdAt: Date;
  updatedAt: Date;
}

export interface Servicio {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  duracion: number;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cita {
  id: string;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
  box: string;
  estado: EstadoCita;
  observaciones?: string;
  metodoPago?: MetodoPago;
  total?: number;
  clienteId: string;
  vehiculoId: string;
  cliente?: Cliente;
  vehiculo?: Vehiculo;
  servicios?: CitaServicio[];
  factura?: Factura;
  createdAt: Date;
  updatedAt: Date;
}

export interface CitaServicio {
  id: string;
  citaId: string;
  servicioId: string;
  precio: number;
  servicio?: Servicio;
}

export interface Factura {
  id: string;
  numero: string;
  fecha: Date;
  subtotal: number;
  iva: number;
  total: number;
  estado: EstadoFactura;
  clienteId: string;
  citaId?: string;
  cliente?: Cliente;
  items?: FacturaItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FacturaItem {
  id: string;
  descripcion: string;
  cantidad: number;
  precio: number;
  total: number;
  facturaId: string;
}

export enum EstadoCita {
  PENDIENTE = "PENDIENTE",
  CONFIRMADA = "CONFIRMADA", 
  EN_PROCESO = "EN_PROCESO",
  COMPLETADA = "COMPLETADA",
  CANCELADA = "CANCELADA",
  NO_SHOW = "NO_SHOW",
}

export enum EstadoFactura {
  PENDIENTE = "PENDIENTE",
  PAGADA = "PAGADA",
  VENCIDA = "VENCIDA",
  CANCELADA = "CANCELADA",
}

export enum MetodoPago {
  EFECTIVO = "EFECTIVO",
  TARJETA_SUMUP = "TARJETA_SUMUP",
  TPV_UNICAJA = "TPV_UNICAJA",
}

export interface DashboardStats {
  citasHoy: number;
  facturacionMensual: number;
  clientesTotal: number;
  citasPendientes: number;
}

export interface AgendaFilter {
  box?: string;
  estado?: EstadoCita;
  cliente?: string;
}

export interface CalendarSlot {
  time: string;
  box1?: Cita;
  box2?: Cita;
  box3?: Cita;
}
