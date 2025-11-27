import { Suspense } from 'react'
import ServiciosTallerView from './servicios-taller-view'

export const metadata = {
  title: 'Servicios de Taller | ServyAuto',
  description: 'Gestión de servicios de taller'
}

export default function ServiciosTallerPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ServiciosTallerView />
    </Suspense>
  )
}
