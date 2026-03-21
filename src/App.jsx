import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import Confetti from 'react-confetti';
import { usePortfolio } from './hooks/usePortfolio';
import { useMarketPrices } from './hooks/useMarketPrices';
import { useAuthSession } from './hooks/useAuthSession';
import { useManualAssets } from './hooks/useManualAssets';
import { useCalculations } from './hooks/useCalculations';
import { useAnimatedCounter } from './hooks/useAnimatedCounter';
import Header from './components/Header';
import GoalTracker from './components/GoalTracker';
import SidebarMenu from './components/SidebarMenu';
import MagicAiInput from './components/MagicAiInput';
import DistributionCard from './components/DistributionCard';
import AssetList from './components/AssetList';
import AlertDrawer from './components/AlertDrawer';
import AssetModal from './components/AssetModal';
import AuthPage from './components/AuthPage';
import MalVarligiPage from './components/MalVarligiPage';
import EnflasyonAnaliziPage from './components/EnflasyonAnaliziPage';
import FinancialStrategyCenterPage from './components/FinancialStrategyCenterPage';
import SmartSuggestionsPage from './components/SmartSuggestionsPage';
import Chart from './components/dashboard/Chart';
import Stats from './components/dashboard/Stats';
import DashboardSkeleton from './components/dashboard/DashboardSkeleton';
import { SyncContext } from './context/SyncContext';
import { DashboardProvider } from './context/DashboardContext';
import { usePrivacy } from './context/PrivacyContext';
import {
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  DEFAULT_THEME_ID,
  resolveThemeId,
  applyThemeToRoot,
  isDarkThemeId,
} from './utils/themePresets';

const LAST_DARK_THEME_STORAGE_KEY = 'tek-finance:last-dark-theme';

const ATH_CELEBRATION_STORAGE_PREFIX = 'tek-finance:ath-celebration';
const ATH_CELEBRATION_DURATION_MS = 3800;
const PAGE_TO_PATH = {
  dashboard: '/',
  'net-worth': '/net-worth',
  enflasyon: '/inflation-analysis',
  'smart-suggestions': '/smart-suggestions',
  hedeflerim: '/goals',
  'strategy-center': '/strategy-center',
  ayarlar: '/settings',
};

const resolvePageFromPath = (pathname) => {
  if (pathname === '/net-worth') {
    return 'net-worth';
  }

  if (pathname === '/inflation-analysis') {
    return 'enflasyon';
  }

  if (pathname === '/smart-suggestions') {
    return 'smart-suggestions';
  }

  if (pathname === '/goals') {
    return 'hedeflerim';
  }

  if (pathname === '/strategy-center') {
    return 'strategy-center';
  }

  if (pathname === '/settings') {
    return 'ayarlar';
  }

  return 'dashboard';
};

const resolvePathFromPage = (page) => PAGE_TO_PATH[page] || '/';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [activeTheme, setActiveTheme] = useState(DEFAULT_THEME_ID);
  const [baseCurrency, setBaseCurrency] = useState('TRY');
  const [sortConfig, setSortConfig] = useState({ key: 'profit', direction: 'desc' });
  const [inflationSource, setInflationSource] = useState('enag');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const { isPrivacyActive, maskValue } = usePrivacy();

  const {
    authUser,
    authLoading,
    authSubmitting,
    handleGoogleSignIn,
    handleEmailSignUp,
    handleEmailSignIn,
    handleSignOut,
  } = useAuthSession();
  const {
    manualAssets,
    manualAssetsLoading,
    setManualAssets,
  } = useManualAssets(authUser?.id);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [editingAssetData, setEditingAssetData] = useState(null);
  const [initialPortfolioName, setInitialPortfolioName] = useState('');
  const [assetModalMode, setAssetModalMode] = useState('buy');
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAthCelebration, setShowAthCelebration] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const athCelebrationTimeoutRef = useRef(null);

  const {
    portfolio,
    isPortfolioLoading,
    isPortfolioMutating,
    addAsset,
    updateAsset,
    removeAsset,
    sellAsset,
    increaseAssetHolding,
    refreshPortfolio,
  } = usePortfolio(authUser?.id, (updatedPort) => {
    if (authUser) {
      updatePrices(updatedPort);
    }
  });
  
  const { marketData, marketChanges, marketMeta, loading, lastUpdated, lastFetchFailed, rates, updatePrices } = useMarketPrices(portfolio);

  const openQuickAddModal = useCallback(() => {
    setIsQuickAddModalOpen(true);
  }, []);

  const closeQuickAddModal = useCallback(() => {
    setIsQuickAddModalOpen(false);
  }, []);

  const handleQuickAddSuccess = useCallback(async () => {
    await refreshPortfolio();
    setIsQuickAddModalOpen(false);
  }, [refreshPortfolio]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    updatePrices();
  }, [authUser, updatePrices]);

  useEffect(() => {
    if (activePage !== 'dashboard' && isQuickAddModalOpen) {
      setIsQuickAddModalOpen(false);
    }
  }, [activePage, isQuickAddModalOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncPageFromLocation = () => {
      const nextPage = resolvePageFromPath(window.location.pathname);
      setActivePage(nextPage);
    };

    syncPageFromLocation();
    window.addEventListener('popstate', syncPageFromLocation);

    return () => {
      window.removeEventListener('popstate', syncPageFromLocation);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextPath = resolvePathFromPage(activePage);
    const currentPath = window.location.pathname || '/';

    if (nextPath !== currentPath) {
      window.history.pushState({}, '', nextPath);
    }
  }, [activePage]);

  useEffect(() => {
    if (lastUpdated instanceof Date) {
      setLastSyncTime(lastUpdated.getTime());
    }
  }, [lastUpdated]);

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

  useEffect(() => () => {
    if (athCelebrationTimeoutRef.current) {
      window.clearTimeout(athCelebrationTimeoutRef.current);
      athCelebrationTimeoutRef.current = null;
    }
  }, []);

  const resolvePortfolioNameFromUrl = () => {
    if (typeof window === 'undefined') {
      return '';
    }

    const params = new URLSearchParams(window.location.search);
    return (params.get('portfolioName') || params.get('portfolio') || '').trim();
  };

  const openAddModal = (context = {}) => {
    const explicitPortfolioName = typeof context === 'string'
      ? context
      : (context?.portfolioName || '');
    const forcePrefill = typeof context === 'object' && context !== null
      ? Boolean(context.forcePrefill)
      : false;
    const prefillData = typeof context === 'object' && context !== null
      ? (context.prefillData || null)
      : null;
    const requestedMode = typeof context === 'object' && context !== null
      ? context.mode
      : 'buy';
    const resolvedMode = requestedMode === 'sell'
      ? 'sell'
      : (requestedMode === 'edit' ? 'edit' : 'buy');

    // Dashboard acilisinda alan bos gelsin; detay sayfasi veya URL'den acilis senaryosunda prefill kullan.
    const resolvedPrefill = String(
      explicitPortfolioName
      || (activePage === 'dashboard' ? '' : resolvePortfolioNameFromUrl())
    ).trim();
    const shouldUsePrefill = Boolean(resolvedPrefill) && (activePage !== 'dashboard' || forcePrefill);

    setAssetModalMode(resolvedMode);
    setInitialPortfolioName(shouldUsePrefill ? resolvedPrefill : '');
    setEditingAssetData(prefillData);
    setEditingAssetId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setAssetModalMode('edit');
    setEditingAssetData(item);
    setEditingAssetId(item.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAssetData(null);
    setEditingAssetId(null);
    setInitialPortfolioName('');
    setAssetModalMode('buy');
  };

  const handleQuickBuyAsset = (item) => {
    if (!item) {
      return;
    }

    const portfolioName = String(item.portfolioName || item.portfolio_name || '').trim();

    openAddModal({
      mode: 'buy',
      portfolioName,
      forcePrefill: true,
      prefillData: {
        ...item,
        amount: '',
      },
    });
  };

  const handleManualRefresh = () => {
    if (!authUser) {
      return;
    }

    // Fiyat verisi sadece frontend state'ini gunceller, Supabase'e geri yazilmaz.
    updatePrices(portfolio);
  };

  const {
    totalValue,
    totalProfit,
    malVarligiManuelToplam,
    dashboardTotalValue,
    dashboardTotalCost,
    profitPercentage,
    portfolioRealReturnPercent,
    bankTotals,
    categoryTotals,
    portfolioCashTotal,
    lineChartData,
    selectedInflationSourceLabel,
    alerts,
    activeAlertCount,
    portfolioNameOptions,
    selectedBank,
    selectedCategory,
    otherBankNames,
    handleBankSelect,
    handleCategorySelect,
    clearFilters,
  } = useCalculations({
    portfolio,
    marketData,
    marketChanges,
    manualAssets,
    inflationSource,
  });

  const animatedProfitPercent = useAnimatedCounter(Number(profitPercentage));

  const triggerCelebration = useCallback((durationMs = ATH_CELEBRATION_DURATION_MS) => {
    if (typeof window === 'undefined') {
      return;
    }

    setShowAthCelebration(true);

    if (athCelebrationTimeoutRef.current) {
      window.clearTimeout(athCelebrationTimeoutRef.current);
    }

    athCelebrationTimeoutRef.current = window.setTimeout(() => {
      setShowAthCelebration(false);
      athCelebrationTimeoutRef.current = null;
    }, durationMs);
  }, []);

  const athStatus = useMemo(() => {
    const series = Array.isArray(lineChartData) ? lineChartData : [];
    const fallbackCurrentValue = Number.isFinite(Number(dashboardTotalValue)) ? Number(dashboardTotalValue) : 0;

    if (series.length < 2) {
      return {
        hasRecordBreak: false,
        currentValue: fallbackCurrentValue,
      };
    }

    const latestPointValue = Number(series[series.length - 1]?.value);
    const currentValue = Number.isFinite(latestPointValue) ? latestPointValue : fallbackCurrentValue;

    const previousHigh = series.slice(0, -1).reduce((maxValue, point) => {
      const value = Number(point?.value);
      return Number.isFinite(value) ? Math.max(maxValue, value) : maxValue;
    }, Number.NEGATIVE_INFINITY);

    return {
      hasRecordBreak: Number.isFinite(previousHigh) && currentValue > (previousHigh + 0.01),
      currentValue,
    };
  }, [lineChartData, dashboardTotalValue]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (activePage !== 'dashboard' || !authUser?.id || !athStatus.hasRecordBreak) {
      return;
    }

    const storageKey = `${ATH_CELEBRATION_STORAGE_PREFIX}:${authUser.id}`;
    const lastCelebratedHigh = Number(window.localStorage.getItem(storageKey) || 0);

    if (athStatus.currentValue <= (lastCelebratedHigh + 0.01)) {
      return;
    }

    window.localStorage.setItem(storageKey, String(athStatus.currentValue));
    triggerCelebration();
  }, [activePage, authUser?.id, athStatus, triggerCelebration]);

  const dashboardGreetingName = authUser?.user_metadata?.full_name
    || authUser?.user_metadata?.name
    || authUser?.email?.split('@')?.[0]
    || 'Kullanıcı';

  const navigateToPage = useCallback((nextPage) => {
    setActivePage(nextPage);
  }, []);

  const handleToggleAlertDrawer = () => {
    setIsAlertDrawerOpen((prev) => !prev);
  };

  const handleCloseAlertDrawer = () => {
    setIsAlertDrawerOpen(false);
  };

  const handleOpenInflationFromAlert = () => {
    navigateToPage('enflasyon');
    setIsSidebarOpen(false);
    setIsAlertDrawerOpen(false);
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  };

  const handleSidebarNavigate = (nextPage) => {
    navigateToPage(nextPage);
    setIsSidebarOpen(false);
  };

  const renderPercentText = (value) => {
    const numericValue = Number(value || 0);
    const percentText = `${numericValue >= 0 ? '+' : '-'}%${Math.abs(numericValue).toFixed(2)}`;
    return isPrivacyActive ? maskValue(percentText) : percentText;
  };

  const showInitialDashboardSkeleton = activePage === 'dashboard'
    && (loading || isPortfolioLoading)
    && portfolio.length === 0;
  const showDashboardMutationSkeleton = activePage === 'dashboard' && isPortfolioMutating;

  const dashboardContextValue = useMemo(() => ({
    portfolio,
    marketData,
    marketMeta,
    loading,
    portfolioLoading: isPortfolioLoading,
    portfolioMutating: isPortfolioMutating,
    lastUpdated,
    baseCurrency,
    rates,
    totalValue,
    dashboardTotalValue,
    bankTotals,
    userId: authUser?.id || null,
    selectedInstitution: selectedBank,
    selectedBank,
    selectedCategory,
    otherBankNames,
    sortConfig,
    setSortConfig,
    lineChartData,
    handleInstitutionSelect: handleBankSelect,
    handleBankSelect,
    handleCategorySelect,
    clearDashboardFilters: clearFilters,
    openEditModal,
    openAddModal,
    onQuickBuyAsset: handleQuickBuyAsset,
    onIncreaseAsset: increaseAssetHolding,
    triggerCelebration,
    sellAsset,
    removeAsset,
  }), [
    portfolio,
    marketData,
    marketMeta,
    loading,
    isPortfolioLoading,
    isPortfolioMutating,
    lastUpdated,
    baseCurrency,
    rates,
    totalValue,
    dashboardTotalValue,
    bankTotals,
    authUser?.id,
    selectedBank,
    selectedCategory,
    otherBankNames,
    sortConfig,
    setSortConfig,
    lineChartData,
    handleBankSelect,
    handleCategorySelect,
    clearFilters,
    openEditModal,
    openAddModal,
    handleQuickBuyAsset,
    increaseAssetHolding,
    triggerCelebration,
    sellAsset,
    removeAsset,
  ]);

  const portfolioDistribution = useMemo(() => {
    const totals = Object.entries(categoryTotals || {})
      .map(([category, value]) => ({ category, value: Number(value || 0) }))
      .filter((item) => Number.isFinite(item.value) && item.value > 0)
      .sort((a, b) => b.value - a.value);

    const grandTotal = totals.reduce((sum, item) => sum + item.value, 0);
    if (grandTotal <= 0) {
      return [];
    }

    return totals.map((item) => ({
      category: item.category,
      value: Number(item.value.toFixed(2)),
      percent: Number(((item.value / grandTotal) * 100).toFixed(2)),
    }));
  }, [categoryTotals]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page text-text-main">
        <div className="text-sm text-text-muted">Oturum kontrol ediliyor...</div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)'
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#1e293b' }
            }
          }}
        />
        <AuthPage
          onGoogleSignIn={handleGoogleSignIn}
          onEmailSignUp={handleEmailSignUp}
          onEmailSignIn={handleEmailSignIn}
          submitting={authSubmitting}
        />
      </>
    );
  }

  return (
    <SyncContext.Provider value={{ lastSyncTime, setLastSyncTime }}>
    <div className="relative min-h-screen overflow-hidden bg-page text-text-main font-sans px-4 py-5 md:px-8 md:py-8 xl:px-10 xl:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-secondary/16 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-accent/14 blur-3xl" />
      </div>

      <div className="relative z-10">
      {showAthCelebration && activePage === 'dashboard' ? (
        <Confetti
          width={viewportSize.width}
          height={viewportSize.height}
          recycle={false}
          numberOfPieces={200}
          colors={['#f59e0b', '#fbbf24', '#fcd34d', '#10b981', '#34d399']}
          gravity={0.12}
          style={{ pointerEvents: 'none', zIndex: 70 }}
        />
      ) : null}

      <Toaster 
        position="top-right" 
        toastOptions={{ 
          style: { 
            background: '#1e293b', 
            color: '#f8fafc', 
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)'
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#1e293b' }
          }
        }} 
      />

      <SidebarMenu
        isOpen={isSidebarOpen}
        activePage={activePage}
        activeTheme={activeTheme}
        themeOptions={THEME_OPTIONS}
        onThemeChange={setActiveTheme}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={handleSidebarNavigate}
        user={authUser}
        onSignOut={handleSignOut}
      />

      <div>
        <Header 
          activePage={activePage}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          baseCurrency={baseCurrency}
          setBaseCurrency={setBaseCurrency}
          openAddModal={openAddModal}
          openQuickAddModal={openQuickAddModal}
          isDarkMode={isDarkThemeId(activeTheme)}
          onToggleTheme={handleToggleThemeMode}
          loading={loading}
          syncFailed={lastFetchFailed}
          onRefresh={handleManualRefresh}
          onToggleAlerts={handleToggleAlertDrawer}
          hasActiveAlerts={activeAlertCount > 0}
          alertCount={activeAlertCount}
        />
      </div>

      <main className="max-w-7xl mx-auto space-y-6 md:space-y-10">
        {activePage === 'dashboard' ? (
          <>
            {showInitialDashboardSkeleton ? (
              <DashboardSkeleton />
            ) : (
              <DashboardProvider value={dashboardContextValue}>
                <div className="relative grid grid-cols-1 gap-4 p-3 sm:p-4 md:grid-cols-12 md:gap-6 md:p-8">
                  <Stats
                    greetingName={dashboardGreetingName}
                    totalProfit={totalProfit}
                    profitPercentageValue={animatedProfitPercent}
                    dashboardTotalValue={dashboardTotalValue}
                    totalValue={totalValue}
                    malVarligiManuelToplam={malVarligiManuelToplam}
                    portfolioRealReturnPercent={portfolioRealReturnPercent}
                    selectedInflationSourceLabel={selectedInflationSourceLabel}
                    baseCurrency={baseCurrency}
                    rates={rates}
                    renderPercent={() => renderPercentText(animatedProfitPercent)}
                    renderRealReturn={() => (
                      isPrivacyActive
                        ? maskValue(`${portfolioRealReturnPercent >= 0 ? '+' : '-'}%${Math.abs(portfolioRealReturnPercent).toFixed(2)}`)
                        : `${portfolioRealReturnPercent >= 0 ? '+' : '-'}%${Math.abs(portfolioRealReturnPercent).toFixed(2)}`
                    )}
                  />

                  <GoalTracker />

                  <Chart />

                  <DistributionCard />

                  <AssetList />

                  {showDashboardMutationSkeleton ? (
                    <div className="pointer-events-none absolute inset-0 z-20 rounded-2xl bg-slate-950/25 backdrop-blur-[1px]" aria-hidden="true">
                      <div className="grid h-full grid-cols-1 gap-4 p-3 sm:p-4 md:grid-cols-12 md:gap-6 md:p-8">
                        <div className="skeleton-ui col-span-12 h-20 rounded-2xl" />
                        <div className="skeleton-ui col-span-12 md:col-span-8 h-28 rounded-2xl" />
                        <div className="skeleton-ui col-span-12 md:col-span-4 h-28 rounded-2xl" />
                      </div>
                    </div>
                  ) : null}
                </div>
              </DashboardProvider>
            )}
          </>
        ) : activePage === 'hedeflerim' ? (
          <DashboardProvider value={dashboardContextValue}>
            <div className="grid grid-cols-1 gap-4 p-3 sm:p-4 md:grid-cols-12 md:gap-6 md:p-8">
              <GoalTracker />
            </div>
          </DashboardProvider>
        ) : activePage === 'net-worth' ? (
          <div className="w-full max-w-7xl mx-auto">
            <MalVarligiPage
              portfolioCashTotal={portfolioCashTotal}
              manualAssets={manualAssets}
              manualAssetsLoading={manualAssetsLoading}
              onManualAssetsChange={setManualAssets}
              userId={authUser.id}
              marketData={marketData}
              rates={rates}
            />
          </div>
        ) : activePage === 'strategy-center' ? (
          <FinancialStrategyCenterPage portfolioDistribution={portfolioDistribution} />
        ) : activePage === 'smart-suggestions' ? (
          <SmartSuggestionsPage
            portfolioDistribution={portfolioDistribution}
            dashboardTotalValue={dashboardTotalValue}
          />
        ) : activePage === 'ayarlar' ? (
          <section className="mx-auto w-full max-w-5xl rounded-3xl border border-white/10 bg-slate-900/45 p-6 shadow-[0_30px_90px_rgba(2,6,23,0.58)] backdrop-blur-xl md:p-8">
            <h2 className="text-xl font-black text-text-main">Ayarlar</h2>
            <p className="mt-2 text-sm text-text-muted">
              Profil ve oturum islemleri sol menunun alt kismina tasindi. Tema degisikligi ve hesap yonetimi bu panelden kontrol edilebilir.
            </p>
          </section>
        ) : (
          <div>
            <EnflasyonAnaliziPage
              nominalReturnPercent={Number(profitPercentage || 0)}
              referenceAmount={dashboardTotalCost}
              inflationSource={inflationSource}
              onInflationSourceChange={setInflationSource}
            />
          </div>
        )}
      </main>

      <AlertDrawer
        isOpen={isAlertDrawerOpen}
        onClose={handleCloseAlertDrawer}
        alerts={alerts}
        onOpenInflationAnalysis={handleOpenInflationFromAlert}
      />

      {activePage === 'dashboard' && isQuickAddModalOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-[2px]"
            onClick={closeQuickAddModal}
            aria-label="Hızlı ekle modalini kapat"
          />

          <div className="fixed left-1/2 top-1/2 z-[100] w-[94vw] max-w-4xl max-h-[88vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_30px_120px_rgba(2,6,23,0.7)] backdrop-blur-xl md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-100">Hızlı Varlık Ekle</h3>
              <button
                type="button"
                onClick={closeQuickAddModal}
                className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800/80"
              >
                Kapat
              </button>
            </div>

            <MagicAiInput
              userId={authUser?.id}
              onSuccess={handleQuickAddSuccess}
            />
          </div>
        </>
      ) : null}

      {activePage === 'dashboard' ? (
        <AssetModal 
          isOpen={isModalOpen}
          closeModal={closeModal}
          editingAssetId={editingAssetId}
          initialData={editingAssetData}
          mode={assetModalMode}
          onAdd={addAsset}
          onUpdate={updateAsset}
          portfolioNameOptions={portfolioNameOptions}
          initialPortfolioName={initialPortfolioName}
        />
      ) : null}
      </div>
    </div>
    </SyncContext.Provider>
  );
}