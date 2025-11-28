import { Metadata } from 'next'
import ServiciosTallerView from './servicios-taller-view'

export const metadata: Metadata = {
  title: 'Servicios de Taller | ServyAuto',
  description: 'Gestión de servicios de taller (baterías, frenos, etc.)'
}

export default function ServiciosTallerPage() {
  return <ServiciosTallerView />
}
