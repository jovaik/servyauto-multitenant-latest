import { Metadata } from 'next'
import { TallerRapidoHub } from './taller-rapido-hub'

export const metadata: Metadata = {
  title: 'Taller Rápido | ServyAuto',
  description: 'Taller rápido: servicios, catálogo de repuestos y línea rápida de servicios'
}

export default function TallerRapidoPage() {
  return <TallerRapidoHub />
}
