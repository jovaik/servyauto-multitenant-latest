import { Metadata } from 'next';
import LocalesView from './locales-view';

export const metadata: Metadata = {
  title: 'Gestión de Locales | ServyAuto',
  description: 'Administración de locales y sucursales',
};

export default function LocalesPage() {
  return <LocalesView />;
}
