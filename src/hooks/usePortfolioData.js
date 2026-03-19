import { useMemo } from 'react';
import { usePortfolioMetrics } from './usePortfolioMetrics';
import { buildAlertInsights } from '../utils/alertInsights';

export function usePortfolioData({
  portfolio,
  marketData,
  marketChanges,
  manualAssets,
  inflationSource,
}) {
  const metrics = usePortfolioMetrics({
    portfolio,
    marketData,
    manualAssets,
    inflationSource,
  });

  const selectedInflationSourceLabel = inflationSource === 'tuik' ? 'TÜİK' : 'ENAG';

  const alerts = useMemo(() => buildAlertInsights({
    portfolio,
    marketData,
    marketChanges,
    totalValue: metrics.dashboardTotalValue,
    inflationSource,
    hasPurchasingPowerRisk: metrics.hasPurchasingPowerRisk,
    portfolioRealReturnPercent: metrics.portfolioRealReturnPercent,
    inflationSourceLabel: selectedInflationSourceLabel,
  }), [
    portfolio,
    marketData,
    marketChanges,
    metrics.dashboardTotalValue,
    inflationSource,
    metrics.hasPurchasingPowerRisk,
    metrics.portfolioRealReturnPercent,
    selectedInflationSourceLabel,
  ]);

  const activeAlertCount = useMemo(() => (
    alerts.filter((item) => item.level === 'critical' || item.level === 'warning').length
  ), [alerts]);

  const previewAlerts = useMemo(() => alerts.slice(0, 3), [alerts]);

  const portfolioNameOptions = useMemo(() => {
    const uniqueNames = new Set();

    (Array.isArray(portfolio) ? portfolio : []).forEach((item) => {
      const name = String(item?.portfolioName || item?.portfolio_name || '').trim();
      if (name) {
        uniqueNames.add(name);
      }
    });

    return Array.from(uniqueNames);
  }, [portfolio]);

  return {
    ...metrics,
    selectedInflationSourceLabel,
    alerts,
    activeAlertCount,
    previewAlerts,
    portfolioNameOptions,
  };
}
