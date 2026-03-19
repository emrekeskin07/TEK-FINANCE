import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const PRIVACY_MODE_STORAGE_KEY = 'tek-finance:privacy-mode';
const PrivacyContext = createContext(null);

const readInitialPrivacyState = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(PRIVACY_MODE_STORAGE_KEY) === '1';
};

export function PrivacyProvider({ children }) {
  const [isPrivacyActive, setIsPrivacyActive] = useState(readInitialPrivacyState);

  const setPrivacyActive = useCallback((valueOrUpdater) => {
    setIsPrivacyActive((prev) => {
      const next = typeof valueOrUpdater === 'function'
        ? valueOrUpdater(prev)
        : Boolean(valueOrUpdater);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PRIVACY_MODE_STORAGE_KEY, next ? '1' : '0');
      }

      return next;
    });
  }, []);

  const togglePrivacy = useCallback(() => {
    setPrivacyActive((prev) => !prev);
  }, [setPrivacyActive]);

  const maskValue = useCallback((value) => {
    if (!isPrivacyActive) {
      return value;
    }

    const text = value === null || value === undefined
      ? ''
      : (typeof value === 'number' ? value.toLocaleString('tr-TR') : String(value));

    return text.replace(/\d/g, '•');
  }, [isPrivacyActive]);

  const contextValue = useMemo(() => ({
    isPrivacyActive,
    setIsPrivacyActive: setPrivacyActive,
    togglePrivacy,
    maskValue,
  }), [isPrivacyActive, setPrivacyActive, togglePrivacy, maskValue]);

  return (
    <PrivacyContext.Provider value={contextValue}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);

  if (!context) {
    throw new Error('usePrivacy must be used within PrivacyProvider.');
  }

  return context;
}