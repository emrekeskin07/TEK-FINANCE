import { createContext, useContext } from 'react';

export const SyncContext = createContext(null);

export function useSyncState() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncState, SyncContext.Provider icinde kullanilmalidir.');
  }

  return context;
}
