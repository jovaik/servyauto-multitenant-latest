import { Metadata } from 'next';
import TransferenciasCajaView from './transferencias-caja-view';

export const metadata: Metadata = {
  title: 'Transferencias de Caja | ServyAuto',
  description: 'Préstamos y aportaciones de caja entre locales',
};

export default function TransferenciasCajaPage() {
  return <TransferenciasCajaView />;
}
