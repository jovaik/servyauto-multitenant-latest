
import { ReservasPublicPage } from './reservas-public-page'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reserva tu Servicio - ServyAuto Manager',
  description: 'Solicita una cita para el lavado y cuidado estético de tu vehículo',
}

export default function PublicReservasPage() {
  return <ReservasPublicPage />
}
