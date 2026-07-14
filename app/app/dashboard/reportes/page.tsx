
import { Metadata } from 'next';
import { ReportesView } from './reportes-view';

export const metadata: Metadata = {
  title: 'Reportes | ServyAuto',
  description: 'Generación de reportes por período y local',
};

export default function ReportesPage() {
  return <ReportesView />;
}
