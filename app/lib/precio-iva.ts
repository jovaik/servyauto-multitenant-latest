// Los importes persistidos siguen siendo precios finales, IVA incluido.
// La casilla es una calculadora de entrada: no vuelve a sumar IVA al reabrir.
export function precioConIva(precio: number, anadirIva = false): number {
  return Math.round((precio * (anadirIva ? 1.21 : 1) + Number.EPSILON) * 100) / 100
}
export type LineaPrecioIva = { descripcion: string; cantidad: number; precioUnitario: number; anadirIva?: boolean }
export function lineasConPrecioFinal(lineas: LineaPrecioIva[]) {
  return lineas.filter(l => l.descripcion.trim() !== '').map(l => ({
    descripcion: l.descripcion, cantidad: l.cantidad, precioUnitario: precioConIva(l.precioUnitario, l.anadirIva),
  }))
}
