import React, { useMemo } from 'react';
import { AlertTriangle, TrendingDown, ShieldAlert } from 'lucide-react';
import { calculateRealReturnPercent, getLatestAnnualInflationRate } from '../utils/financeMath';
import { resolveAssetActivePrice } from '../utils/assetPricing';

const DAILY_DROP_THRESHOLD = -5;
const INFLATION_LABELS = {
  enag: 'ENAG',
  tuik: 'TÜİK',
};

const formatPercent = (value) => `%${Number(value || 0).toFixed(2)}`;
const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});

export default function SmartInsights({
  portfolio,
  marketData,
  marketChanges,
  totalValue,
  inflationSource = 'enag',
  onOpenInflationAnalysis,
}) {
  const insights = useMemo(() => {
    let latestInflation = null;

    try {
      latestInflation = getLatestAnnualInflationRate({ source: inflationSource });
    } catch {
      latestInflation = getLatestAnnualInflationRate({ source: 'enag' });
    }

    const selectedSource = String(latestInflation?.source || inflationSource || 'enag').toLowerCase();
    const inflationLabel = INFLATION_LABELS[selectedSource] || selectedSource.toUpperCase();
    const selectedAnnualInflationRate = Number(latestInflation?.inflationRatePercent || 0);

    const totalCurrentValue = (portfolio || []).reduce((sum, item) => {
      const currentPrice = Number(resolveAssetActivePrice(item, marketData));
      const amount = Number(item.amount || 0);
      return sum + (currentPrice * amount);
    }, 0);

    const totalCostValue = (portfolio || []).reduce((sum, item) => {
      const avgPrice = Number(item.avgPrice || 0);
      const amount = Number(item.amount || 0);
      return sum + (avgPrice * amount);
    }, 0);

    const nominalPortfolioReturn = totalCostValue > 0
      ? ((totalCurrentValue - totalCostValue) / totalCostValue) * 100
      : 0;

    const realPortfolioReturn = calculateRealReturnPercent(
      nominalPortfolioReturn,
      selectedAnnualInflationRate
    );

    const monthlyRealRate = Math.pow(1 + (realPortfolioReturn / 100), 1 / 12) - 1;
    const monthlyRealDeltaAmount = Math.abs(Number(totalValue || 0) * monthlyRealRate);

    const warnings = [];

    warnings.push({
      id: `portfolio-inflation-summary-${latestInflation?.year || 'current'}`,
      level: Number.isFinite(realPortfolioReturn) && realPortfolioReturn < 0 ? 'warning' : 'good',
      icon: ShieldAlert,
      title: 'Alım Gücü Özeti',
      detail: Number.isFinite(realPortfolioReturn) && realPortfolioReturn < 0
        ? `Portföyün, seçtiğin ${inflationLabel} enflasyonuna (${formatPercent(selectedAnnualInflationRate)}) karşı direnemiyor. Aylık reel kaybın ${TRY_FORMATTER.format(monthlyRealDeltaAmount)} civarında.`
        : `Portföyün, seçtiğin ${inflationLabel} enflasyonuna (${formatPercent(selectedAnnualInflationRate)}) karşı şimdilik direniyor. Aylık reel değişim ${TRY_FORMATTER.format(monthlyRealDeltaAmount)} seviyesinde.`,
      ctaToInflation: true,
    });

    const stockRows = (portfolio || []).filter((item) => (item.category || '') === 'Hisse Senedi');

    const stockWarnings = stockRows.flatMap((item) => {
      const currentPrice = Number(resolveAssetActivePrice(item, marketData));
      const amount = Number(item.amount || 0);
      const assetValue = currentPrice * amount;
      const portfolioWeight = totalValue > 0 ? (assetValue / totalValue) * 100 : 0;
      const dailyChangePercent = Number(marketChanges?.[item.symbol]);

      const assetName = item.name || item.symbol;
      const items = [];

      if (Number.isFinite(dailyChangePercent) && dailyChangePercent <= DAILY_DROP_THRESHOLD) {
        const portfolioImpact = (portfolioWeight * Math.abs(dailyChangePercent)) / 100;
        items.push({
          id: `${item.id}-daily-drop`,
          level: 'critical',
          icon: TrendingDown,
          title: `DIKKAT: ${assetName} son 24 saatte sert dustu`,
          detail: `Portfoy etkisi yaklasik ${formatPercent(portfolioImpact)} dusus. Gunluk degisim: ${formatPercent(dailyChangePercent)}.`,
        });
      }

      return items;
    });

    if (Number.isFinite(realPortfolioReturn) && realPortfolioReturn < 0) {
      stockWarnings.unshift({
        id: `portfolio-inflation-${latestInflation?.year || 'current'}`,
        level: 'warning',
        icon: ShieldAlert,
        title: 'Alım Gücü Riski',
        detail: `⚠️ Alım Gücü Riski: Portföyün ${inflationLabel} karşısında reel olarak ${formatPercent(Math.abs(realPortfolioReturn))} değer kaybediyor.`,
        ctaToInflation: true,
      });
    }

    return [...warnings, ...stockWarnings].slice(0, 8);
  }, [portfolio, marketData, marketChanges, totalValue, inflationSource]);

  const hasWarnings = insights.some((insight) => insight.level !== 'good');

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 md:p-8 shadow-2xl">
      {hasWarnings ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.16),transparent_55%)] animate-pulse" />
      ) : null}
      <div className="relative z-10">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="w-4 h-4 text-amber-300" />
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-200">Akilli Oneriler</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">24 saatlik sert dususler ve enflasyon referansina gore risk sinyalleri</p>

      {insights.length === 0 ? (
        <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Su an kritik bir uyari yok. Portfoy dagilimi dengeli gorunuyor.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
          {insights.map((insight) => {
            const Icon = insight.icon;
            const isCritical = insight.level === 'critical';
            const isGood = insight.level === 'good';
            const isClickable = Boolean(insight.ctaToInflation) && typeof onOpenInflationAnalysis === 'function';

            return (
              <article
                key={insight.id}
                onClick={isClickable ? () => onOpenInflationAnalysis() : undefined}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={isClickable ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenInflationAnalysis();
                  }
                } : undefined}
                className={`min-w-[280px] md:min-w-[330px] snap-start rounded-xl border px-4 py-3 ${
                  isCritical
                    ? 'border-rose-300/45 bg-rose-500/10'
                    : isGood
                      ? 'border-emerald-300/35 bg-emerald-500/10'
                    : 'border-amber-300/40 bg-amber-500/10'
                } ${isClickable ? 'cursor-pointer transition hover:-translate-y-0.5 hover:border-rose-300/60' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${isCritical ? 'text-[#FF3B6B]' : isGood ? 'text-emerald-300' : 'text-amber-300'}`} />
                  <div>
                    <p className={`text-sm font-semibold leading-snug ${isCritical ? 'text-rose-200' : isGood ? 'text-emerald-100' : 'text-amber-100'}`}>
                      {insight.title}
                    </p>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{insight.detail}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      </div>
    </section>
  );
}
