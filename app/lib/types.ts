
export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  telefono: string;
  direccion?: string;
  documento?: string;
  clienteParking?: boolean;
  clienteVIP?: boolean;
  clienteEmpresa?: boolean;
  // Trazabilidad
  creadoPorId?: string;
  creadoPorNombre?: string;
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
  // Trazabilidad
  creadoPorId?: string;
  creadoPorNombre?: string;
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
  imagen?: string;
  categoria?: CategoriaVehiculo;
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
  ticketsUsados?: number;
  clienteId: string;
  vehiculoId: string;
  cliente?: Cliente;
  vehiculo?: Vehiculo;
  servicios?: CitaServicio[];
  factura?: Factura;
  // Trazabilidad
  creadoPorId?: string;
  creadoPorNombre?: string;
  completadoPorId?: string;
  completadoPorNombre?: string;
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
  LISTO_PARA_RECOGER = "LISTO_PARA_RECOGER",
  COMPLETADA = "COMPLETADA",
  PAGO_POSTERIOR = "PAGO_POSTERIOR",
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
  TPV_SUMUP = "TPV_SUMUP",
  TPV_UNICAJA = "TPV_UNICAJA",
  REVOLUT = "REVOLUT",
}

export enum RolUsuario {
  SUPER_ADMIN = "SUPER_ADMIN",
  GRUPO_ADMIN = "GRUPO_ADMIN",
  ADMIN = "ADMIN",
  OPERADOR = "OPERADOR",
  CLIENTE = "CLIENTE",
}

export enum CategoriaVehiculo {
  PEQUENO = "PEQUENO",
  MEDIO = "MEDIO", 
  GRANDE = "GRANDE",
  SUPER_GRANDE = "SUPER_GRANDE",
}

export interface Usuario {
  id: string;
  name?: string;
  email: string;
  role: RolUsuario;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
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

export interface GaleriaAntesDespues {
  id: string;
  titulo: string;
  descripcion?: string;
  imagenAntes: string;
  imagenDespues: string;
  servicio: string;
  vehiculo: string;
  categoria: CategoriaVehiculo;
  destacado: boolean;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioTrabajo {
  id: string;
  titulo: string;
  descripcion?: string;
  imagenes: string[];
  servicio: string;
  vehiculo: string;
  categoria: CategoriaVehiculo;
  destacado: boolean;
  activo: boolean;
  fechaRealizado?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImagenCategoria {
  id: string;
  categoria: CategoriaVehiculo;
  imagen: string;
  descripcion?: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
