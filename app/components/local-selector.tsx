'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedLocalId, selectedLocalName, setSelectedLocal, clearSelectedLocal } = useLocalStore();

  // Mostrar para SUPER_ADMIN y GRUPO_ADMIN (encargados de zona)
  const canSelectLocal = userRole === 'SUPER_ADMIN' || userRole === 'GRUPO_ADMIN';

  useEffect(() => {
    console.log('🏪 LocalSelector - userRole:', userRole, '| canSelectLocal:', canSelectLocal);
    if (canSelectLocal) {
      loadLocales(0);
    }
  }, [canSelectLocal, userRole]);

  const loadLocales = async (attempt: number) => {
    const maxRetries = 3;
    try {
      // El API ya filtra automáticamente según el rol del usuario
      const res = await fetch('/api/locales');
      if (res.ok) {
        const data = await res.json();
        console.log('🏪 Respuesta API locales:', data);
        
        // Asegurar que data es un array
        if (!Array.isArray(data)) {
          console.error('🏪 Error: La respuesta no es un array:', data);
          if (attempt < maxRetries) {
            console.log(`🏪 Reintentando (${attempt + 1}/${maxRetries})...`);
            setTimeout(() => loadLocales(attempt + 1), 2000 * (attempt + 1));
            return;
          }
          setLocales([]);
          return;
        }
        
        const activeLocales = data.filter((l: any) => l.activo);
        console.log('🏪 Locales activos:', activeLocales.length, activeLocales.map((l: any) => l.nombre));
        setLocales(activeLocales);
        setLoading(false);
      } else {
        console.error('🏪 Error en respuesta:', res.status);
        if (attempt < maxRetries) {
          console.log(`🏪 Reintentando (${attempt + 1}/${maxRetries})...`);
          setTimeout(() => loadLocales(attempt + 1), 2000 * (attempt + 1));
          return;
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('Error cargando locales:', error);
      if (attempt < maxRetries) {
        console.log(`🏪 Reintentando (${attempt + 1}/${maxRetries})...`);
        setTimeout(() => loadLocales(attempt + 1), 2000 * (attempt + 1));
        return;
      }
      setLoading(false);
    }
  };

  // Función para cambiar local y refrescar datos
  const handleSelectLocal = (id: string | null, name: string | null) => {
    console.log('🔄 Cambiando local a:', name || 'Todos');
    if (id) {
      setSelectedLocal(id, name);
    } else {
      clearSelectedLocal();
    }
    // Pequeño delay para que el store se actualice antes del refresh
    setTimeout(() => {
      router.refresh();
    }, 100);
  };

  // No mostrar si no tiene permiso
  if (!canSelectLocal) return null;
  
  // Mostrar loading mientras carga
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled className="gap-2 min-w-[200px]">
          <Store className="h-4 w-4" />
          <span className="text-gray-400">Cargando locales...</span>
        </Button>
      </div>
    );
  }
  
  // Si no hay locales asignados, mostrar mensaje con opción de reintentar
  if (locales.length === 0) {
    console.log('🏪 No hay locales para mostrar en selector');
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-orange-600 border-orange-300 cursor-pointer hover:bg-orange-50"
          onClick={() => { setLoading(true); loadLocales(0); }}>
          <Store className="h-3 w-3 mr-1" />
          Sin locales — Toca para reintentar
        </Badge>
      </div>
    );
  }

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
            onClick={() => handleSelectLocal(null, null)}
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
              onClick={() => handleSelectLocal(local.id, local.nombre)}
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
          onClick={() => handleSelectLocal(null, null)}
          className="h-8 w-8 p-0 flex-shrink-0"
          title="Ver todos los locales"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
