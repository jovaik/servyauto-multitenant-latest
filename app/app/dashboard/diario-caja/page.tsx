import { Metadata } from 'next'
import DiarioCajaView from './diario-caja-view'

export const metadata: Metadata = {
  title: 'Diario de Caja | ServyAuto Manager',
  description: 'Libro de caja con ingresos y gastos unificados',
}

export default function DiarioCajaPage() {
  return <DiarioCajaView />
}
