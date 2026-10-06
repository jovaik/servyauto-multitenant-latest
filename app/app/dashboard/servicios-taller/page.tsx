import { Metadata } from 'next'
import ServiciosTallerView from './servicios-taller-view'

export const metadata: Metadata = {
  title: 'Servicios Extras | ServyAuto',
  description: 'Gestión de servicios extras (baterías, frenos, etc.)'
}

export default function ServiciosTallerPage() {
  return <ServiciosTallerView />
}
