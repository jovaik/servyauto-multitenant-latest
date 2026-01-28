import { Metadata } from 'next'
import ProveedoresView from './proveedores-view'

export const metadata: Metadata = {
  title: 'Proveedores | ServyAuto',
}

export default function ProveedoresPage() {
  return <ProveedoresView />
}
