import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

const ATH_CELEBRATION_STORAGE_PREFIX = 'tek-finance:ath-celebration';
const ATH_CELEBRATION_DURATION_MS = 3800;
const WEEKLY_FLOW_STORAGE_PREFIX = 'tek-finance:weekly-flow';

const resolveIsoWeekKey = (date = new Date()) => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

export function useEngagement({
  activePage,
  authUser,
  lineChartData,
  dashboardTotalValue,
  portfolio,
  marketChanges,
  onboardingState,
  shouldShowOnboarding,
}) {
  const [showAthCelebration, setShowAthCelebration] = useState(false);
  const [weeklyFlowOpen, setWeeklyFlowOpen] = useState(false);
  const [weeklyFlowStep, setWeeklyFlowStep] = useState(0);
  const athCelebrationTimeoutRef = useRef(null);

  useEffect(() => () => {
    if (athCelebrationTimeoutRef.current) {
      window.clearTimeout(athCelebrationTimeoutRef.current);
      athCelebrationTimeoutRef.current = null;
    }
  }, []);

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

    const riskProfile = String(onboardingState?.riskProfile || 'balanced').trim() || 'balanced';
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
  }, [lineChartData, dashboardTotalValue, portfolio, marketChanges, onboardingState?.riskProfile]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!authUser?.id || !onboardingState?.hasCompleted || shouldShowOnboarding) {
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
  }, [authUser?.id, onboardingState?.hasCompleted, shouldShowOnboarding]);

  return {
    showAthCelebration,
    triggerCelebration,
    weeklyFlowOpen,
    setWeeklyFlowOpen,
    weeklyFlowStep,
    setWeeklyFlowStep,
    weeklySummary,
  };
}
