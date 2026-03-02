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
