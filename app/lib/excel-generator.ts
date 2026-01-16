import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export async function exportarGastosExcel(
  gastos: any[],
  totales: { total: number; porCategoria: Record<string, number> },
  periodo: string
) {
  const XLSX = await import('xlsx')
  
  // Datos de gastos
  const datosGastos = gastos.map(g => ({
    'Fecha': format(new Date(g.fecha), 'dd/MM/yyyy', { locale: es }),
    'Concepto': g.concepto || '-',
    'Categoría': g.tipoGasto || g.categoria || '-',
    'Proveedor': g.proveedor || '-',
    'Método Pago': g.metodoPago || '-',
    'Importe (€)': (g.importe || g.total || 0).toFixed(2),
    'IVA (%)': g.iva || 21,
    'Creado Por': g.creadoPorNombre || '-'
  }))

  // Resumen por categoría
  const resumenCategoria = Object.entries(totales.porCategoria).map(([cat, importe]) => ({
    'Categoría': cat,
    'Total (€)': importe.toFixed(2)
  }))

  // Crear libro de Excel
  const wb = XLSX.utils.book_new()
  
  // Hoja de gastos detallados
  const wsGastos = XLSX.utils.json_to_sheet(datosGastos)
  XLSX.utils.book_append_sheet(wb, wsGastos, 'Gastos')
  
  // Hoja de resumen
  const wsResumen = XLSX.utils.json_to_sheet(resumenCategoria)
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')
  
  // Descargar
  const nombreArchivo = `Gastos_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`
  XLSX.writeFile(wb, nombreArchivo)
}

export async function exportarFacturacionExcel(
  facturas: any[],
  totales: { total: number; tickets: number; facturas: number },
  periodo: string
) {
  const XLSX = await import('xlsx')
  
  const datosFacturas = facturas.map(f => ({
    'Fecha': format(new Date(f.fecha), 'dd/MM/yyyy', { locale: es }),
    'Nº Documento': f.numero || '-',
    'Tipo': f.tipo || '-',
    'Cliente': f.cliente?.nombre || '-',
    'Concepto': f.concepto || '-',
    'Base (€)': (f.base || 0).toFixed(2),
    'IVA (€)': (f.iva || 0).toFixed(2),
    'Total (€)': (f.total || 0).toFixed(2),
    'Método Pago': f.metodoPago || '-',
    'Estado': f.estado || '-'
  }))

  const resumen = [
    { 'Concepto': 'Total Tickets', 'Importe (€)': totales.tickets.toFixed(2) },
    { 'Concepto': 'Total Facturas', 'Importe (€)': totales.facturas.toFixed(2) },
    { 'Concepto': 'TOTAL GENERAL', 'Importe (€)': totales.total.toFixed(2) }
  ]

  const wb = XLSX.utils.book_new()
  
  const wsFacturas = XLSX.utils.json_to_sheet(datosFacturas)
  XLSX.utils.book_append_sheet(wb, wsFacturas, 'Facturación')
  
  const wsResumen = XLSX.utils.json_to_sheet(resumen)
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')
  
  const nombreArchivo = `Facturacion_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`
  XLSX.writeFile(wb, nombreArchivo)
}

export async function exportarDiarioCajaExcel(
  movimientos: any[],
  totales: { ingresos: number; gastos: number; balance: number; efectivo: number; tpvSumUp: number; tpvUnicaja: number },
  periodo: string
) {
  const XLSX = await import('xlsx')
  
  const datosMovimientos = movimientos.map(m => ({
    'Fecha': format(new Date(m.fecha), 'dd/MM/yyyy HH:mm', { locale: es }),
    'Tipo': m.tipo === 'INGRESO' ? 'Ingreso' : 'Gasto',
    'Concepto': m.concepto || '-',
    'Categoría': m.categoria || '-',
    'Método Pago': m.metodoPago || '-',
    'Importe (€)': m.tipo === 'INGRESO' ? m.importe.toFixed(2) : `-${m.importe.toFixed(2)}`,
    'Creado Por': m.creadoPor || '-'
  }))

  const resumen = [
    { 'Concepto': 'Total Ingresos', 'Importe (€)': totales.ingresos.toFixed(2) },
    { 'Concepto': 'Total Gastos', 'Importe (€)': `-${totales.gastos.toFixed(2)}` },
    { 'Concepto': 'BALANCE', 'Importe (€)': totales.balance.toFixed(2) },
    { 'Concepto': '', 'Importe (€)': '' },
    { 'Concepto': 'Efectivo', 'Importe (€)': totales.efectivo.toFixed(2) },
    { 'Concepto': 'TPV SumUp', 'Importe (€)': totales.tpvSumUp.toFixed(2) },
    { 'Concepto': 'TPV Unicaja', 'Importe (€)': totales.tpvUnicaja.toFixed(2) }
  ]

  const wb = XLSX.utils.book_new()
  
  const wsMovimientos = XLSX.utils.json_to_sheet(datosMovimientos)
  XLSX.utils.book_append_sheet(wb, wsMovimientos, 'Movimientos')
  
  const wsResumen = XLSX.utils.json_to_sheet(resumen)
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')
  
  const nombreArchivo = `Diario_Caja_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`
  XLSX.writeFile(wb, nombreArchivo)
}

export async function exportarCierresCajaExcel(cierres: any[]) {
  const XLSX = await import('xlsx')
  
  const datosCierres = cierres.map(c => ({
    'Fecha': format(new Date(c.fecha), 'dd/MM/yyyy', { locale: es }),
    'Ingresos (€)': (c.totalIngresos || 0).toFixed(2),
    'Gastos (€)': (c.totalGastos || 0).toFixed(2),
    'Balance (€)': (c.balance || 0).toFixed(2),
    'Efectivo (€)': (c.efectivo || 0).toFixed(2),
    'TPV SumUp (€)': (c.tpvSumUp || 0).toFixed(2),
    'TPV Unicaja (€)': (c.tpvUnicaja || 0).toFixed(2),
    'Observaciones': c.observaciones || '-'
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(datosCierres)
  XLSX.utils.book_append_sheet(wb, ws, 'Cierres de Caja')
  
  const nombreArchivo = `Cierres_Caja_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`
  XLSX.writeFile(wb, nombreArchivo)
}

export async function exportarClientesExcel(clientes: any[]) {
  const XLSX = await import('xlsx')
  
  const datosClientes = clientes.map(c => ({
    'Nombre': c.nombre || '-',
    'Email': c.email || '-',
    'Teléfono': c.telefono || '-',
    'DNI/CIF': c.dni || '-',
    'Dirección': c.direccion || '-',
    'Ciudad': c.ciudad || '-',
    'Código Postal': c.codigoPostal || '-',
    'Fecha Alta': c.createdAt ? format(new Date(c.createdAt), 'dd/MM/yyyy', { locale: es }) : '-'
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(datosClientes)
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
  
  const nombreArchivo = `Clientes_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`
  XLSX.writeFile(wb, nombreArchivo)
}

export async function exportarVehiculosExcel(vehiculos: any[]) {
  const XLSX = await import('xlsx')
  
  const datosVehiculos = vehiculos.map(v => ({
    'Matrícula': v.matricula || '-',
    'Marca': v.marca || '-',
    'Modelo': v.modelo || '-',
    'Color': v.color || '-',
    'Año': v.ano || '-',
    'Propietario': v.cliente?.nombre || '-',
    'Teléfono': v.cliente?.telefono || '-',
    'Fecha Alta': v.createdAt ? format(new Date(v.createdAt), 'dd/MM/yyyy', { locale: es }) : '-'
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(datosVehiculos)
  XLSX.utils.book_append_sheet(wb, ws, 'Vehículos')
  
  const nombreArchivo = `Vehiculos_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`
  XLSX.writeFile(wb, nombreArchivo)
}
