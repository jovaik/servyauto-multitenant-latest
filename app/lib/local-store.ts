/**
 * Store de Zustand para manejar el local seleccionado (cliente)
 * Usado principalmente por superadmin para filtrar datos por local
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LocalStore {
  selectedLocalId: string | null;
  selectedLocalName: string | null;
  setSelectedLocal: (id: string | null, name: string | null) => void;
  clearSelectedLocal: () => void;
}

export const useLocalStore = create<LocalStore>()(
  persist(
    (set) => ({
      selectedLocalId: null,
      selectedLocalName: null,
      setSelectedLocal: (id, name) => set({ selectedLocalId: id, selectedLocalName: name }),
      clearSelectedLocal: () => set({ selectedLocalId: null, selectedLocalName: null }),
    }),
    {
      name: 'servyauto-local-store',
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
