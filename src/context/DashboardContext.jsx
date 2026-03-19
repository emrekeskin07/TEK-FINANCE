import React, { createContext, useContext } from 'react';

const DashboardContext = createContext(null);

export function DashboardProvider({ value, children }) {
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardData() {
  const contextValue = useContext(DashboardContext);

  if (!contextValue) {
    throw new Error('useDashboardData must be used within DashboardProvider');
  }

  return contextValue;
}
