import { useMemo } from 'react';
import { resolveAssetActivePrice } from '../utils/assetPricing';
import { calculateRealReturnPercent, getLatestAnnualInflationRate } from '../utils/financeMath';

export function usePortfolioMetrics({
  portfolio,
  marketData,
  manualAssets,
  inflationSource,
}) {
  const totalValue = useMemo(() => (
    portfolio.reduce((acc, item) => {
      const currentPrice = resolveAssetActivePrice(item, marketData);
      return acc + (currentPrice * item.amount);
    }, 0)
  ), [portfolio, marketData]);

  const totalCost = useMemo(() => (
    portfolio.reduce((acc, item) => acc + (item.avgPrice * item.amount), 0)
  ), [portfolio]);

  const totalProfit = totalValue - totalCost;

  const malVarligiManuelToplam = useMemo(
    () => manualAssets.reduce((acc, item) => acc + (Number(item?.value) || 0), 0),
    [manualAssets]
  );

  const dashboardTotalValue = totalValue + malVarligiManuelToplam;
  const dashboardTotalCost = totalCost + malVarligiManuelToplam;
  const profitPercentage = dashboardTotalCost > 0
    ? ((totalProfit / dashboardTotalCost) * 100).toFixed(2)
    : '0.00';

  const selectedAnnualInflationRate = useMemo(() => {
    try {
      const latestInflation = getLatestAnnualInflationRate({ source: inflationSource });
      return Number(latestInflation?.inflationRatePercent || 0);
    } catch {
      return 0;
    }
  }, [inflationSource]);

  const portfolioRealReturnPercent = useMemo(() => {
    const nominalReturnPercent = dashboardTotalCost > 0
      ? ((totalProfit / dashboardTotalCost) * 100)
      : 0;

    return calculateRealReturnPercent(nominalReturnPercent, selectedAnnualInflationRate);
  }, [dashboardTotalCost, totalProfit, selectedAnnualInflationRate]);

  const hasPurchasingPowerRisk = Number.isFinite(portfolioRealReturnPercent) && portfolioRealReturnPercent < 0;

  const bankTotals = useMemo(() => (
    portfolio.reduce((acc, item) => {
      const currentPrice = resolveAssetActivePrice(item, marketData);
      const itemValue = currentPrice * item.amount;
      const safeBankName = item.bank || 'Banka Belirtilmedi';

      if (!acc[safeBankName]) {
        acc[safeBankName] = 0;
      }

      acc[safeBankName] += itemValue;
      return acc;
    }, {})
  ), [portfolio, marketData]);

  const categoryTotals = useMemo(() => (
    portfolio.reduce((acc, item) => {
      const currentPrice = resolveAssetActivePrice(item, marketData);
      const itemValue = currentPrice * item.amount;
      const categoryName = item.category || 'Diğer';

      if (!acc[categoryName]) {
        acc[categoryName] = 0;
      }

      acc[categoryName] += itemValue;
      return acc;
    }, {})
  ), [portfolio, marketData]);

  const portfolioCashTotal = useMemo(() => (
    portfolio.reduce((acc, item) => {
      const categoryName = item.category || 'Diğer';
      if (categoryName !== 'Nakit' && categoryName !== 'Nakit/Banka') {
        return acc;
      }

      const currentPrice = resolveAssetActivePrice(item, marketData);
      return acc + (currentPrice * item.amount);
    }, 0)
  ), [portfolio, marketData]);

  const lineChartData = useMemo(() => {
    const total = Number(totalValue) || 0;
    const dayCount = 7;
    const points = Array.from({ length: dayCount }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (dayCount - 1 - index));

      return {
        label: date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
        timestamp: date.getTime(),
      };
    });

    const series = new Array(dayCount);
    series[dayCount - 1] = {
      date: points[dayCount - 1].label,
      timestamp: points[dayCount - 1].timestamp,
      value: total,
    };

    let nextValue = total;
    for (let index = dayCount - 2; index >= 0; index -= 1) {
      const drift = (Math.random() * 0.04) - 0.02;
      const safeDivisor = 1 + drift === 0 ? 1 : 1 + drift;
      const previousValue = Math.max(0, nextValue / safeDivisor);

      series[index] = {
        date: points[index].label,
        timestamp: points[index].timestamp,
        value: Number(previousValue.toFixed(2)),
      };

      nextValue = previousValue;
    }

    series[dayCount - 1].value = total;
    return series;
  }, [totalValue]);

  return {
    totalValue,
    totalCost,
    totalProfit,
    malVarligiManuelToplam,
    dashboardTotalValue,
    dashboardTotalCost,
    profitPercentage,
    selectedAnnualInflationRate,
    portfolioRealReturnPercent,
    hasPurchasingPowerRisk,
    bankTotals,
    categoryTotals,
    portfolioCashTotal,
    lineChartData,
  };
}
