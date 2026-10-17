// Cálculo de casillas oficiales del Modelo 303 (IVA, régimen general) y
// un resumen orientativo del Modelo 130 (IRPF, estimación directa).
// A partir de las facturas de ventas (IVA repercutido) y de gastos (IVA soportado)
// que ya maneja la exportación de IVA.

function r2(n: number): number {
  return Math.round((n || 0) * 100) / 100
}

export interface FilaDevengado {
  tipo: number // % de IVA
  base: number // base imponible
  cuota: number // cuota de IVA
}

export interface Modelo303 {
  // IVA devengado (repercutido) agrupado por tipo impositivo (máx. 3 filas)
  devengado: FilaDevengado[]
  // Casillas régimen general - IVA devengado
  casilla01: number; casilla02: number; casilla03: number
  casilla04: number; casilla05: number; casilla06: number
  casilla07: number; casilla08: number; casilla09: number
  casilla27: number // Total cuota devengada
  // IVA deducible
  casilla28: number // Base operaciones interiores corrientes
  casilla29: number // Cuota operaciones interiores corrientes
  casilla45: number // Total a deducir
  casilla46: number // Resultado régimen general (27 - 45)
  // Resultado de la autoliquidación
  casilla64: number
  casilla65: number // % atribuible a la Administración del Estado
  casilla66: number
  casilla69: number // Resultado
  casilla71: number // Resultado de la autoliquidación
  // Totales de apoyo
  baseVentas: number; ivaVentas: number
  baseCompras: number; ivaCompras: number
}

export function calcularModelo303(ventas: any[], compras: any[]): Modelo303 {
  // Agrupar ventas por tipo de IVA
  const grupos = new Map<number, { base: number; cuota: number }>()
  for (const v of ventas) {
    const base = v.subtotal || 0
    const cuota = v.iva || 0
    const tipo = base > 0 ? Math.round((cuota / base) * 100) : 0
    const g = grupos.get(tipo) || { base: 0, cuota: 0 }
    g.base += base
    g.cuota += cuota
    grupos.set(tipo, g)
  }

  const devengado: FilaDevengado[] = Array.from(grupos.entries())
    .map(([tipo, g]) => ({ tipo, base: r2(g.base), cuota: r2(g.cuota) }))
    .sort((a, b) => b.tipo - a.tipo) // 21% primero

  const fila = (i: number): FilaDevengado => devengado[i] || { tipo: 0, base: 0, cuota: 0 }
  const f0 = fila(0)
  const f1 = fila(1)
  const f2 = fila(2)

  const casilla27 = r2(devengado.reduce((s, f) => s + f.cuota, 0))

  // IVA soportado (operaciones interiores corrientes)
  let baseCompras = 0
  let ivaCompras = 0
  for (const c of compras) {
    const rate = (c.iva || 0) / 100
    const base = (c.importe || 0) / (1 + rate)
    baseCompras += base
    ivaCompras += (c.importe || 0) - base
  }
  const casilla28 = r2(baseCompras)
  const casilla29 = r2(ivaCompras)
  const casilla45 = casilla29
  const casilla46 = r2(casilla27 - casilla45)

  const baseVentas = r2(devengado.reduce((s, f) => s + f.base, 0))
  const ivaVentas = casilla27

  return {
    devengado,
    casilla01: f0.base, casilla02: f0.tipo, casilla03: f0.cuota,
    casilla04: f1.base, casilla05: f1.tipo, casilla06: f1.cuota,
    casilla07: f2.base, casilla08: f2.tipo, casilla09: f2.cuota,
    casilla27,
    casilla28, casilla29,
    casilla45,
    casilla46,
    casilla64: casilla46,
    casilla65: 100,
    casilla66: casilla46,
    casilla69: casilla46,
    casilla71: casilla46,
    baseVentas, ivaVentas,
    baseCompras: casilla28, ivaCompras: casilla29,
  }
}

export interface Modelo130 {
  casilla01: number // Ingresos computables (acumulado del ejercicio)
  casilla02: number // Gastos deducibles (acumulado del ejercicio)
  casilla03: number // Rendimiento neto (01 - 02)
  casilla04: number // 20% del rendimiento neto (si es positivo)
  casilla07: number // Pago fraccionado previo (antes de restar pagos anteriores)
}

// Modelo 130: los importes son ACUMULADOS desde el 1 de enero hasta el fin del período.
// Es orientativo: no incluye pagos fraccionados de trimestres anteriores (casilla 12),
// que deben restarse manualmente en la Sede.
export function calcularModelo130(ingresosAcumulados: number, gastosAcumulados: number): Modelo130 {
  const casilla01 = r2(ingresosAcumulados)
  const casilla02 = r2(gastosAcumulados)
  const casilla03 = r2(casilla01 - casilla02)
  const casilla04 = r2(casilla03 > 0 ? casilla03 * 0.2 : 0)
  return { casilla01, casilla02, casilla03, casilla04, casilla07: casilla04 }
}
