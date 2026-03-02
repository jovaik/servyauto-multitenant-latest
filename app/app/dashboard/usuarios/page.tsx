
import { Metadata } from 'next';
import { UsuariosView } from './usuarios-view';

export const metadata: Metadata = {
  title: 'Gestión de Usuarios | ServyAuto',
  description: 'Administración de usuarios del sistema',
};

export default function UsuariosPage() {
  return <UsuariosView />;
}
