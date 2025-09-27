
import { ReservasPublicPage } from './reservas-public-page'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reserva tu Cita - ServyAuto Manager',
  description: 'Solicita una cita para el mantenimiento y reparación de tu vehículo',
}

export default function PublicReservasPage() {
  return <ReservasPublicPage />
}
