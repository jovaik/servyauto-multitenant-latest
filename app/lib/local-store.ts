/**
 * Store de Zustand para manejar el local seleccionado (cliente)
 * Usado principalmente por superadmin para filtrar datos por local
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Evento personalizado para notificar cambios de local
export const LOCAL_CHANGE_EVENT = 'servyauto-local-changed';

interface LocalStore {
  selectedLocalId: string | null;
  selectedLocalName: string | null;
  version: number; // Contador para forzar re-renders
  setSelectedLocal: (id: string | null, name: string | null) => void;
  clearSelectedLocal: () => void;
}

export const useLocalStore = create<LocalStore>()(
  persist(
    (set, get) => ({
      selectedLocalId: null,
      selectedLocalName: null,
      version: 0,
      setSelectedLocal: (id, name) => {
        set({ selectedLocalId: id, selectedLocalName: name, version: get().version + 1 });
        // Disparar evento para que los componentes se recarguen
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(LOCAL_CHANGE_EVENT, { detail: { localId: id, localName: name } }));
        }
      },
      clearSelectedLocal: () => {
        set({ selectedLocalId: null, selectedLocalName: null, version: get().version + 1 });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(LOCAL_CHANGE_EVENT, { detail: { localId: null, localName: null } }));
        }
      },
    }),
    {
      name: 'servyauto-local-store',
      partialize: (state) => ({ 
        selectedLocalId: state.selectedLocalId, 
        selectedLocalName: state.selectedLocalName 
      }),
    }
  )
);

/**
 * Wrapper de fetch que automáticamente incluye el header x-selected-local-id
 */
export function fetchWithLocal(url: string, options: RequestInit = {}): Promise<Response> {
  const state = useLocalStore.getState();
  const headers = new Headers(options.headers);
  
  if (state.selectedLocalId) {
    headers.set('x-selected-local-id', state.selectedLocalId);
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Helper para obtener el selectedLocalId actual (para usar en componentes)
 */
export function getSelectedLocalId(): string | null {
  return useLocalStore.getState().selectedLocalId;
}

/**
 * Hook para escuchar cambios de local y ejecutar una callback
 * Útil para recargar datos cuando el usuario cambia de local
 */
export function useLocalChangeListener(callback: (localId: string | null) => void) {
  if (typeof window === 'undefined') return;
  
  const { useEffect } = require('react');
  
  useEffect(() => {
    const handler = (event: CustomEvent) => {
      callback(event.detail?.localId ?? null);
    };
    
    window.addEventListener(LOCAL_CHANGE_EVENT, handler as EventListener);
    return () => window.removeEventListener(LOCAL_CHANGE_EVENT, handler as EventListener);
  }, [callback]);
}

/**
 * Instala un interceptor global de fetch que automáticamente añade
 * el header x-selected-local-id a todas las peticiones a /api/
 */
export function installFetchInterceptor() {
  if (typeof window === 'undefined') return;
  
  // Evitar instalar múltiples veces
  if ((window as any).__localFetchInterceptorInstalled) return;
  (window as any).__localFetchInterceptorInstalled = true;
  
  const originalFetch = window.fetch;
  
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    
    // Solo interceptar llamadas a /api/
    if (url.startsWith('/api/')) {
      const state = useLocalStore.getState();
      if (state.selectedLocalId) {
        const headers = new Headers(init?.headers);
        headers.set('x-selected-local-id', state.selectedLocalId);
        return originalFetch(input, { ...init, headers });
      }
    }
    
    return originalFetch(input, init);
  };
}
