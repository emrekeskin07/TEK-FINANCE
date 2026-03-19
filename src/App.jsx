import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { Wallet } from 'lucide-react';
import { usePortfolio } from './hooks/usePortfolio';
import { useMarketData } from './hooks/useMarketData';
import { useAuthSession } from './hooks/useAuthSession';
import { useManualAssets } from './hooks/useManualAssets';
import { usePortfolioData } from './hooks/usePortfolioData';
import { useAnimatedCounter } from './hooks/useAnimatedCounter';
import Header from './components/Header';
import DistributionCard from './components/DistributionCard';
import GrowthChart from './components/GrowthChart';
import AssetList from './components/AssetList';
import SpotlightCard from './components/SpotlightCard';
import ShinyText from './components/ui/ShinyText';
import SplitText from './components/ui/SplitText';
import AlertDrawer from './components/AlertDrawer';
import AssetModal from './components/AssetModal';
import AuthPage from './components/AuthPage';
import MalVarligiPage from './components/MalVarligiPage';
import EnflasyonAnaliziPage from './components/EnflasyonAnaliziPage';
import { SyncContext } from './context/SyncContext';
import { DashboardProvider } from './context/DashboardContext';
import { usePrivacy } from './context/PrivacyContext';
import { formatCurrencyParts } from './utils/helpers';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [baseCurrency, setBaseCurrency] = useState('TRY');
  const [selectedBank, setSelectedBank] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
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
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);

  const { portfolio, addAsset, updateAsset, removeAsset, sellAsset } = usePortfolio(authUser?.id, (updatedPort) => {
    if (authUser) {
      updatePrices(updatedPort);
    }
  });
  
  const { marketData, marketChanges, marketMeta, loading, lastUpdated, lastFetchFailed, rates, updatePrices } = useMarketData(portfolio);

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

  const handleBankSelect = (bankName) => {
    setSelectedBank((prevSelected) => (prevSelected === bankName ? null : bankName));
  };

  const handleCategorySelect = (categoryName) => {
    setSelectedCategory((prevSelected) => (prevSelected === categoryName ? null : categoryName));
  };

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

    // Dashboard acilisinda alan bos gelsin; detay sayfasi veya URL'den acilis senaryosunda prefill kullan.
    const resolvedPrefill = String(
      explicitPortfolioName
      || (activePage === 'dashboard' ? '' : resolvePortfolioNameFromUrl())
    ).trim();
    const shouldUsePrefill = Boolean(resolvedPrefill) && (activePage !== 'dashboard' || forcePrefill);

    setInitialPortfolioName(shouldUsePrefill ? resolvedPrefill : '');
    setEditingAssetData(null);
    setEditingAssetId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingAssetData(item);
    setEditingAssetId(item.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAssetData(null);
    setEditingAssetId(null);
    setInitialPortfolioName('');
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
  } = usePortfolioData({
    portfolio,
    marketData,
    marketChanges,
    manualAssets,
    inflationSource,
  });

  const animatedProfit = useAnimatedCounter(totalProfit);
  const animatedProfitPercent = useAnimatedCounter(Number(profitPercentage));

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

  const renderCurrencyWithMutedSymbol = (value) => {
    const plainCurrencyText = formatCurrencyParts(value, baseCurrency, rates)
      .map((part) => part.value)
      .join('');

    if (isPrivacyActive) {
      return <span>{maskValue(plainCurrencyText)}</span>;
    }

    return (
      <>
        {formatCurrencyParts(value, baseCurrency, rates).map((part, index) => (
          part.type === 'currency'
            ? <span key={`${part.type}-${index}`} className="text-slate-400/70">{part.value}</span>
            : <span key={`${part.type}-${index}`}>{part.value}</span>
        ))}
      </>
    );
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

  const clearDashboardFilters = () => {
    setSelectedBank(null);
    setSelectedCategory(null);
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
    bankTotals,
    selectedBank,
    selectedCategory,
    sortConfig,
    setSortConfig,
    lineChartData,
    handleBankSelect,
    handleCategorySelect,
    clearDashboardFilters,
    openEditModal,
    openAddModal,
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
    bankTotals,
    selectedBank,
    selectedCategory,
    sortConfig,
    setSortConfig,
    lineChartData,
    handleBankSelect,
    handleCategorySelect,
    clearDashboardFilters,
    openEditModal,
    openAddModal,
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
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-4 md:p-8">
                <motion.section
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="col-span-12 rounded-2xl border border-gray-800 bg-[#1A2232] shadow-2xl p-4 md:p-6 space-y-4"
                >
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 md:px-5 backdrop-blur-sm">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-100">
                      <SplitText text={`Hoş Geldin ${dashboardGreetingName}`} by="chars" stagger={0.025} />
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-slate-400">Finansal durumunun güncel özetini aşağıda bulabilirsin.</p>
                  </div>

                  <SpotlightCard
                    spotlightColor="rgba(99, 102, 241, 0.18)"
                    className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-900/35 via-[#16233d] to-[#0b1120] p-5 sm:p-6 md:p-8 lg:p-10 shadow-[0_28px_80px_rgba(8,15,32,0.6)]"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-200/85">Genel Portföy</p>
                        <h2 className="mt-2 text-5xl md:text-6xl font-black text-white tracking-tight leading-none">
                          <ShinyText>
                            {renderCurrencyWithMutedSymbol(dashboardTotalValue)}
                          </ShinyText>
                        </h2>
                        <p className="mt-4 text-sm text-slate-300">
                          (Bankalardaki Toplam: {renderCurrencyWithMutedSymbol(totalValue)})
                        </p>
                        {malVarligiManuelToplam > 0 ? (
                          <p className="mt-1 text-xs text-slate-300/85">
                            Mal Varlığı Katkısı (Araç/Gayrimenkul/Diğer): {renderCurrencyWithMutedSymbol(malVarligiManuelToplam)}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-500">Şu an net değer yalnızca kurumlardaki varlıklardan oluşuyor.</p>
                        )}
                      </div>

                      <div className={`w-full md:w-auto md:min-w-[260px] rounded-2xl border p-4 md:p-5 ${totalProfit >= 0 ? 'border-emerald-300/35 bg-emerald-500/12' : 'border-rose-300/35 bg-rose-500/12'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-200">Toplam Performans</p>
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-black/20">
                            <Wallet className={`h-4 w-4 ${totalProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`} />
                          </span>
                        </div>
                        <p className={`mt-3 text-2xl md:text-3xl font-extrabold tracking-tight ${totalProfit >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                          {totalProfit > 0 ? '+' : ''}{renderCurrencyWithMutedSymbol(animatedProfit)}
                        </p>
                        <p className={`mt-1 text-sm font-bold ${totalProfit >= 0 ? 'text-emerald-100' : 'text-rose-100'}`}>
                          {renderPercentText(animatedProfitPercent)}
                        </p>
                      </div>
                    </div>
                  </SpotlightCard>

                  <div className="mt-4 flex justify-center">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-[0.04em] ${
                        portfolioRealReturnPercent >= 0
                          ? 'border-emerald-300/40 bg-emerald-500/10 text-emerald-200'
                          : 'border-rose-300/45 bg-rose-500/10 text-rose-100'
                      }`}
                    >
                      Reel Getiri ({selectedInflationSourceLabel})
                      <span className="font-bold">
                        {isPrivacyActive ? maskValue(`${portfolioRealReturnPercent >= 0 ? '+' : '-'}%${Math.abs(portfolioRealReturnPercent).toFixed(2)}`) : `${portfolioRealReturnPercent >= 0 ? '+' : '-'}%${Math.abs(portfolioRealReturnPercent).toFixed(2)}`}
                      </span>
                    </span>
                  </div>
                </motion.section>

                <GrowthChart />

                <DistributionCard />

                <motion.section
                  layout
                  transition={{ type: 'spring', stiffness: 140, damping: 24 }}
                  className="col-span-12 md:col-span-4 md:order-2 rounded-3xl border border-gray-800 bg-[#1A2232] p-5 md:p-6 shadow-2xl"
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