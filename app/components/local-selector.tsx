'use client';

import { useState, useEffect } from 'react';
import { Store, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocalStore } from '@/lib/local-store';
import { Badge } from '@/components/ui/badge';

interface Local {
  id: string;
  nombre: string;
  nombreComercial: string | null;
  colorPrimario: string | null;
}

interface LocalSelectorProps {
  userRole?: string;
}

export function LocalSelector({ userRole }: LocalSelectorProps) {
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedLocalId, selectedLocalName, setSelectedLocal, clearSelectedLocal } = useLocalStore();

  // Solo mostrar para SUPER_ADMIN
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  useEffect(() => {
    if (isSuperAdmin) {
      loadLocales();
    }
  }, [isSuperAdmin]);

  const loadLocales = async () => {
    try {
      const res = await fetch('/api/locales');
      if (res.ok) {
        const data = await res.json();
        setLocales(data.filter((l: any) => l.activo));
      }
    } catch (error) {
      console.error('Error cargando locales:', error);
    } finally {
      setLoading(false);
    }
  };

  // No mostrar si no es superadmin o no hay locales
  if (!isSuperAdmin || loading) return null;
  if (locales.length === 0) return null;

  const selectedLocal = locales.find(l => l.id === selectedLocalId);

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Store className="h-4 w-4" />
            {selectedLocalName ? (
              <span className="max-w-[150px] truncate">{selectedLocalName}</span>
            ) : (
              <span className="text-gray-500">Todos los locales</span>
            )}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem 
            onClick={() => clearSelectedLocal()}
            className={!selectedLocalId ? 'bg-blue-50' : ''}
          >
            <Store className="h-4 w-4 mr-2 text-gray-500" />
            <span>Todos los locales</span>
            {!selectedLocalId && <Badge variant="secondary" className="ml-auto">Actual</Badge>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {locales.map((local) => (
            <DropdownMenuItem
              key={local.id}
              onClick={() => setSelectedLocal(local.id, local.nombreComercial || local.nombre)}
              className={selectedLocalId === local.id ? 'bg-blue-50' : ''}
            >
              <div 
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: local.colorPrimario || '#3b82f6' }}
              />
              <span className="truncate">{local.nombreComercial || local.nombre}</span>
              {selectedLocalId === local.id && <Badge variant="secondary" className="ml-auto">Actual</Badge>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {selectedLocalId && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => clearSelectedLocal()}
          className="h-8 w-8 p-0"
          title="Ver todos los locales"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
