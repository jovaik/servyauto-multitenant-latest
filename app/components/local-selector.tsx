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

  // Mostrar para SUPER_ADMIN y GRUPO_ADMIN (encargados de zona)
  const canSelectLocal = userRole === 'SUPER_ADMIN' || userRole === 'GRUPO_ADMIN';

  useEffect(() => {
    if (canSelectLocal) {
      loadLocales();
    }
  }, [canSelectLocal]);

  const loadLocales = async () => {
    try {
      // El API ya filtra automáticamente según el rol del usuario
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

  // No mostrar si no tiene permiso o no hay locales
  if (!canSelectLocal || loading) return null;
  if (locales.length === 0) return null;

  const selectedLocal = locales.find(l => l.id === selectedLocalId);

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 min-w-[200px] max-w-[350px]">
            <Store className="h-4 w-4 flex-shrink-0" />
            {selectedLocalName ? (
              <span className="truncate text-left flex-1">{selectedLocalName}</span>
            ) : (
              <span className="text-gray-500 flex-1 text-left">Todos los locales</span>
            )}
            <ChevronDown className="h-3 w-3 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[350px]">
          <DropdownMenuItem 
            onClick={() => clearSelectedLocal()}
            className={!selectedLocalId ? 'bg-blue-50' : ''}
          >
            <Store className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
            <span className="flex-1">Todos los locales</span>
            {!selectedLocalId && <Badge variant="secondary" className="ml-2 flex-shrink-0">Actual</Badge>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {locales.map((local) => (
            <DropdownMenuItem
              key={local.id}
              onClick={() => setSelectedLocal(local.id, local.nombre)}
              className={selectedLocalId === local.id ? 'bg-blue-50' : ''}
            >
              <div 
                className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                style={{ backgroundColor: local.colorPrimario || '#3b82f6' }}
              />
              <div className="flex-1 min-w-0">
                <span className="block font-medium truncate">{local.nombre}</span>
                {local.nombreComercial && local.nombreComercial !== local.nombre && (
                  <span className="block text-xs text-gray-500 truncate">{local.nombreComercial}</span>
                )}
              </div>
              {selectedLocalId === local.id && <Badge variant="secondary" className="ml-2 flex-shrink-0">Actual</Badge>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {selectedLocalId && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => clearSelectedLocal()}
          className="h-8 w-8 p-0 flex-shrink-0"
          title="Ver todos los locales"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
