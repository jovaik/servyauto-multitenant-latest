
import { Metadata } from 'next';
import { ActividadView } from './actividad-view';

export const metadata: Metadata = {
  title: 'Registro de Actividad | ServyAuto',
  description: 'Registro de actividad del sistema',
};

export default function ActividadPage() {
  return <ActividadView />;
}
