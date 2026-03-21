import { useState, useCallback } from 'react';

export function useAppNavigation({
  navigate,
  resolvePathFromPage,
  setIsCommandBarVisible,
  aiCommandBarRef,
  setIsSidebarOpen,
  setActiveAssetCategory,
}) {
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);

  const navigateToPage = useCallback((nextPage) => {
    navigate(resolvePathFromPage(nextPage));
  }, [navigate, resolvePathFromPage]);

  const handleOpenFabQuickAdd = useCallback(() => {
    navigate('/');
    setIsCommandBarVisible(true);
    window.setTimeout(() => {
      aiCommandBarRef.current?.focus?.();
    }, 120);
  }, [navigate, setIsCommandBarVisible, aiCommandBarRef]);

  const handleToggleAlertDrawer = useCallback(() => {
    setIsAlertDrawerOpen((prev) => !prev);
  }, []);

  const handleCloseAlertDrawer = useCallback(() => {
    setIsAlertDrawerOpen(false);
  }, []);

  const handleOpenInflationFromAlert = useCallback(() => {
    navigateToPage('analysis');
    setIsSidebarOpen(false);
    setIsAlertDrawerOpen(false);
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  }, [navigateToPage, setIsSidebarOpen]);

  const handleSidebarNavigate = useCallback((nextPage) => {
    navigateToPage(nextPage);
    setIsSidebarOpen(false);
  }, [navigateToPage, setIsSidebarOpen]);

  const handleHeaderSearchNavigate = useCallback((queryText) => {
    const normalized = String(queryText || '').toLocaleLowerCase('tr-TR').trim();

    if (!normalized) {
      return;
    }

    if (normalized.includes('dashboard') || normalized.includes('özet') || normalized.includes('ozet')) {
      navigateToPage('dashboard');
      return;
    }

    if (normalized.includes('portföy') || normalized.includes('portfoy') || normalized.includes('varlık')) {
      navigateToPage('portfolio');
      return;
    }

    if (normalized.includes('işlem') || normalized.includes('islem') || normalized.includes('kayıt') || normalized.includes('kayit')) {
      navigateToPage('operations');
      return;
    }

    if (normalized.includes('analiz') || normalized.includes('enflasyon') || normalized.includes('kıyas') || normalized.includes('kiyas')) {
      navigateToPage('analysis');
      return;
    }

    if (normalized.includes('ai') || normalized.includes('asistan') || normalized.includes('öneri') || normalized.includes('oneri') || normalized.includes('strateji')) {
      navigateToPage('ai-assistant');
      return;
    }

    if (normalized.includes('ayar')) {
      navigateToPage('ayarlar');
    }
  }, [navigateToPage]);

  const handleNavigateToGoalFromAsset = useCallback((goalKey) => {
    navigateToPage('dashboard');
    window.setTimeout(() => {
      document.getElementById('dashboard-goal-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }, [navigateToPage]);

  const handleNavigateToAssetsForGoal = useCallback((goalKey) => {
    const map = {
      ev: 'Değerli Maden',
      araba: 'Döviz',
      emeklilik: 'Hisse Senedi',
    };

    navigateToPage('portfolio');
    setActiveAssetCategory(map[String(goalKey || '').trim()] || 'Tümü');
  }, [navigateToPage, setActiveAssetCategory]);

  return {
    isAlertDrawerOpen,
    handleToggleAlertDrawer,
    handleCloseAlertDrawer,
    handleOpenInflationFromAlert,
    handleOpenFabQuickAdd,
    handleHeaderSearchNavigate,
    handleSidebarNavigate,
    handleNavigateToGoalFromAsset,
    handleNavigateToAssetsForGoal,
    navigateToPage,
  };
}
