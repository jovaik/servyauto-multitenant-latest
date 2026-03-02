import { Metadata } from 'next';
import IngresosAdicionalesView from './ingresos-adicionales-view';

export const metadata: Metadata = {
  title: 'Ingresos Adicionales | ServyAuto',
  description: 'Gestión de ingresos adicionales (parking, máquinas, etc.)',
};

export default function IngresosAdicionalesPage() {
  return <IngresosAdicionalesView />;
}
