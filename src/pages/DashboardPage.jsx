import React from 'react';
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton';
import KpiRibbon from '../components/dashboard/KpiRibbon';
import AiAssistantBrief from '../components/dashboard/AiAssistantBrief';
import Chart from '../components/dashboard/Chart';
import DistributionCard from '../components/DistributionCard';
import AssetList from '../components/AssetList';

export default function DashboardPage({
  dashboardContextValue,
  showInitialDashboardSkeleton,
  showDashboardMutationSkeleton,
  showDashboardEmptyState,
  dashboardTotalValue,
  totalProfit,
  profitPercentage,
  baseCurrency,
  rates,
  portfolio,
  marketData,
  isPrivacyActive,
  maskValue,
  loading,
  isPortfolioLoading,
  setIsCommandBarVisible,
  aiCommandBarRef,
  activeAssetCategory,
  setActiveAssetCategory,
}) {
  if (showInitialDashboardSkeleton) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="relative grid grid-cols-1 gap-5 p-3 sm:p-4 md:grid-cols-12 md:gap-7 md:p-8">
      <div id="dashboard-goal-summary" className="col-span-12">
        <KpiRibbon
          dashboardTotalValue={dashboardTotalValue}
            totalProfit={totalProfit}
            profitPercentage={Number(profitPercentage || 0)}
            baseCurrency={baseCurrency}
            rates={rates}
            portfolio={portfolio}
            marketData={marketData}
            isPrivacyActive={isPrivacyActive}
            maskValue={maskValue}
            isLoading={loading || isPortfolioLoading}
          />
        </div>

        {showDashboardEmptyState ? (
          <section className="col-span-12 rounded-2xl border border-dashed border-violet-300/55 bg-violet-100/55 p-8 text-center dark:border-violet-500/35 dark:bg-violet-950/25">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-violet-600 dark:text-violet-300">Portföy Başlangıcı</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Finansal durumunu görmek için ilk varlığını ekle</h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300">AI komut satırına bir varlık yazarak başla. Örnek: “5 gram altın ekle” veya “100 dolar aldım”.</p>
            <button
              type="button"
              onClick={() => {
                setIsCommandBarVisible(true);
                window.setTimeout(() => {
                  aiCommandBarRef.current?.focus?.();
                }, 80);
              }}
              className="mt-5 inline-flex min-h-[40px] items-center rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-violet-50 hover:shadow-md active:translate-y-0 dark:border-violet-400/45 dark:bg-slate-900 dark:text-violet-200 dark:hover:bg-slate-800"
            >
              AI ile Varlık Ekle
            </button>
          </section>
        ) : (
          <>
            <AiAssistantBrief />

            <div id="dashboard-analysis-section" className="col-span-12 grid grid-cols-12 gap-6 items-start">
              <Chart />
              <DistributionCard />
            </div>

            <AssetList
              activeAssetCategory={activeAssetCategory}
              setActiveAssetCategory={setActiveAssetCategory}
            />
          </>
        )}

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
  );
}
