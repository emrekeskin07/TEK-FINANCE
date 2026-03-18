import { calculateRealReturnPercent, getLatestAnnualInflationRate } from './financeMath';
import { resolveAssetActivePrice } from './assetPricing';

const DAILY_DROP_THRESHOLD = -5;

const INFLATION_LABELS = {
  enag: 'ENAG',
  tuik: 'TUIK',
};

const formatPercent = (value) => `%${Number(value || 0).toFixed(2)}`;

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});

export const buildAlertInsights = ({
  portfolio,
  marketData,
  marketChanges,
  totalValue,
  inflationSource = 'enag',
  hasPurchasingPowerRisk = false,
  portfolioRealReturnPercent = 0,
  inflationSourceLabel,
} = {}) => {
  const alerts = [];

  let latestInflation = null;
  try {
    latestInflation = getLatestAnnualInflationRate({ source: inflationSource });
  } catch {
    try {
      latestInflation = getLatestAnnualInflationRate({ source: 'enag' });
    } catch {
      latestInflation = null;
    }
  }

  const selectedSource = String(latestInflation?.source || inflationSource || 'enag').toLowerCase();
  const fallbackLabel = INFLATION_LABELS[selectedSource] || selectedSource.toUpperCase();
  const sourceLabel = inflationSourceLabel || fallbackLabel;
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

  alerts.push({
    id: `portfolio-inflation-summary-${latestInflation?.year || 'current'}`,
    level: Number.isFinite(realPortfolioReturn) && realPortfolioReturn < 0 ? 'warning' : 'info',
    title: 'Alim Gucu Ozeti',
    detail: Number.isFinite(realPortfolioReturn) && realPortfolioReturn < 0
      ? `Portfoyun, secili ${sourceLabel} enflasyonuna (${formatPercent(selectedAnnualInflationRate)}) karsi direnemiyor. Aylik reel kaybin ${TRY_FORMATTER.format(monthlyRealDeltaAmount)} civarinda.`
      : `Portfoyun, secili ${sourceLabel} enflasyonuna (${formatPercent(selectedAnnualInflationRate)}) karsi simdilik dayanikli. Aylik reel degisim ${TRY_FORMATTER.format(monthlyRealDeltaAmount)} seviyesinde.`,
    ctaToInflation: true,
  });

  if (Number.isFinite(realPortfolioReturn) && realPortfolioReturn < 0) {
    alerts.push({
      id: `portfolio-annual-risk-${latestInflation?.year || 'current'}`,
      level: 'warning',
      title: 'Alim Gucu Riski',
      detail: `Portfoyun ${sourceLabel} karsisinda reel olarak ${formatPercent(Math.abs(realPortfolioReturn))} deger kaybediyor.`,
      ctaToInflation: true,
    });
  }

  if (hasPurchasingPowerRisk) {
    alerts.unshift({
      id: 'dashboard-purchasing-power-risk',
      level: 'warning',
      title: 'Dashboard Risk Uyarisi',
      detail: `Alim gucu riski aktif: Portfoyun ${sourceLabel} karsisinda reel olarak %${Math.abs(Number(portfolioRealReturnPercent || 0)).toFixed(2)} deger kaybediyor.`,
      ctaToInflation: true,
    });
  }

  const stockRows = (portfolio || []).filter((item) => (item.category || '') === 'Hisse Senedi');

  stockRows.forEach((item) => {
    const currentPrice = Number(resolveAssetActivePrice(item, marketData));
    const amount = Number(item.amount || 0);
    const assetValue = currentPrice * amount;
    const portfolioWeight = totalValue > 0 ? (assetValue / totalValue) * 100 : 0;
    const dailyChangePercent = Number(marketChanges?.[item.symbol]);

    if (Number.isFinite(dailyChangePercent) && dailyChangePercent <= DAILY_DROP_THRESHOLD) {
      const portfolioImpact = (portfolioWeight * Math.abs(dailyChangePercent)) / 100;
      const assetName = item.name || item.symbol;

      alerts.push({
        id: `${item.id || item.symbol}-daily-drop`,
        level: 'critical',
        title: `Dikkat: ${assetName} son 24 saatte sert dustu`,
        detail: `Portfoy etkisi yaklasik ${formatPercent(portfolioImpact)} dusus. Gunluk degisim: ${formatPercent(dailyChangePercent)}.`,
      });
    }
  });

  return alerts.slice(0, 10);
};
