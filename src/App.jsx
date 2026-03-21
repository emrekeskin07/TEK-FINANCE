import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Confetti from 'react-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { usePortfolio } from './hooks/usePortfolio';
import { useMarketPrices } from './hooks/useMarketPrices';
import { useAuthSession } from './hooks/useAuthSession';
import { useManualAssets } from './hooks/useManualAssets';
import { useCalculations } from './hooks/useCalculations';
import { useAnimatedCounter } from './hooks/useAnimatedCounter';
import Header from './components/Header';
import SidebarMenu from './components/SidebarMenu';
import AiCommandBar from './components/AiCommandBar';
import DistributionCard from './components/DistributionCard';
import AssetList from './components/AssetList';
import AlertDrawer from './components/AlertDrawer';
import AssetModal from './components/AssetModal';
import AuthPage from './components/AuthPage';
import EnflasyonAnaliziPage from './components/EnflasyonAnaliziPage';
import FinancialStrategyCenterPage from './components/FinancialStrategyCenterPage';
import SmartSuggestionsPage from './components/SmartSuggestionsPage';
import OperationsPage from './components/OperationsPage';
import SettingsPage from './components/SettingsPage';
import OnboardingWizard from './components/OnboardingWizard';
import GoalSuccessModal from './components/GoalSuccessModal';
import Chart from './components/dashboard/Chart';
import Stats from './components/dashboard/Stats';
import KpiRibbon from './components/dashboard/KpiRibbon';
import DashboardSkeleton from './components/dashboard/DashboardSkeleton';
import { SyncContext } from './context/SyncContext';
import { DashboardProvider } from './context/DashboardContext';
import { usePrivacy } from './context/PrivacyContext';
import {
  THEME_STORAGE_KEY,
  DEFAULT_THEME_ID,
  resolveThemeId,
  applyThemeToRoot,
  isDarkThemeId,
} from './utils/themePresets';
import { LEGAL_DISCLAIMER_TEXT } from './constants/trustContent';
import { supabase } from './supabaseClient';
import { fetchAiAssetAnalysis } from './services/api';

const LAST_DARK_THEME_STORAGE_KEY = 'tek-finance:last-dark-theme';
const PRIVACY_STARTUP_STORAGE_KEY = 'tek-finance:privacy-startup-enabled';
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'tek-finance:sidebar-collapsed';
const INSIGHT_TONE_STORAGE_KEY = 'tek-finance:insight-tone';

const ATH_CELEBRATION_STORAGE_PREFIX = 'tek-finance:ath-celebration';
const ATH_CELEBRATION_DURATION_MS = 3800;
const WEEKLY_FLOW_STORAGE_PREFIX = 'tek-finance:weekly-flow';
const ONBOARDING_SKIPPED_STORAGE_KEY = 'onboarding_skipped';

const resolveIsoWeekKey = (date = new Date()) => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};
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
  const [activePage, setActivePage] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTheme, setActiveTheme] = useState(DEFAULT_THEME_ID);
  const [insightTone, setInsightTone] = useState('coaching');
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
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [editingAssetData, setEditingAssetData] = useState(null);
  const [initialPortfolioName, setInitialPortfolioName] = useState('');
  const [assetModalMode, setAssetModalMode] = useState('buy');
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAthCelebration, setShowAthCelebration] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [onboardingState, setOnboardingState] = useState({
    loading: true,
    saving: false,
    hasCompleted: false,
    hasPreferenceRecord: false,
    riskProfile: '',
  });
  const [hasSkippedOnboarding, setHasSkippedOnboarding] = useState(false);
  const [goalSuccessFlow, setGoalSuccessFlow] = useState(null);
  const [marketDropInsight, setMarketDropInsight] = useState(null);
  const [isMarketDropInsightLoading, setIsMarketDropInsightLoading] = useState(false);
  const [weeklyFlowOpen, setWeeklyFlowOpen] = useState(false);
  const [weeklyFlowStep, setWeeklyFlowStep] = useState(0);
  const [isCommandBarVisible, setIsCommandBarVisible] = useState(true);
  const athCelebrationTimeoutRef = useRef(null);
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
  } = usePortfolio(authUser?.id, (updatedPort) => {
    if (authUser) {
      updatePrices(updatedPort);
    }
  });
  
  const { marketData, marketChanges, marketMeta, loading, lastUpdated, rates, updatePrices } = useMarketPrices(portfolio);

  const handleOpenFabQuickAdd = useCallback(() => {
    setActivePage('dashboard');
    setIsCommandBarVisible(true);
    window.setTimeout(() => {
      aiCommandBarRef.current?.focus?.();
    }, 120);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const skipped = window.localStorage.getItem(ONBOARDING_SKIPPED_STORAGE_KEY) === 'true';
    setHasSkippedOnboarding(skipped);
  }, [authUser?.id]);

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
    if (!supabase || !authUser?.id) {
      setOnboardingState({
        loading: false,
        saving: false,
        hasCompleted: false,
        hasPreferenceRecord: false,
        riskProfile: '',
      });
      return;
    }

    let isDisposed = false;

    const loadOnboardingState = async () => {
      setOnboardingState((prev) => ({ ...prev, loading: true }));

      const { data, error } = await supabase
        .from('user_preferences')
        .select('has_completed_onboarding,risk_profile')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (isDisposed) {
        return;
      }

      if (error) {
        console.warn('user_preferences okunamadi:', error?.message || error);
        setOnboardingState((prev) => ({
          ...prev,
          loading: false,
          hasCompleted: false,
          hasPreferenceRecord: false,
          riskProfile: '',
        }));
        return;
      }

      const hasCompleted = Boolean(data?.has_completed_onboarding);
      const riskProfile = String(data?.risk_profile || '').trim();
      const hasPreferenceRecord = Boolean(data);

      setOnboardingState((prev) => ({
        ...prev,
        loading: false,
        hasCompleted,
        hasPreferenceRecord,
        riskProfile,
      }));

      if (hasCompleted && riskProfile === 'conservative') {
        setInsightTone('neutral');
      }
    };

    loadOnboardingState();

    return () => {
      isDisposed = true;
    };
  }, [authUser?.id]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    updatePrices();
  }, [authUser, updatePrices]);

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
      return;
    }

    if (window.localStorage.getItem(PRIVACY_STARTUP_STORAGE_KEY) === '1') {
      setIsPrivacyActive(true);
    }
  }, [setIsPrivacyActive]);

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
    navigateToPage('analysis');
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

  const focusAiBar = useCallback(() => {
    aiCommandBarRef.current?.focus?.();
  }, []);

  const handleExecuteAiCommand = useCallback(async (intent) => {
    const kind = String(intent?.kind || 'unknown');

    if (kind === 'portfolio_status') {
      navigateToPage('dashboard');
      window.setTimeout(() => {
        document.getElementById('dashboard-analysis-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);

      return { message: 'Portföy analizine yönlendiriyorum.' };
    }

    if (kind === 'goal_status') {
      navigateToPage('dashboard');
      window.setTimeout(() => {
        document.getElementById('dashboard-goal-summary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);

      return { message: 'Hedef ilerleme özetini açıyorum.' };
    }

    if (kind === 'gold_price') {
      const gramGold = Number(marketData?.['GC=F__GRAM'] || marketData?.GRAM_ALTIN || 0);
      if (!Number.isFinite(gramGold) || gramGold <= 0) {
        return { message: 'Anlık Gram Altın fiyatı şu an alınamadı.' };
      }

      return { message: `Anlık Gram Altın: ${gramGold.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} TL` };
    }

    if (kind === 'add_asset') {
      const amountTL = Number(intent?.amount || 0);
      const assetType = String(intent?.assetType || 'nakit');

      if (!Number.isFinite(amountTL) || amountTL <= 0) {
        return { message: 'Tutarı anlayamadım, örn: 500 TL nakit ekle.' };
      }

      const openPrefilledModal = (prefillData) => {
        openAddModal({ mode: 'buy', prefillData });
      };

      navigateToPage('dashboard');

      if (assetType === 'altin') {
        const gramGold = Number(marketData?.['GC=F__GRAM'] || marketData?.GRAM_ALTIN || 0);
        const quantityGram = gramGold > 0 ? (amountTL / gramGold) : 0;

        window.setTimeout(() => {
          openPrefilledModal({
            bank: 'Banka Belirtilmedi',
            category: 'Değerli Madenler',
            symbol: 'GRAM_ALTIN',
            name: 'Gram Altın',
            amount: quantityGram > 0 ? Number(quantityGram.toFixed(4)) : '',
            avgPrice: gramGold > 0 ? Number(gramGold.toFixed(2)) : '',
            unitType: 'gram',
          });
        }, 120);

        return { message: `Altın alımı için yaklaşık ${amountTL.toLocaleString('tr-TR')} TL prefill hazırlandı.` };
      }

      if (assetType === 'gumus') {
        const silverGram = Number(marketData?.['SI=F__GRAM'] || 0);
        const quantityGram = silverGram > 0 ? (amountTL / silverGram) : 0;

        window.setTimeout(() => {
          openPrefilledModal({
            bank: 'Banka Belirtilmedi',
            category: 'Değerli Madenler',
            symbol: 'SI=F',
            name: 'Gümüş',
            amount: quantityGram > 0 ? Number(quantityGram.toFixed(4)) : '',
            avgPrice: silverGram > 0 ? Number(silverGram.toFixed(2)) : '',
            unitType: 'gram',
          });
        }, 120);

        return { message: `Gümüş alımı için yaklaşık ${amountTL.toLocaleString('tr-TR')} TL prefill hazırlandı.` };
      }

      if (assetType === 'usd') {
        const usdTryRate = Number(rates?.USD || marketData?.['TRY=X'] || 0);
        const quantityUsd = usdTryRate > 0 ? (amountTL / usdTryRate) : 0;

        window.setTimeout(() => {
          openPrefilledModal({
            bank: 'Banka Belirtilmedi',
            category: 'Döviz',
            symbol: 'TRY=X',
            name: 'ABD Doları',
            amount: quantityUsd > 0 ? Number(quantityUsd.toFixed(4)) : '',
            avgPrice: usdTryRate > 0 ? Number(usdTryRate.toFixed(4)) : '',
            unitType: 'adet',
          });
        }, 120);

        return { message: `USD alımı için yaklaşık ${amountTL.toLocaleString('tr-TR')} TL prefill hazırlandı.` };
      }

      window.setTimeout(() => {
        openPrefilledModal({
          bank: 'Banka Belirtilmedi',
          category: 'Nakit/Banka',
          symbol: 'CASH_TRY',
          name: 'Vadesiz Nakit',
          amount: amountTL,
          avgPrice: 1,
          unitType: 'adet',
        });
      }, 120);

      return { message: `${amountTL.toLocaleString('tr-TR')} TL nakit ekleme formu hazır.` };
    }

    return { message: 'Bu komutu anlayamadım. Örn: 1000 TL altın ekle.' };
  }, [navigateToPage, marketData, rates, openAddModal]);

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

  const handleAnalyzeAssetDrop = useCallback(({ asset, changePercent }) => {
    const run = async () => {
      const symbol = String(asset?.symbol || '').trim().toUpperCase();
      const assetName = String(asset?.name || symbol || 'Varlık').trim();

      if (!symbol) {
        toast.error('Analiz icin varlik sembolu bulunamadi.');
        return;
      }

      const riskProfileRaw = String(onboardingState.riskProfile || 'Dengeli').trim();
      const normalizedRiskProfile = riskProfileRaw === 'aggressive'
        ? 'Atılgan'
        : (riskProfileRaw === 'conservative' ? 'Muhafazakar' : (riskProfileRaw || 'Dengeli'));

      setIsMarketDropInsightLoading(true);
      setMarketDropInsight(null);

      try {
        const data = await fetchAiAssetAnalysis({
          symbol,
          assetName,
          riskProfile: normalizedRiskProfile,
        });

        setMarketDropInsight({
          assetName: data?.assetName || assetName,
          dropPercent: Math.abs(Number(data?.metrics?.dayChangePercent ?? changePercent ?? 0)),
          sentimentLabel: String(data?.metrics?.sentiment?.label || 'Nötr'),
          sentimentIndicator: String(data?.metrics?.sentiment?.indicator || '🟡'),
          volatilityPercent: Number(data?.metrics?.volatilityPercent || 0),
          volatilityLabel: String(data?.metrics?.volatilityLabel || 'Orta'),
          headlines: Array.isArray(data?.headlines) ? data.headlines.slice(0, 3) : [],
          summary: data?.insight?.summary?.content || '',
          riskOpportunity: data?.insight?.riskOpportunity?.content || '',
          strategy: data?.insight?.strategy?.content || '',
          action: data?.insight?.strategy?.action || 'Bekle',
          warning: String(data?.warning || 'Bu bir yatırım tavsiyesi değildir. YTD.'),
        });
      } catch (error) {
        toast.error(error?.message || 'Dinamik AI analizi olusturulamadi.');
      } finally {
        setIsMarketDropInsightLoading(false);
      }
    };

    run();
  }, [onboardingState.riskProfile]);

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
  }, [navigateToPage]);

  const shouldShowOnboarding = Boolean(authUser)
    && !onboardingState.loading
    && !isPortfolioLoading
    && !onboardingState.hasCompleted
    && !hasSkippedOnboarding
    && (portfolio.length === 0 || !onboardingState.hasPreferenceRecord);

  const weeklySummary = useMemo(() => {
    const series = Array.isArray(lineChartData) ? lineChartData : [];
    const latestValue = Number(series[series.length - 1]?.value || dashboardTotalValue || 0);
    const weekAgoValue = Number(series[Math.max(0, series.length - 8)]?.value || latestValue || 0);
    const weeklyGain = latestValue - weekAgoValue;

    const topMover = (Array.isArray(portfolio) ? portfolio : [])
      .map((item) => ({
        item,
        change: Number(marketChanges?.[item.symbol]),
      }))
      .filter((entry) => Number.isFinite(entry.change))
      .sort((a, b) => b.change - a.change)[0] || null;

    const riskProfile = String(onboardingState.riskProfile || 'balanced').trim() || 'balanced';
    const forecast = riskProfile === 'aggressive'
      ? 'Momentum fırsatlarını kademeli alım stratejisiyle değerlendirmek bu hafta öne çıkıyor.'
      : (riskProfile === 'conservative'
        ? 'Koruma odaklı dağılımı sürdürüp güçlü geri çekilmelerde sınırlı ekleme daha sağlıklı görünüyor.'
        : 'Dengeli risk ile seçici ekleme ve nakit tamponunu birlikte kullanman önerilir.');

    return {
      weeklyGain,
      topMoverName: topMover ? String(topMover.item?.name || topMover.item?.symbol || '-') : '-',
      topMoverPercent: topMover ? Number(topMover.change || 0) : 0,
      forecast,
    };
  }, [lineChartData, dashboardTotalValue, portfolio, marketChanges, onboardingState.riskProfile]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!authUser?.id || !onboardingState.hasCompleted || shouldShowOnboarding) {
      return;
    }

    const weekKey = resolveIsoWeekKey(new Date());
    const storageKey = `${WEEKLY_FLOW_STORAGE_PREFIX}:${authUser.id}`;
    const lastSeenKey = String(window.localStorage.getItem(storageKey) || '').trim();

    if (lastSeenKey === weekKey) {
      return;
    }

    window.localStorage.setItem(storageKey, weekKey);
    setWeeklyFlowStep(0);
    setWeeklyFlowOpen(true);
  }, [authUser?.id, onboardingState.hasCompleted, shouldShowOnboarding]);

  const handleCompleteOnboarding = useCallback(async ({ interests, riskProfile, firstAssetCommand }) => {
    if (!supabase || !authUser?.id) {
      toast.error('Kurulum ayarlari kaydedilemedi.');
      return;
    }

    setOnboardingState((prev) => ({ ...prev, saving: true }));

    const payload = {
      user_id: authUser.id,
      interests: Array.isArray(interests) ? interests : [],
      risk_profile: String(riskProfile || '').trim() || null,
      first_asset_command: String(firstAssetCommand || '').trim() || null,
      has_completed_onboarding: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_preferences')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      toast.error('Kurulum tercihleri kaydedilemedi.');
      setOnboardingState((prev) => ({ ...prev, saving: false }));
      return;
    }

    if (payload.risk_profile === 'conservative') {
      setInsightTone('neutral');
    } else {
      setInsightTone('coaching');
    }

    setOnboardingState((prev) => ({
      ...prev,
      saving: false,
      hasCompleted: true,
      hasPreferenceRecord: true,
      riskProfile: String(payload.risk_profile || ''),
    }));

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ONBOARDING_SKIPPED_STORAGE_KEY);
    }
    setHasSkippedOnboarding(false);

    setActivePage('dashboard');
    triggerCelebration();
    toast.success('Kurulum tamamlandı. Hoş geldin!');
  }, [authUser?.id, triggerCelebration]);

  const handleSkipOnboarding = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ONBOARDING_SKIPPED_STORAGE_KEY, 'true');
    }

    setHasSkippedOnboarding(true);
    toast('Kurulum simdilik ertelendi.');
  }, []);

  const renderPercentText = (value) => {
    const numericValue = Number(value || 0);
    const percentText = `${numericValue >= 0 ? '+' : '-'}%${Math.abs(numericValue).toFixed(2)}`;
    return isPrivacyActive ? maskValue(percentText) : percentText;
  };

  const showInitialDashboardSkeleton = activePage === 'dashboard'
    && (loading || isPortfolioLoading)
    && portfolio.length === 0;
  const showDashboardMutationSkeleton = activePage === 'dashboard' && isPortfolioMutating;
  const pageMeta = PAGE_META[activePage] || PAGE_META.dashboard;

  const dashboardContextValue = useMemo(() => ({
    portfolio,
    marketData,
    marketChanges,
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
    activeAssetCategory,
    otherBankNames,
    sortConfig,
    setSortConfig,
    lineChartData,
    insightTone,
    handleInstitutionSelect: handleBankSelect,
    handleBankSelect,
    handleCategorySelect,
    setActiveAssetCategory,
    clearDashboardFilters: clearFilters,
    openEditModal,
    openAddModal,
    onQuickBuyAsset: handleQuickBuyAsset,
    onIncreaseAsset: increaseAssetHolding,
    onAnalyzeAssetDrop: handleAnalyzeAssetDrop,
    onNavigateToGoalFromAsset: handleNavigateToGoalFromAsset,
    onNavigateToAssetsForGoal: handleNavigateToAssetsForGoal,
    triggerCelebration,
    sellAsset,
    removeAsset,
  }), [
    portfolio,
    marketData,
    marketChanges,
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
    activeAssetCategory,
    otherBankNames,
    sortConfig,
    setSortConfig,
    lineChartData,
    insightTone,
    handleBankSelect,
    handleCategorySelect,
    setActiveAssetCategory,
    clearFilters,
    openEditModal,
    openAddModal,
    handleQuickBuyAsset,
    increaseAssetHolding,
    handleAnalyzeAssetDrop,
    handleNavigateToGoalFromAsset,
    handleNavigateToAssetsForGoal,
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

      <OnboardingWizard
        open={shouldShowOnboarding}
        loading={onboardingState.saving}
        onComplete={handleCompleteOnboarding}
        onSkip={handleSkipOnboarding}
      />

      <SidebarMenu
        activePage={activePage}
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isSidebarOpen}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onCloseMobile={() => setIsSidebarOpen(false)}
        onNavigate={handleSidebarNavigate}
        user={authUser}
        onSignOut={handleSignOut}
      />

      <div className={`transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-[86px]' : 'lg:ml-[272px]'}`}>
        <Header 
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          user={authUser}
          onSignOut={handleSignOut}
          onOpenSettings={() => navigateToPage('ayarlar')}
          onSearchNavigate={handleHeaderSearchNavigate}
        />
      </div>

      <div className={`mb-4 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-[86px]' : 'lg:ml-[272px]'}`}>
        {isCommandBarVisible ? (
          <AiCommandBar
            ref={aiCommandBarRef}
            onExecute={handleExecuteAiCommand}
            onQuickAddAsset={handleQuickAddFromPriceResult}
            onDismiss={() => setIsCommandBarVisible(false)}
            autoFocusOnMount
          />
        ) : (
          <div className="mx-auto w-full max-w-[960px] px-3 sm:px-4 md:px-8">
            <button
              type="button"
              onClick={() => {
                setIsCommandBarVisible(true);
                window.setTimeout(() => {
                  aiCommandBarRef.current?.focus?.();
                }, 60);
              }}
              className="rounded-2xl border border-slate-300 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-xl transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Komut Satirini Ac (Ctrl+K)
            </button>
          </div>
        )}
      </div>

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

        {activePage === 'dashboard' ? (
          <>
            {showInitialDashboardSkeleton ? (
              <DashboardSkeleton />
            ) : (
              <DashboardProvider value={dashboardContextValue}>
                <div className="relative grid grid-cols-1 gap-5 p-3 sm:p-4 md:grid-cols-12 md:gap-7 md:p-8">
                  <div id="dashboard-goal-summary" className="col-span-12">
                    <KpiRibbon
                      dashboardTotalValue={dashboardTotalValue}
                      totalProfit={totalProfit}
                      profitPercentage={Number(profitPercentage || 0)}
                      lineChartData={lineChartData}
                      portfolioRealReturnPercent={portfolioRealReturnPercent}
                      selectedInflationSourceLabel={selectedInflationSourceLabel}
                      baseCurrency={baseCurrency}
                      rates={rates}
                      userId={authUser?.id || null}
                      isPrivacyActive={isPrivacyActive}
                      maskValue={maskValue}
                      isLoading={loading || isPortfolioLoading}
                      onGoalNavigate={handleNavigateToAssetsForGoal}
                    />
                  </div>

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
                    lineChartData={lineChartData}
                    insightTone={insightTone}
                    renderPercent={() => renderPercentText(animatedProfitPercent)}
                    renderRealReturn={() => (
                      isPrivacyActive
                        ? maskValue(`${portfolioRealReturnPercent >= 0 ? '+' : '-'}%${Math.abs(portfolioRealReturnPercent).toFixed(2)}`)
                        : `${portfolioRealReturnPercent >= 0 ? '+' : '-'}%${Math.abs(portfolioRealReturnPercent).toFixed(2)}`
                    )}
                    onPrimaryAction={() => openAddModal()}
                  />

                  <div id="dashboard-analysis-section" className="col-span-12 grid grid-cols-12 gap-6 items-start">
                    <Chart />
                    <DistributionCard />
                  </div>

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
        ) : activePage === 'portfolio' ? (
          <DashboardProvider value={dashboardContextValue}>
            <div className="grid grid-cols-1 gap-4 p-3 sm:p-4 md:grid-cols-12 md:gap-6 md:p-8">
              <DistributionCard />
              <AssetList />
            </div>
          </DashboardProvider>
        ) : activePage === 'operations' ? (
          <OperationsPage
            userId={authUser?.id || null}
            baseCurrency={baseCurrency}
            rates={rates}
          />
        ) : activePage === 'analysis' ? (
          <DashboardProvider value={dashboardContextValue}>
            <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 md:grid-cols-12 md:gap-6 md:p-8">
              <Chart />
              <div className="col-span-12 rounded-2xl border border-white/10 bg-slate-900/45 p-6 md:p-8">
                <EnflasyonAnaliziPage
                  nominalReturnPercent={Number(profitPercentage || 0)}
                  referenceAmount={dashboardTotalCost}
                  inflationSource={inflationSource}
                  onInflationSourceChange={setInflationSource}
                />
              </div>
            </div>
          </DashboardProvider>
        ) : activePage === 'ai-assistant' ? (
          <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 md:gap-6 md:p-8">
            <SmartSuggestionsPage
              portfolioDistribution={portfolioDistribution}
              dashboardTotalValue={dashboardTotalValue}
            />
            <FinancialStrategyCenterPage portfolioDistribution={portfolioDistribution} />
          </div>
        ) : activePage === 'ayarlar' ? (
          <div className="p-4 sm:p-6 md:p-8">
            <SettingsPage
              user={authUser}
              isDarkMode={isDarkThemeId(activeTheme)}
              setThemeMode={handleSetThemeMode}
              baseCurrency={baseCurrency}
              setBaseCurrency={setBaseCurrency}
              isPrivacyActive={isPrivacyActive}
              setPrivacyActive={setIsPrivacyActive}
              insightTone={insightTone}
              setInsightTone={setInsightTone}
              onClearAllData={handleClearAllUserData}
            />
          </div>
        ) : (
          <div />
        )}
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

      <AnimatePresence>
        {goalSuccessFlow ? (
          <GoalSuccessModal
            flow={goalSuccessFlow}
            onClose={() => setGoalSuccessFlow(null)}
            onOpenGoalDetails={() => {
              setGoalSuccessFlow(null);
              navigateToPage('analysis');
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isMarketDropInsightLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[131] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">AI Piyasalari Tariyor...</h3>
                  <p className="mt-1 text-sm text-slate-400">Fiyat, volatilite, sentiment ve haber akisindan ozet cikartiliyor.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : marketDropInsight ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[131] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl"
            >
              <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">AI Analyze: {marketDropInsight.assetName}</h3>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-rose-300/40 bg-rose-500/10 px-3 py-1 text-sm text-rose-200">
                  Gunluk Dusus: %{marketDropInsight.dropPercent.toFixed(2)}
                </span>
                <span className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-200">
                  Sentiment: {marketDropInsight.sentimentLabel} {marketDropInsight.sentimentIndicator}
                </span>
                <span className="rounded-full border border-amber-300/40 bg-amber-500/10 px-3 py-1 text-sm text-amber-200">
                  Volatilite: %{marketDropInsight.volatilityPercent.toFixed(2)} ({marketDropInsight.volatilityLabel})
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">🔍 Neler Oluyor?</h4>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{marketDropInsight.summary}</p>
                  {marketDropInsight.headlines?.length ? (
                    <ul className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                      {marketDropInsight.headlines.map((headline) => (
                        <li key={headline}>• {headline}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>

                <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">⚡ Risk/Fırsat Analizi</h4>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{marketDropInsight.riskOpportunity}</p>
                </article>

                <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">💡 Strateji Önerisi</h4>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{marketDropInsight.strategy}</p>
                  <p className="mt-2 text-sm font-medium text-emerald-300">Aksiyon: {marketDropInsight.action}</p>
                </article>
              </div>

              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{marketDropInsight.warning}</p>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMarketDropInsight(null)}
                  className="rounded-lg border border-slate-700 bg-transparent px-3 py-2 text-ui-body text-slate-300 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:bg-slate-800"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {weeklyFlowOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[132] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 16, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl"
            >
              {weeklyFlowStep === 0 ? (
                <>
                  <h3 className="text-ui-h2 text-slate-100">Haftalık Özet</h3>
                  <p className="mt-2 text-ui-body text-slate-300">Geçen hafta net değişimin {weeklySummary.weeklyGain.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} oldu.</p>
                </>
              ) : null}

              {weeklyFlowStep === 1 ? (
                <>
                  <h3 className="text-ui-h2 text-slate-100">En Çok Yükselen</h3>
                  <p className="mt-2 text-ui-body text-slate-300">{weeklySummary.topMoverName} haftayı %{weeklySummary.topMoverPercent.toFixed(2)} değişimle kapattı.</p>
                </>
              ) : null}

              {weeklyFlowStep === 2 ? (
                <>
                  <h3 className="text-ui-h2 text-slate-100">AI Tahmini</h3>
                  <p className="mt-2 text-ui-body text-slate-300">{weeklySummary.forecast}</p>
                </>
              ) : null}

              {weeklyFlowStep === 3 ? (
                <>
                  <h3 className="text-ui-h2 text-slate-100">Bu Haftanın İlk Adımı</h3>
                  <p className="mt-2 text-ui-body text-slate-300">Hadi bu haftaki ilk yatırımını gir ve ivmeyi koru.</p>
                </>
              ) : null}

              <div className="mt-5 flex justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (weeklyFlowStep === 0) {
                      setWeeklyFlowOpen(false);
                      return;
                    }

                    setWeeklyFlowStep((prev) => Math.max(0, prev - 1));
                  }}
                  className="rounded-lg border border-slate-700 bg-transparent px-3 py-2 text-ui-body text-slate-300 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:bg-slate-800"
                >
                  {weeklyFlowStep === 0 ? 'Kapat' : 'Geri'}
                </button>

                {weeklyFlowStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setWeeklyFlowStep((prev) => Math.min(3, prev + 1))}
                    className="rounded-lg border border-violet-300/40 bg-violet-600 px-3 py-2 text-ui-body font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:bg-violet-700"
                  >
                    Devam
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setWeeklyFlowOpen(false);
                      openAddModal();
                    }}
                    className="rounded-lg border border-emerald-300/35 bg-emerald-600 px-3 py-2 text-ui-body font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:bg-emerald-700"
                  >
                    Hadi Bu Haftaki İlk Yatırımını Gir
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

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