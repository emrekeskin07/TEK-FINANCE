import { useState, useEffect, useCallback } from 'react';
import {
  THEME_STORAGE_KEY,
  DEFAULT_THEME_ID,
  resolveThemeId,
  applyThemeToRoot,
  isDarkThemeId,
} from '../utils/themePresets';

const LAST_DARK_THEME_STORAGE_KEY = 'tek-finance:last-dark-theme';
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'tek-finance:sidebar-collapsed';
const INSIGHT_TONE_STORAGE_KEY = 'tek-finance:insight-tone';

export function useAppConfig() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTheme, setActiveTheme] = useState(DEFAULT_THEME_ID);
  const [insightTone, setInsightTone] = useState('coaching');
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedTheme = resolveThemeId(window.localStorage.getItem(THEME_STORAGE_KEY));
    setActiveTheme(savedTheme);
    applyThemeToRoot(savedTheme);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const resolvedTheme = applyThemeToRoot(activeTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, resolvedTheme);

    if (isDarkThemeId(resolvedTheme)) {
      window.localStorage.setItem(LAST_DARK_THEME_STORAGE_KEY, resolvedTheme);
    }
  }, [activeTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    setIsSidebarCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1');

    const storedTone = String(window.localStorage.getItem(INSIGHT_TONE_STORAGE_KEY) || 'coaching').trim();
    setInsightTone(storedTone === 'neutral' ? 'neutral' : 'coaching');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, isSidebarCollapsed ? '1' : '0');
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(INSIGHT_TONE_STORAGE_KEY, insightTone === 'neutral' ? 'neutral' : 'coaching');
  }, [insightTone]);

  const handleToggleThemeMode = useCallback(() => {
    if (typeof window === 'undefined') {
      setActiveTheme((prev) => (isDarkThemeId(prev) ? DEFAULT_THEME_ID : 'deep-ocean'));
      return;
    }

    const isCurrentlyDark = isDarkThemeId(activeTheme);

    if (isCurrentlyDark) {
      setActiveTheme(DEFAULT_THEME_ID);
      return;
    }

    const savedDarkTheme = resolveThemeId(window.localStorage.getItem(LAST_DARK_THEME_STORAGE_KEY));
    const nextDarkTheme = isDarkThemeId(savedDarkTheme) ? savedDarkTheme : 'deep-ocean';
    setActiveTheme(nextDarkTheme);
  }, [activeTheme]);

  const handleSetThemeMode = useCallback((mode) => {
    if (mode === 'light') {
      setActiveTheme(DEFAULT_THEME_ID);
      return;
    }

    if (mode === 'dark') {
      if (typeof window === 'undefined') {
        setActiveTheme('deep-ocean');
        return;
      }

      const savedDarkTheme = resolveThemeId(window.localStorage.getItem(LAST_DARK_THEME_STORAGE_KEY));
      const nextDarkTheme = isDarkThemeId(savedDarkTheme) ? savedDarkTheme : 'deep-ocean';
      setActiveTheme(nextDarkTheme);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncViewportSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    syncViewportSize();
    window.addEventListener('resize', syncViewportSize);

    return () => {
      window.removeEventListener('resize', syncViewportSize);
    };
  }, []);

  return {
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    activeTheme,
    insightTone,
    setInsightTone,
    viewportSize,
    handleToggleThemeMode,
    handleSetThemeMode,
  };
}
