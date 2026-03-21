import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Confetti from 'react-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { usePortfolio } from './hooks/usePortfolio';
import { useMarketPrices } from './hooks/useMarketPrices';
import { useAuthSession } from './hooks/useAuthSession';
import { useManualAssets } from './hooks/useManualAssets';
import { useCalculations } from './hooks/useCalculations';
import { useAiCommander } from './hooks/useAiCommander';
import { useAssetModalManager } from './hooks/useAssetModalManager';
import { useOnboardingManager } from './hooks/useOnboardingManager';
import { useEngagement } from './hooks/useEngagement';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useDashboardContextBuilder } from './hooks/useDashboardContextBuilder';
import DistributionCard from './components/DistributionCard';
import AssetList from './components/AssetList';
import AlertDrawer from './components/AlertDrawer';
import AssetModal from './components/AssetModal';
import AuthPage from './components/AuthPage';
import FinancialStrategyCenterPage from './components/FinancialStrategyCenterPage';
import SmartSuggestionsPage from './components/SmartSuggestionsPage';
import OperationsPage from './components/OperationsPage';
import OnboardingWizard from './components/OnboardingWizard';
import AppSidebar from './components/AppSidebar';
import AppNavbar from './components/AppNavbar';
import MagicCommandBar from './components/MagicCommandBar';
import GoalSuccessModalHost from './components/GoalSuccessModalHost';
import DashboardPage from './pages/DashboardPage';
import AnalysisPage from './pages/AnalysisPage';
import SettingsPageRoute from './pages/SettingsPageRoute';
import MarketDropModal from './components/modals/MarketDropModal';
import WeeklyFlowModal from './components/modals/WeeklyFlowModal';
import { SyncContext } from './context/SyncContext';
import { DashboardProvider } from './context/DashboardContext';
import { usePrivacy } from './context/PrivacyContext';
import { isDarkThemeId } from './utils/themePresets';
import { LEGAL_DISCLAIMER_TEXT } from './constants/trustContent';
import { useAppConfig } from './hooks/useAppConfig';

const PRIVACY_STARTUP_STORAGE_KEY = 'tek-finance:privacy-startup-enabled';


const PAGE_TO_PATH = {
  dashboard: '/',
  portfolio: '/portfolio',
  operations: '/operations',
  analysis: '/analysis',
  'ai-assistant': '/ai-assistant',
  ayarlar: '/settings',
};

const PAGE_META = {
  dashboard: { title: 'Dashboard', crumb: 'Dashboard' },
  portfolio: { title: 'Portföyüm', crumb: 'Portföyüm' },
  operations: { title: 'İşlemler', crumb: 'İşlemler' },
  analysis: { title: 'Analiz', crumb: 'Analiz' },
  'ai-assistant': { title: 'AI Asistan', crumb: 'AI Asistan' },
  ayarlar: { title: 'Ayarlar', crumb: 'Ayarlar' },
};

const resolvePageFromPath = (pathname) => {
  if (pathname === '/portfolio' || pathname === '/net-worth') {
    return 'portfolio';
  }

  if (pathname === '/operations') {
    return 'operations';
  }

  if (pathname === '/analysis' || pathname === '/inflation-analysis') {
    return 'analysis';
  }

  if (pathname === '/ai-assistant' || pathname === '/smart-suggestions' || pathname === '/strategy-center') {
    return 'ai-assistant';
  }

  if (pathname === '/settings') {
    return 'ayarlar';
  }

  return 'dashboard';
};

const resolvePathFromPage = (page) => PAGE_TO_PATH[page] || '/';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const activePage = resolvePageFromPath(location.pathname);
  const {
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    activeTheme,
    insightTone,
    setInsightTone,
    viewportSize,
    handleToggleThemeMode,
    handleSetThemeMode,
  } = useAppConfig();
  const [baseCurrency, setBaseCurrency] = useState('TRY');
  const [sortConfig, setSortConfig] = useState({ key: 'profit', direction: 'desc' });
  const [activeAssetCategory, setActiveAssetCategory] = useState('Tümü');
  const [inflationSource, setInflationSource] = useState('enag');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const { isPrivacyActive, setIsPrivacyActive, maskValue } = usePrivacy();

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
  
  const { isModalOpen, editingAssetId, editingAssetData, initialPortfolioName, assetModalMode, openAddModal, openEditModal, closeModal } = useAssetModalManager(activePage);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [goalSuccessFlow, setGoalSuccessFlow] = useState(null);
  const [marketDropInsight, setMarketDropInsight] = useState(null);
  const [isMarketDropInsightLoading, setIsMarketDropInsightLoading] = useState(false);
  const [isCommandBarVisible, setIsCommandBarVisible] = useState(true);
  const [isPrivacyTransitioning, setIsPrivacyTransitioning] = useState(false);
  const privacyTransitionTimeoutRef = useRef(null);
  const aiCommandBarRef = useRef(null);

  const {
    portfolio,
    isPortfolioLoading,
    isPortfolioMutating,
    addAsset,
    updateAsset,
    removeAsset,
    sellAsset,
    increaseAssetHolding,
    loadUserPreferences,
    saveUserPreferences,
    analyzeAssetDrop,
  } = usePortfolio(authUser?.id, (updatedPort) => {
    if (authUser) {
      updatePrices(updatedPort);
    }
  });
  
  const { marketData, marketChanges, marketMeta, loading, lastUpdated, rates, updatePrices } = useMarketPrices(portfolio);

  const handleTogglePrivacyMode = useCallback(() => {
    setIsPrivacyTransitioning(true);
    setIsPrivacyActive((prev) => !prev);

    if (privacyTransitionTimeoutRef.current && typeof window !== 'undefined') {
      window.clearTimeout(privacyTransitionTimeoutRef.current);
    }

    if (typeof window !== 'undefined') {
      privacyTransitionTimeoutRef.current = window.setTimeout(() => {
        setIsPrivacyTransitioning(false);
        privacyTransitionTimeoutRef.current = null;
      }, 240);
    }
  }, [setIsPrivacyActive]);

  useEffect(() => () => {
    if (privacyTransitionTimeoutRef.current && typeof window !== 'undefined') {
      window.clearTimeout(privacyTransitionTimeoutRef.current);
      privacyTransitionTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleGlobalShortcuts = (event) => {
      if ((event.metaKey || event.ctrlKey) && String(event.key || '').toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandBarVisible(true);
        window.setTimeout(() => {
          aiCommandBarRef.current?.focus?.();
        }, 60);
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);



  useEffect(() => {
    if (!authUser) {
      return;
    }

    updatePrices();
  }, [authUser, updatePrices]);

  useEffect(() => {
    if (lastUpdated instanceof Date) {
      setLastSyncTime(lastUpdated.getTime());
    }
  }, [lastUpdated]);



  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.localStorage.getItem(PRIVACY_STARTUP_STORAGE_KEY) === '1') {
      setIsPrivacyActive(true);
    }
  }, [setIsPrivacyActive]);







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

  const handleClearAllUserData = useCallback(async () => {
    try {
      const portfolioList = Array.isArray(portfolio) ? portfolio : [];
      const deleteTasks = portfolioList
        .map((item) => Number(item?.id))
        .filter((id) => Number.isFinite(id) && id > 0)
        .map((id) => removeAsset(id));

      if (deleteTasks.length > 0) {
        await Promise.allSettled(deleteTasks);
      }

      setManualAssets([]);
      toast.success('Tum varlik verileriniz temizlendi.');
    } catch {
      toast.error('Veriler temizlenirken bir hata olustu.');
    }
  }, [portfolio, removeAsset, setManualAssets]);

  const {
    totalValue,
    totalProfit,
    dashboardTotalValue,
    dashboardTotalCost,
    profitPercentage,
    bankTotals,
    categoryTotals,
    portfolioCashTotal,
    lineChartData,
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

  const handleAddAssetWithFlow = useCallback(async (payload) => {
    const result = await addAsset(payload);
    const isSuccess = Boolean(result && (result.success || result === true));

    if (!isSuccess) {
      return false;
    }

    if (result?.flowPayload) {
      setGoalSuccessFlow(result.flowPayload);
    }

    return true;
  }, [addAsset]);

  let triggerCelebrationProxy;
  const { onboardingState, shouldShowOnboarding, handleCompleteOnboarding, handleSkipOnboarding } = useOnboardingManager({ authUser, isPortfolioLoading, portfolio, loadUserPreferences, saveUserPreferences, setInsightTone, triggerCelebration: (...args) => triggerCelebrationProxy?.(...args), navigate });

  const { showAthCelebration, triggerCelebration, weeklyFlowOpen, setWeeklyFlowOpen, weeklyFlowStep, setWeeklyFlowStep, weeklySummary } = useEngagement({ activePage, authUser, lineChartData, dashboardTotalValue, portfolio, marketChanges, onboardingState, shouldShowOnboarding });
  triggerCelebrationProxy = triggerCelebration;

  const { isAlertDrawerOpen, handleToggleAlertDrawer, handleCloseAlertDrawer, handleOpenInflationFromAlert, handleOpenFabQuickAdd, handleHeaderSearchNavigate, handleSidebarNavigate, handleNavigateToGoalFromAsset, handleNavigateToAssetsForGoal, navigateToPage } = useAppNavigation({ navigate, resolvePathFromPage, setIsCommandBarVisible, aiCommandBarRef, setIsSidebarOpen, setActiveAssetCategory });

  const focusAiBar = useCallback(() => {
    aiCommandBarRef.current?.focus?.();
  }, []);

  const handleExecuteAiCommand = useAiCommander({ navigateToPage, marketData, rates, openAddModal });

  const handleQuickAddFromPriceResult = useCallback((payload) => {
    if (!payload) {
      return;
    }

    navigateToPage('dashboard');
    window.setTimeout(() => {
      openAddModal({
        mode: 'buy',
        prefillData: {
          bank: 'Banka Belirtilmedi',
          category: payload.category || 'Hisse Senedi',
          symbol: payload.symbol || '',
          name: payload.name || payload.symbol || 'Varlık',
          amount: '',
          avgPrice: Number(payload.avgPrice || 0) > 0 ? Number(payload.avgPrice) : '',
          unitType: (payload.category === 'Değerli Madenler' && String(payload.symbol || '').toUpperCase() === 'GC=F') ? 'gram' : 'lot',
        },
      });
    }, 120);
  }, [navigateToPage, openAddModal]);

  const handleAnalyzeAssetDrop = useCallback(({ asset, changePercent }) => {
    const run = async () => {
      setIsMarketDropInsightLoading(true);
      setMarketDropInsight(null);

      try {
        const insight = await analyzeAssetDrop({
          asset,
          changePercent,
          riskProfile: onboardingState.riskProfile,
        });
        setMarketDropInsight(insight);
      } catch (error) {
        toast.error(error?.message || 'Dinamik AI analizi olusturulamadi.');
      } finally {
        setIsMarketDropInsightLoading(false);
      }
    };

    run();
  }, [onboardingState.riskProfile, analyzeAssetDrop]);

  const showInitialDashboardSkeleton = activePage === 'dashboard'
    && (loading || isPortfolioLoading)
    && portfolio.length === 0;
  const showDashboardMutationSkeleton = activePage === 'dashboard' && isPortfolioMutating;
  const hasAnyAsset = portfolio.length > 0 || manualAssets.length > 0;
  const showDashboardEmptyState = activePage === 'dashboard'
    && !showInitialDashboardSkeleton
    && !loading
    && !isPortfolioLoading
    && !hasAnyAsset;
  const pageMeta = PAGE_META[activePage] || PAGE_META.dashboard;

  const { dashboardContextValue, portfolioDistribution } = useDashboardContextBuilder({
    portfolio, marketData, marketChanges, marketMeta, loading, isPortfolioLoading, isPortfolioMutating,
    lastUpdated, baseCurrency, rates, totalValue, dashboardTotalValue, bankTotals, categoryTotals,
    authUser, selectedBank, selectedCategory, activeAssetCategory, otherBankNames, sortConfig,
    setSortConfig, lineChartData, insightTone, handleBankSelect, handleCategorySelect,
    setActiveAssetCategory, clearFilters, openEditModal, openAddModal, handleQuickBuyAsset,
    increaseAssetHolding, handleAnalyzeAssetDrop, handleNavigateToGoalFromAsset,
    handleNavigateToAssetsForGoal, triggerCelebration, sellAsset, removeAsset
  });

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
    <div className={`relative min-h-screen overflow-hidden bg-page text-text-main font-sans px-4 py-5 md:px-8 md:py-8 xl:px-10 xl:py-10 ${isPrivacyActive ? 'privacy-mode' : ''} ${isPrivacyTransitioning ? 'privacy-transitioning' : ''}`}>
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

      <OnboardingWizard
        open={shouldShowOnboarding}
        loading={onboardingState.saving}
        onComplete={handleCompleteOnboarding}
        onSkip={handleSkipOnboarding}
      />

      <AppSidebar
        activePage={activePage}
        isSidebarCollapsed={isSidebarCollapsed}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        setIsSidebarOpen={setIsSidebarOpen}
        onNavigate={handleSidebarNavigate}
        user={authUser}
        onSignOut={handleSignOut}
      />

      <AppNavbar
        isSidebarCollapsed={isSidebarCollapsed}
        user={authUser}
        onSignOut={handleSignOut}
        onOpenSettings={() => navigateToPage('ayarlar')}
        isPrivacyActive={isPrivacyActive}
        onTogglePrivacy={handleTogglePrivacyMode}
        aiCommandBarRef={aiCommandBarRef}
        onExecuteAiCommand={handleExecuteAiCommand}
        onQuickAddAsset={handleQuickAddFromPriceResult}
      />

      <main className={`mx-auto max-w-[1400px] space-y-6 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-[86px]' : 'lg:ml-[272px]'}`}>
        <section className="px-3 pt-1 sm:px-4 md:px-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-ui-body text-slate-400">Ana Sayfa &gt; {pageMeta.crumb}</p>
              <h2 className="mt-1 text-ui-h1 text-slate-900 dark:text-slate-100">{pageMeta.title}</h2>
            </div>

            {activePage === 'dashboard' ? (
              <button
                type="button"
                onClick={() => navigateToPage('portfolio')}
                className="inline-flex min-h-[40px] transform-gpu items-center rounded-lg border border-purple-300/35 bg-purple-100 px-3 py-2 text-xs font-semibold text-purple-700 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:hover:bg-purple-900/45"
              >
                Tümünü Gör
              </button>
            ) : null}
          </div>
        </section>

        <Routes>
          <Route
            path="/"
            element={(
              <DashboardPage
                dashboardContextValue={dashboardContextValue}
                showInitialDashboardSkeleton={showInitialDashboardSkeleton}
                showDashboardMutationSkeleton={showDashboardMutationSkeleton}
                showDashboardEmptyState={showDashboardEmptyState}
                dashboardTotalValue={dashboardTotalValue}
                totalProfit={totalProfit}
                profitPercentage={profitPercentage}
                baseCurrency={baseCurrency}
                rates={rates}
                portfolio={portfolio}
                marketData={marketData}
                isPrivacyActive={isPrivacyActive}
                maskValue={maskValue}
                loading={loading}
                isPortfolioLoading={isPortfolioLoading}
                setIsCommandBarVisible={setIsCommandBarVisible}
                aiCommandBarRef={aiCommandBarRef}
              />
            )}
          />
          <Route
            path="/portfolio"
            element={(
              <DashboardProvider value={dashboardContextValue}>
                <div className="grid grid-cols-1 gap-4 p-3 sm:p-4 md:grid-cols-12 md:gap-6 md:p-8">
                  <DistributionCard />
                  <AssetList />
                </div>
              </DashboardProvider>
            )}
          />
          <Route
            path="/operations"
            element={(
              <OperationsPage
                userId={authUser?.id || null}
                baseCurrency={baseCurrency}
                rates={rates}
              />
            )}
          />
          <Route
            path="/analysis"
            element={(
              <AnalysisPage
                dashboardContextValue={dashboardContextValue}
                profitPercentage={profitPercentage}
                dashboardTotalCost={dashboardTotalCost}
                inflationSource={inflationSource}
                setInflationSource={setInflationSource}
              />
            )}
          />
          <Route
            path="/ai-assistant"
            element={(
              <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 md:gap-6 md:p-8">
                <SmartSuggestionsPage
                  portfolioDistribution={portfolioDistribution}
                  dashboardTotalValue={dashboardTotalValue}
                />
                <FinancialStrategyCenterPage portfolioDistribution={portfolioDistribution} />
              </div>
            )}
          />
          <Route
            path="/settings"
            element={(
              <SettingsPageRoute
                user={authUser}
                activeTheme={activeTheme}
                isDarkThemeId={isDarkThemeId}
                handleSetThemeMode={handleSetThemeMode}
                baseCurrency={baseCurrency}
                setBaseCurrency={setBaseCurrency}
                isPrivacyActive={isPrivacyActive}
                setIsPrivacyActive={setIsPrivacyActive}
                insightTone={insightTone}
                setInsightTone={setInsightTone}
                handleClearAllUserData={handleClearAllUserData}
              />
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className={`mx-auto mt-8 max-w-[1400px] transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-[86px]' : 'lg:ml-[272px]'}`}>
        <div className="rounded-xl border border-amber-300/25 bg-amber-500/10 px-4 py-3">
          <p className="inline-flex items-start gap-2 text-xs text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
            <span>
              {LEGAL_DISCLAIMER_TEXT}
            </span>
          </p>
        </div>
      </footer>

      <GoalSuccessModalHost
        flow={goalSuccessFlow}
        onClose={() => setGoalSuccessFlow(null)}
        onOpenGoalDetails={() => {
          setGoalSuccessFlow(null);
          navigate('/analysis');
        }}
      />

      <MarketDropModal
        isLoading={isMarketDropInsightLoading}
        insight={marketDropInsight}
        onClose={() => setMarketDropInsight(null)}
      />

      <WeeklyFlowModal
        isOpen={weeklyFlowOpen}
        step={weeklyFlowStep}
        summary={typeof weeklySummary !== 'undefined' ? weeklySummary : {}}
        setStep={setWeeklyFlowStep}
        onClose={() => setWeeklyFlowOpen(false)}
        onAction={() => {
          setWeeklyFlowOpen(false);
          openAddModal();
        }}
      />

      <AlertDrawer
        isOpen={isAlertDrawerOpen}
        onClose={handleCloseAlertDrawer}
        alerts={alerts}
        onOpenInflationAnalysis={handleOpenInflationFromAlert}
      />

      <button
        type="button"
        onClick={() => {
          handleOpenFabQuickAdd();
          focusAiBar();
        }}
        className="fixed bottom-6 right-5 z-[85] inline-flex h-14 w-14 animate-pulse items-center justify-center rounded-full border border-purple-300/45 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_0_1px_rgba(167,139,250,0.35),0_18px_42px_rgba(147,51,234,0.5)] transition-all duration-300 hover:scale-105 md:bottom-8 md:right-8"
        title="AI Komut Çubuğuna Git"
        aria-label="AI Komut Çubuğuna Git"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {activePage === 'dashboard' ? (
        <AssetModal 
          isOpen={isModalOpen}
          closeModal={closeModal}
          editingAssetId={editingAssetId}
          initialData={editingAssetData}
          mode={assetModalMode}
          onAdd={handleAddAssetWithFlow}
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