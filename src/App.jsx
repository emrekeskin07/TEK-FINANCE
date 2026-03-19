import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
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
import DistributionCard from './components/DistributionCard';
import AssetList from './components/AssetList';
import AlertDrawer from './components/AlertDrawer';
import AssetModal from './components/AssetModal';
import AuthPage from './components/AuthPage';
import MalVarligiPage from './components/MalVarligiPage';
import EnflasyonAnaliziPage from './components/EnflasyonAnaliziPage';
import Chart from './components/dashboard/Chart';
import Stats from './components/dashboard/Stats';
import { SyncContext } from './context/SyncContext';
import { DashboardProvider } from './context/DashboardContext';
import { usePrivacy } from './context/PrivacyContext';

const ATH_CELEBRATION_STORAGE_PREFIX = 'tek-finance:ath-celebration';
const ATH_CELEBRATION_DURATION_MS = 3800;

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
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
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [editingAssetData, setEditingAssetData] = useState(null);
  const [initialPortfolioName, setInitialPortfolioName] = useState('');
  const [assetModalMode, setAssetModalMode] = useState('buy');
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);
  const [showAthCelebration, setShowAthCelebration] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const athCelebrationTimeoutRef = useRef(null);

  const { portfolio, addAsset, updateAsset, removeAsset, sellAsset } = usePortfolio(authUser?.id, (updatedPort) => {
    if (authUser) {
      updatePrices(updatedPort);
    }
  });
  
  const { marketData, marketChanges, marketMeta, loading, lastUpdated, lastFetchFailed, rates, updatePrices } = useMarketPrices(portfolio);

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
    portfolioCashTotal,
    lineChartData,
    selectedInflationSourceLabel,
    alerts,
    activeAlertCount,
    previewAlerts,
    portfolioNameOptions,
    selectedBank,
    selectedCategory,
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

  const handleToggleAlertDrawer = () => {
    setIsAlertDrawerOpen((prev) => !prev);
  };

  const handleCloseAlertDrawer = () => {
    setIsAlertDrawerOpen(false);
  };

  const handleOpenInflationFromAlert = () => {
    setActivePage('enflasyon');
    setIsAlertDrawerOpen(false);
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  };

  const renderPercentText = (value) => {
    const numericValue = Number(value || 0);
    const percentText = `${numericValue >= 0 ? '+' : '-'}%${Math.abs(numericValue).toFixed(2)}`;
    return isPrivacyActive ? maskValue(percentText) : percentText;
  };

  const getAlertVisual = (alertItem) => {
    const level = String(alertItem?.level || '').toLowerCase();
    if (level === 'critical') {
      return { icon: '🚨', label: 'Risk' };
    }

    if (level === 'warning') {
      return { icon: '⚠️', label: 'Uyarı' };
    }

    return { icon: '💡', label: 'Öneri' };
  };

  const dashboardContextValue = useMemo(() => ({
    portfolio,
    marketData,
    marketMeta,
    loading,
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
    triggerCelebration,
    sellAsset,
    removeAsset,
  }), [
    portfolio,
    marketData,
    marketMeta,
    loading,
    lastUpdated,
    baseCurrency,
    rates,
    totalValue,
    dashboardTotalValue,
    bankTotals,
    authUser?.id,
    selectedBank,
    selectedCategory,
    sortConfig,
    setSortConfig,
    lineChartData,
    handleBankSelect,
    handleCategorySelect,
    clearFilters,
    openEditModal,
    openAddModal,
    handleQuickBuyAsset,
    triggerCelebration,
    sellAsset,
    removeAsset,
  ]);


  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-sm text-slate-300">Oturum kontrol ediliyor...</div>
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
    <div className="min-h-screen bg-[#0B1120] text-slate-100 font-sans px-4 py-5 md:px-8 md:py-8 xl:px-10 xl:py-10">
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

      <div>
        <Header 
          activePage={activePage}
          setActivePage={setActivePage}
          baseCurrency={baseCurrency}
          setBaseCurrency={setBaseCurrency}
          openAddModal={openAddModal}
          loading={loading}
          syncFailed={lastFetchFailed}
          onRefresh={handleManualRefresh}
          user={authUser}
          onSignOut={handleSignOut}
          onToggleAlerts={handleToggleAlertDrawer}
          hasActiveAlerts={activeAlertCount > 0}
          alertCount={activeAlertCount}
        />
      </div>

      <main className="max-w-7xl mx-auto space-y-6 md:space-y-10">
        {activePage === 'dashboard' ? (
          <>
            <DashboardProvider value={dashboardContextValue}>
              <div className="grid grid-cols-1 gap-4 p-3 sm:p-4 md:grid-cols-12 md:gap-6 md:p-8">
                <Stats
                  greetingName={dashboardGreetingName}
                  totalProfit={totalProfit}
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

                <motion.section
                  layout
                  transition={{ type: 'spring', stiffness: 140, damping: 24 }}
                  className="col-span-12 md:col-span-4 md:order-2 rounded-3xl border border-white/5 bg-[#1A2232] p-6 shadow-2xl transition-all duration-300 hover:scale-[1.01] hover:border-white/10 md:p-8"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-200">Akıllı Öneriler</h3>
                    <button
                      type="button"
                      onClick={handleToggleAlertDrawer}
                      className="text-xs font-semibold rounded-md border border-sky-300/30 bg-sky-500/10 px-2.5 py-1 text-sky-200 hover:bg-sky-500/20 transition-colors min-h-[44px]"
                    >
                      Hepsini Gör
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">Risk ve öneriler artık Alert panelinde. Burada kısa bir önizleme görebilirsin.</p>

                  {previewAlerts.length > 0 ? (
                    <ul className="mt-4 space-y-2">
                      {previewAlerts.map((item) => (
                        <li key={item.id} className="rounded-3xl border border-white/10 bg-black/20 px-3 py-2.5">
                          <p className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                            <span aria-hidden="true">{getAlertVisual(item).icon}</span>
                            <span>{item.title}</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.detail}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-emerald-200">Şu an aktif bir kritik uyarı görünmüyor.</p>
                  )}
                </motion.section>

                <AssetList />
              </div>
            </DashboardProvider>
          </>
        ) : activePage === 'malvarligi' ? (
          <div>
            <MalVarligiPage
              portfolioCashTotal={portfolioCashTotal}
              manualAssets={manualAssets}
              manualAssetsLoading={manualAssetsLoading}
              onManualAssetsChange={setManualAssets}
              userId={authUser.id}
            />
          </div>
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
    </SyncContext.Provider>
  );
}