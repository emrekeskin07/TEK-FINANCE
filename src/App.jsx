import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import Confetti from 'react-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { usePortfolio } from './hooks/usePortfolio';
import { useMarketPrices } from './hooks/useMarketPrices';
import { useAuthSession } from './hooks/useAuthSession';
import { useManualAssets } from './hooks/useManualAssets';
import { useCalculations } from './hooks/useCalculations';
import { useAiCommander } from './hooks/useAiCommander';
import { useAssetModalManager } from './hooks/useAssetModalManager';
import { useOnboardingManager } from './hooks/useOnboardingManager';
import { useEngagement } from './hooks/useEngagement';
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
  const p = pathname || '/';
  if (p === '/portfolio' || p === '/net-worth' || p.startsWith('/portfolio/') || p.startsWith('/net-worth/')) {
    return 'portfolio';
  }
  if (p === '/operations' || p.startsWith('/operations/')) {
    return 'operations';
  }
  if (p === '/analysis' || p === '/inflation-analysis' || p.startsWith('/analysis/') || p.startsWith('/inflation-analysis/')) {
    return 'analysis';
  }
  if (p === '/ai-assistant' || p === '/smart-suggestions' || p === '/strategy-center' || p.startsWith('/ai-assistant/') || p.startsWith('/smart-suggestions/') || p.startsWith('/strategy-center/')) {
    return 'ai-assistant';
  }
  if (p === '/settings' || p.startsWith('/settings/')) {
    return 'ayarlar';
  }
  return 'dashboard';
};

const resolvePathFromPage = (page) => PAGE_TO_PATH[page] || '/';

export default function App() {
  const location = useLocation();
  const navigateRouter = useNavigate();
  // activeTab URL'den türetiliyor - böylece /ai-assistant açıldığında doğru sayfa gösterilir
  const activeTab = resolvePageFromPath(location.pathname);

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
  
  const { isModalOpen, editingAssetId, editingAssetData, initialPortfolioName, assetModalMode, openAddModal, openEditModal, closeModal } = useAssetModalManager(activeTab);
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

  const navigate = useCallback((path) => {
    navigateRouter(path || '/');
  }, [navigateRouter]);

  const navigateToPage = useCallback((page) => {
    navigateRouter(resolvePathFromPage(page));
  }, [navigateRouter]);

  const handleNavigateToGoalFromAsset = useCallback(() => {
    navigateRouter('/');
    window.setTimeout(() => {
      document.getElementById('dashboard-goal-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }, [navigateRouter]);

  const handleNavigateToAssetsForGoal = useCallback((goalKey) => {
    const map = { ev: 'Değerli Maden', araba: 'Döviz', emeklilik: 'Hisse Senedi' };
    navigateRouter('/portfolio');
    setActiveAssetCategory(map[String(goalKey || '').trim()] || 'Tümü');
  }, [navigateRouter, setActiveAssetCategory]);

  let triggerCelebrationProxy;
  const { onboardingState, shouldShowOnboarding, handleCompleteOnboarding, handleSkipOnboarding } = useOnboardingManager({ authUser, isPortfolioLoading, portfolio, loadUserPreferences, saveUserPreferences, setInsightTone, triggerCelebration: (...args) => triggerCelebrationProxy?.(...args), navigate });

  const { showAthCelebration, triggerCelebration, weeklyFlowOpen, setWeeklyFlowOpen, weeklyFlowStep, setWeeklyFlowStep, weeklySummary } = useEngagement({ activePage: activeTab, authUser, lineChartData, dashboardTotalValue, portfolio, marketChanges, onboardingState, shouldShowOnboarding });
  triggerCelebrationProxy = triggerCelebration;

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

  const hasAnyAsset = portfolio.length > 0 || manualAssets.length > 0;
  const showInitialDashboardSkeleton = activeTab === 'dashboard'
    && (loading || isPortfolioLoading)
    && !hasAnyAsset;
  const showDashboardMutationSkeleton = activeTab === 'dashboard' && isPortfolioMutating;
  const showDashboardEmptyState = activeTab === 'dashboard'
    && !showInitialDashboardSkeleton
    && !loading
    && !isPortfolioLoading
    && !hasAnyAsset;
  const pageMeta = PAGE_META[activeTab] || PAGE_META.dashboard;

  const { dashboardContextValue, portfolioDistribution } = useDashboardContextBuilder({
    portfolio, marketData, marketChanges, marketMeta, loading, isPortfolioLoading, isPortfolioMutating,
    lastUpdated, baseCurrency, rates, totalValue, dashboardTotalValue, bankTotals, categoryTotals,
    authUser, selectedBank, selectedCategory, activeAssetCategory, otherBankNames, sortConfig,
    setSortConfig, lineChartData, insightTone, handleBankSelect, handleCategorySelect,
    setActiveAssetCategory, clearFilters, openEditModal, openAddModal, handleQuickBuyAsset,
    increaseAssetHolding, handleAnalyzeAssetDrop, handleNavigateToGoalFromAsset,
    handleNavigateToAssetsForGoal, triggerCelebration, sellAsset, removeAsset,
    activePage: activeTab
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
      <div className="flex flex-row h-screen w-full bg-[#09090b] overflow-hidden">
        {/* Sidebar: Sabit genişlik ve üstte */}
        <AppSidebar
          activeTab={activeTab}
          setActiveTab={navigateToPage}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          user={authUser}
          onSignOut={handleSignOut}
        />

        {/* Ana içerik alanı: flex-1 ve relative */}
        <main className="flex-1 h-full overflow-y-auto relative">
          {/* Dashboard, Portföy vb. Sayfalar Burada Render Olur */}
          {activeTab === 'dashboard' && (
            <DashboardProvider value={dashboardContextValue}>
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
                activeAssetCategory={activeAssetCategory}
                setActiveAssetCategory={setActiveAssetCategory}
              />
            </DashboardProvider>
          )}
          {activeTab === 'portfolio' && (
            <DashboardProvider value={dashboardContextValue}>
              <div className="grid grid-cols-1 gap-4 p-3 sm:p-4 md:grid-cols-12 md:gap-6 md:p-8">
                <DistributionCard />
                <AssetList />
              </div>
            </DashboardProvider>
          )}
          {activeTab === 'operations' && (
            <OperationsPage
              userId={authUser?.id || null}
              baseCurrency={baseCurrency}
              rates={rates}
            />
          )}
          {activeTab === 'analysis' && (
            <AnalysisPage
              dashboardContextValue={dashboardContextValue}
              profitPercentage={profitPercentage}
              dashboardTotalCost={dashboardTotalCost}
              inflationSource={inflationSource}
              setInflationSource={setInflationSource}
            />
          )}
          {activeTab === 'ai-assistant' && (
            <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 md:gap-6 md:p-8">
              <SmartSuggestionsPage
                portfolioDistribution={portfolioDistribution}
                dashboardTotalValue={dashboardTotalValue}
              />
              <FinancialStrategyCenterPage portfolioDistribution={portfolioDistribution} />
            </div>
          )}
          {activeTab === 'ayarlar' && (
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
        </main>
      </div>
    </SyncContext.Provider>
  );
}