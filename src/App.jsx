import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { usePortfolio } from './hooks/usePortfolio';
import { useMarketData } from './hooks/useMarketData';
import { useAuthSession } from './hooks/useAuthSession';
import { useManualAssets } from './hooks/useManualAssets';
import { usePortfolioMetrics } from './hooks/usePortfolioMetrics';
import { useAnimatedCounter } from './hooks/useAnimatedCounter';
import Header from './components/Header';
import BankTotals from './components/BankTotals';
import SummaryCards from './components/SummaryCards';
import PortfolioTable from './components/PortfolioTable';
import SpotlightCard from './components/SpotlightCard';
import ShinyText from './components/ui/ShinyText';
import SplitText from './components/ui/SplitText';
import AlertDrawer from './components/AlertDrawer';
import AssetModal from './components/AssetModal';
import AuthPage from './components/AuthPage';
import MalVarligiPage from './components/MalVarligiPage';
import EnflasyonAnaliziPage from './components/EnflasyonAnaliziPage';
import { SyncContext } from './context/SyncContext';
import { usePrivacy } from './context/PrivacyContext';
import { formatCurrencyParts } from './utils/helpers';
import { buildAlertInsights } from './utils/alertInsights';

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
  const [prefilledPortfolioName, setPrefilledPortfolioName] = useState('');
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

    // Dashboard acilisinda alan bos gelsin; detay sayfasi veya URL'den acilis senaryosunda prefill kullan.
    const resolvedPrefill = activePage === 'dashboard'
      ? ''
      : (String(explicitPortfolioName || resolvePortfolioNameFromUrl()).trim());

    setPrefilledPortfolioName(resolvedPrefill);
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
    setPrefilledPortfolioName('');
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
    hasPurchasingPowerRisk,
    bankTotals,
    categoryTotals,
    portfolioCashTotal,
    lineChartData,
  } = usePortfolioMetrics({
    portfolio,
    marketData,
    manualAssets,
    inflationSource,
  });

  const animatedProfit = useAnimatedCounter(totalProfit);
  const animatedProfitPercent = useAnimatedCounter(Number(profitPercentage));

  const selectedInflationSourceLabel = inflationSource === 'tuik' ? 'TÜİK' : 'ENAG';
  const dashboardGreetingName = authUser?.user_metadata?.full_name
    || authUser?.user_metadata?.name
    || authUser?.email?.split('@')?.[0]
    || 'Kullanıcı';

  const alerts = useMemo(() => buildAlertInsights({
    portfolio,
    marketData,
    marketChanges,
    totalValue: dashboardTotalValue,
    inflationSource,
    hasPurchasingPowerRisk,
    portfolioRealReturnPercent,
    inflationSourceLabel: selectedInflationSourceLabel,
  }), [
    portfolio,
    marketData,
    marketChanges,
    dashboardTotalValue,
    inflationSource,
    hasPurchasingPowerRisk,
    portfolioRealReturnPercent,
    selectedInflationSourceLabel,
  ]);

  const activeAlertCount = useMemo(() => (
    alerts.filter((item) => item.level === 'critical' || item.level === 'warning').length
  ), [alerts]);

  const previewAlerts = useMemo(() => alerts.slice(0, 3), [alerts]);
  const portfolioNameOptions = useMemo(() => {
    const uniqueNames = new Set();

    portfolio.forEach((item) => {
      const name = String(item?.portfolioName || item?.portfolio_name || '').trim();
      if (name) {
        uniqueNames.add(name);
      }
    });

    return Array.from(uniqueNames);
  }, [portfolio]);

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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0f1c] to-black text-slate-100 font-sans px-4 py-5 md:px-8 md:py-8 xl:px-10 xl:py-10">
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
            <motion.section
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 md:px-5 backdrop-blur-sm">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-100">
                  <SplitText text={`Hoş Geldin ${dashboardGreetingName}`} by="chars" stagger={0.025} />
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">Finansal durumunun güncel özetini aşağıda bulabilirsin.</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-8 xl:gap-10">
                <SpotlightCard
                  spotlightColor="rgba(34, 197, 94, 0.2)"
                  className="relative overflow-hidden rounded-3xl border border-slate-600/40 bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#030712] p-5 sm:p-6 md:p-8 lg:p-10 shadow-[0_25px_80px_rgba(3,7,18,0.55)]"
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">Genel Portföy Toplamı</p>
                      <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-100">
                        <ShinyText>
                          {renderCurrencyWithMutedSymbol(dashboardTotalValue)}
                        </ShinyText>
                      </h2>
                      <p className="mt-4 text-sm text-slate-400">
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
                    <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-3">
                      <Wallet className="h-6 w-6 text-emerald-300" />
                    </div>
                  </div>
                </SpotlightCard>

                <SpotlightCard
                  spotlightColor={totalProfit >= 0 ? 'rgba(74, 222, 128, 0.24)' : 'rgba(56, 189, 248, 0.2)'}
                  className="relative overflow-hidden rounded-3xl border border-slate-600/40 bg-gradient-to-br from-[#0b1220] via-[#0a1426] to-[#030712] p-5 sm:p-6 md:p-8 lg:p-10 shadow-[0_25px_80px_rgba(3,7,18,0.55)]"
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">Kâr / Zarar</p>
                      <h2 className={`mt-2 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight ${totalProfit >= 0 ? 'text-[#2BFF88]' : 'text-[#FF3B6B]'}`}>
                        <ShinyText>
                          {totalProfit > 0 ? '+' : ''}{renderCurrencyWithMutedSymbol(animatedProfit)}
                        </ShinyText>
                      </h2>
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5">
                        <span className={`text-sm font-bold ${totalProfit >= 0 ? 'text-[#2BFF88]' : 'text-[#FF3B6B]'}`}>
                          {isPrivacyActive ? maskValue(`${totalProfit > 0 ? '+' : ''}${animatedProfitPercent.toFixed(2)}%`) : `${totalProfit > 0 ? '+' : ''}${animatedProfitPercent.toFixed(2)}%`}
                        </span>
                        <span className="text-xs text-slate-400">toplam performans</span>
                      </div>
                    </div>
                    <div className={`rounded-2xl border p-3 ${totalProfit >= 0 ? 'border-[#2BFF88]/40 bg-[#2BFF88]/10' : 'border-[#FF3B6B]/40 bg-[#FF3B6B]/10'}`}>
                      {totalProfit >= 0 ? (
                        <TrendingUp className="h-6 w-6 text-[#2BFF88]" />
                      ) : (
                        <TrendingDown className="h-6 w-6 text-[#FF3B6B]" />
                      )}
                    </div>
                  </div>
                </SpotlightCard>
              </div>

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

            <div className="columns-1 2xl:columns-2 gap-6 [column-fill:_balance]">
              <motion.section
                layout
                transition={{ type: 'spring', stiffness: 140, damping: 24 }}
                className="mb-6 break-inside-avoid"
              >
                <BankTotals 
                  bankTotals={bankTotals} 
                  baseCurrency={baseCurrency} 
                  rates={rates}
                  totalValue={totalValue}
                  selectedBank={selectedBank}
                  onSelectBank={handleBankSelect}
                />
              </motion.section>

              <motion.section
                layout
                transition={{ type: 'spring', stiffness: 140, damping: 24 }}
                className="mb-6 break-inside-avoid"
              >
                <SummaryCards 
                  totalValue={dashboardTotalValue}
                  totalCost={dashboardTotalCost}
                  totalProfit={totalProfit}
                  profitPercentage={profitPercentage}
                  baseCurrency={baseCurrency}
                  rates={rates}
                  bankTotals={bankTotals}
                  categoryTotals={categoryTotals}
                  physicalAssetsTotal={malVarligiManuelToplam}
                  portfolio={portfolio}
                  marketData={marketData}
                  lineChartData={lineChartData}
                  showTopCards={false}
                />
              </motion.section>

              <motion.section
                layout
                transition={{ type: 'spring', stiffness: 140, damping: 24 }}
                className="mb-6 break-inside-avoid rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-200">Akıllı Öneriler</h3>
                  <button
                    type="button"
                    onClick={handleToggleAlertDrawer}
                    className="text-xs font-semibold rounded-md border border-sky-300/30 bg-sky-500/10 px-2.5 py-1 text-sky-200 hover:bg-sky-500/20 transition-colors"
                  >
                    Hepsini Gör
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-400">Risk ve öneriler artık Alert panelinde. Burada kısa bir önizleme görebilirsin.</p>

                {previewAlerts.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {previewAlerts.map((item) => (
                      <li key={item.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                        <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.detail}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-emerald-200">Şu an aktif bir kritik uyarı görünmüyor.</p>
                )}
              </motion.section>

              <motion.section
                layout
                transition={{ type: 'spring', stiffness: 140, damping: 24 }}
                className="mb-6 break-inside-avoid"
              >
                <PortfolioTable 
                  portfolio={portfolio}
                  marketData={marketData}
                  marketMeta={marketMeta}
                  loading={loading}
                  lastUpdated={lastUpdated}
                  baseCurrency={baseCurrency}
                  rates={rates}
                  totalValue={totalValue}
                  selectedBank={selectedBank}
                  selectedCategory={selectedCategory}
                  onSelectCategory={handleCategorySelect}
                  sortConfig={sortConfig}
                  setSortConfig={setSortConfig}
                  onClearFilter={() => {
                    setSelectedBank(null);
                    setSelectedCategory(null);
                  }}
                  openEditModal={openEditModal}
                  handleSellAsset={sellAsset}
                  handleRemoveAsset={removeAsset}
                />
              </motion.section>
            </div>
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
          prefilledPortfolioName={prefilledPortfolioName}
        />
      ) : null}
    </div>
    </SyncContext.Provider>
  );
}