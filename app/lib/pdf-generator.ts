import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

interface MovimientoPDF {
  fecha: Date
  tipo: 'INGRESO' | 'GASTO'
  concepto: string
  categoria: string
  metodoPago?: string
  importe: number
  creadoPor?: string
}

interface TotalesPDF {
  ingresos: number
  gastos: number
  balance: number
  efectivo: number
  tpvSumUp: number
  tpvUnicaja: number
}

export function generarPDFDiarioCaja(
  movimientos: MovimientoPDF[],
  totales: TotalesPDF,
  periodo: string
) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Título
  doc.setFontSize(20)
  doc.setTextColor(40, 40, 40)
  doc.text('Diario de Caja', pageWidth / 2, 20, { align: 'center' })
  
  // Subtítulo con período
  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text(`Período: ${periodo}`, pageWidth / 2, 28, { align: 'center' })
  doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, pageWidth / 2, 34, { align: 'center' })
  
  // Resumen por método de pago
  doc.setFontSize(14)
  doc.setTextColor(40, 40, 40)
  doc.text('Resumen por Método de Pago', 14, 48)
  
  doc.autoTable({
    startY: 52,
    head: [['Método', 'Balance']],
    body: [
      ['Efectivo', `€${totales.efectivo.toFixed(2)}`],
      ['TPV SumUp', `€${totales.tpvSumUp.toFixed(2)}`],
      ['TPV Unicaja', `€${totales.tpvUnicaja.toFixed(2)}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: {
      1: { halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  })
  
  // Resumen general
  const y1 = doc.lastAutoTable.finalY + 10
  doc.text('Resumen General', 14, y1)
  
  doc.autoTable({
    startY: y1 + 4,
    head: [['Concepto', 'Importe']],
    body: [
      ['Total Ingresos', `€${totales.ingresos.toFixed(2)}`],
      ['Total Gastos', `€${totales.gastos.toFixed(2)}`],
      ['BALANCE', `€${totales.balance.toFixed(2)}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [34, 197, 94] },
    columnStyles: {
      1: { halign: 'right' }
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data: any) => {
      if (data.row.index === 2 && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold'
      }
    }
  })
  
  // Tabla de movimientos
  const y2 = doc.lastAutoTable.finalY + 15
  doc.setFontSize(14)
  doc.text('Detalle de Movimientos', 14, y2)
  
  const tableData = movimientos.map(m => [
    format(new Date(m.fecha), 'dd/MM/yyyy', { locale: es }),
    m.tipo === 'INGRESO' ? 'Ingreso' : 'Gasto',
    m.concepto.substring(0, 30),
    m.categoria,
    m.metodoPago || '-',
    `${m.tipo === 'INGRESO' ? '+' : '-'}€${m.importe.toFixed(2)}`,
    m.creadoPor || '-'
  ])
  
  doc.autoTable({
    startY: y2 + 4,
    head: [['Fecha', 'Tipo', 'Concepto', 'Categoría', 'M. Pago', 'Importe', 'Usuario']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [249, 115, 22], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 18 },
      2: { cellWidth: 45 },
      3: { cellWidth: 25 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 25 }
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data: any) => {
      if (data.column.index === 5 && data.section === 'body') {
        const text = data.cell.raw as string
        if (text.startsWith('+')) {
          data.cell.styles.textColor = [34, 197, 94]
        } else if (text.startsWith('-')) {
          data.cell.styles.textColor = [239, 68, 68]
        }
      }
    }
  })
  
  // Pie de página
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `ServyAuto - Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }
  
  // Guardar
  const nombreArchivo = `Diario_Caja_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`
  doc.save(nombreArchivo)
}

export function generarPDFCierreCaja(
  cierre: any,
  detalles: any
) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Título
  doc.setFontSize(20)
  doc.setTextColor(40, 40, 40)
  doc.text('Cierre de Caja', pageWidth / 2, 20, { align: 'center' })
  
  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text(`Fecha: ${format(new Date(cierre.fecha), "dd/MM/yyyy", { locale: es })}`, pageWidth / 2, 28, { align: 'center' })
  
  // Resumen
  doc.autoTable({
    startY: 40,
    head: [['Concepto', 'Importe']],
    body: [
      ['Total Ingresos', `€${cierre.totalIngresos?.toFixed(2) || '0.00'}`],
      ['Total Gastos', `€${cierre.totalGastos?.toFixed(2) || '0.00'}`],
      ['Efectivo', `€${cierre.totalEfectivo?.toFixed(2) || '0.00'}`],
      ['TPV SumUp', `€${cierre.totalTPVSumUp?.toFixed(2) || '0.00'}`],
      ['TPV Unicaja', `€${cierre.totalTPVUnicaja?.toFixed(2) || '0.00'}`],
      ['BALANCE TOTAL', `€${cierre.balance?.toFixed(2) || '0.00'}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: {
      1: { halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  })
  
  const nombreArchivo = `Cierre_Caja_${format(new Date(cierre.fecha), 'yyyy-MM-dd')}.pdf`
  doc.save(nombreArchivo)
}

export function generarPDFGastos(
  gastos: any[],
  totales: { total: number; porCategoria: Record<string, number> },
  periodo: string
) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Título
  doc.setFontSize(20)
  doc.setTextColor(40, 40, 40)
  doc.text('Informe de Gastos', pageWidth / 2, 20, { align: 'center' })
  
  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text(`Período: ${periodo}`, pageWidth / 2, 28, { align: 'center' })
  doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, pageWidth / 2, 34, { align: 'center' })
  
  // Total
  doc.setFontSize(16)
  doc.setTextColor(239, 68, 68)
  doc.text(`Total Gastos: €${totales.total.toFixed(2)}`, pageWidth / 2, 48, { align: 'center' })
  
  // Por categoría
  doc.setFontSize(14)
  doc.setTextColor(40, 40, 40)
  doc.text('Gastos por Categoría', 14, 60)
  
  const categoriaData = Object.entries(totales.porCategoria).map(([cat, importe]) => [
    cat,
    `€${importe.toFixed(2)}`
  ])
  
  doc.autoTable({
    startY: 64,
    head: [['Categoría', 'Importe']],
    body: categoriaData,
    theme: 'grid',
    headStyles: { fillColor: [239, 68, 68] },
    columnStyles: {
      1: { halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  })
  
  // Detalle
  const y1 = doc.lastAutoTable.finalY + 15
  doc.text('Detalle de Gastos', 14, y1)
  
  const tableData = gastos.map(g => [
    format(new Date(g.fecha), 'dd/MM/yyyy', { locale: es }),
    g.concepto?.substring(0, 35) || '-',
    g.tipoGasto || g.categoria || '-',
    g.proveedor?.substring(0, 20) || '-',
    `€${(g.importe || g.total || 0).toFixed(2)}`
  ])
  
  doc.autoTable({
    startY: y1 + 4,
    head: [['Fecha', 'Concepto', 'Categoría', 'Proveedor', 'Importe']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [239, 68, 68], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      4: { halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  })
  
  // Pie de página
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `ServyAuto - Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }
  
  const nombreArchivo = `Informe_Gastos_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`
  doc.save(nombreArchivo)
}

export function generarPDFFacturacion(
  facturas: any[],
  totales: { total: number; tickets: number; facturas: number },
  periodo: string
) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // Título
  doc.setFontSize(20)
  doc.setTextColor(40, 40, 40)
  doc.text('Informe de Facturación', pageWidth / 2, 20, { align: 'center' })
  
  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text(`Período: ${periodo}`, pageWidth / 2, 28, { align: 'center' })
  doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, pageWidth / 2, 34, { align: 'center' })
  
  // Resumen
  doc.setFontSize(14)
  doc.setTextColor(40, 40, 40)
  doc.text('Resumen', 14, 48)
  
  doc.autoTable({
    startY: 52,
    head: [['Concepto', 'Importe']],
    body: [
      ['Total Tickets', `€${totales.tickets.toFixed(2)}`],
      ['Total Facturas', `€${totales.facturas.toFixed(2)}`],
      ['TOTAL INGRESOS', `€${totales.total.toFixed(2)}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [34, 197, 94] },
    columnStyles: {
      1: { halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  })
  
  // Detalle
  const y1 = doc.lastAutoTable.finalY + 15
  doc.text('Detalle de Facturas/Tickets', 14, y1)
  
  const tableData = facturas.map(f => [
    format(new Date(f.fecha), 'dd/MM/yyyy', { locale: es }),
    f.numero,
    f.tipo,
    `${f.cliente?.nombre || ''} ${f.cliente?.apellido || ''}`.trim() || '-',
    f.metodoPago || '-',
    `€${f.total.toFixed(2)}`
  ])
  
  doc.autoTable({
    startY: y1 + 4,
    head: [['Fecha', 'Número', 'Tipo', 'Cliente', 'M. Pago', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      5: { halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  })
  
  // Pie de página
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `ServyAuto - Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }
  
  const nombreArchivo = `Informe_Facturacion_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`
  doc.save(nombreArchivo)
}
