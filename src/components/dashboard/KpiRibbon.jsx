import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Target, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';

const GOAL_STORAGE_PREFIX = 'tek-finance:userGoals';

const toSafeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatSignedCurrency = (value, baseCurrency, rates) => {
  const numeric = toSafeNumber(value);
  const raw = formatCurrency(Math.abs(numeric), baseCurrency, rates);
  if (numeric > 0) {
    return `+${raw}`;
  }
  if (numeric < 0) {
    return `-${raw}`;
  }
  return raw;
};

const formatSignedPercent = (value) => {
  const numeric = toSafeNumber(value);
  if (numeric > 0) {
    return `+%${Math.abs(numeric).toFixed(2)}`;
  }
  if (numeric < 0) {
    return `-%${Math.abs(numeric).toFixed(2)}`;
  }
  return '%0.00';
};

const resolveTrend = (value) => {
  const numeric = toSafeNumber(value);
  if (numeric > 0) {
    return {
      className: 'text-emerald-500',
      Icon: TrendingUp,
      iconLabel: 'Yukarı trend',
    };
  }

  if (numeric < 0) {
    return {
      className: 'text-red-500',
      Icon: TrendingDown,
      iconLabel: 'Aşağı trend',
    };
  }

  return {
    className: 'text-slate-400',
    Icon: null,
    iconLabel: '',
  };
};

export default function KpiRibbon({
  dashboardTotalValue,
  totalProfit,
  profitPercentage,
  lineChartData,
  portfolioRealReturnPercent,
  selectedInflationSourceLabel,
  baseCurrency,
  rates,
  userId,
  isPrivacyActive,
  maskValue,
  isLoading,
  onGoalNavigate,
}) {
  const [goalState, setGoalState] = useState({ name: '', targetAmount: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storageKey = `${GOAL_STORAGE_PREFIX}:${userId || 'guest'}`;
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      setGoalState({ name: '', targetAmount: 0 });
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const name = String(parsed?.name || '').trim();
      const targetAmount = toSafeNumber(parsed?.targetAmount);

      if (!name || targetAmount <= 0) {
        setGoalState({ name: '', targetAmount: 0 });
        return;
      }

      setGoalState({ name, targetAmount });
    } catch {
      setGoalState({ name: '', targetAmount: 0 });
    }
  }, [userId]);

  const dailyStats = useMemo(() => {
    const series = Array.isArray(lineChartData) ? lineChartData : [];
    if (series.length < 2) {
      return { dailyChange: 0, dailyChangePercent: 0 };
    }

    const latest = toSafeNumber(series[series.length - 1]?.value);
    const previous = toSafeNumber(series[series.length - 2]?.value);
    const dailyChange = latest - previous;
    const dailyChangePercent = Math.abs(previous) > 0.0001 ? ((dailyChange / previous) * 100) : 0;

    return { dailyChange, dailyChangePercent };
  }, [lineChartData]);

  const goalProgress = useMemo(() => {
    if (!goalState.name || goalState.targetAmount <= 0) {
      return null;
    }

    const progressValue = Math.max(0, Math.min(100, (toSafeNumber(dashboardTotalValue) / goalState.targetAmount) * 100));
    return {
      name: goalState.name,
      progress: progressValue,
      targetAmount: goalState.targetAmount,
    };
  }, [goalState, dashboardTotalValue]);

  const totalTrend = resolveTrend(totalProfit);
  const dailyTrend = resolveTrend(dailyStats.dailyChange);
  const realTrend = resolveTrend(portfolioRealReturnPercent);

  const totalValueText = isPrivacyActive
    ? maskValue(formatCurrency(dashboardTotalValue, baseCurrency, rates))
    : formatCurrency(dashboardTotalValue, baseCurrency, rates);

  const totalProfitText = isPrivacyActive
    ? maskValue(`${formatSignedCurrency(totalProfit, baseCurrency, rates)} / ${formatSignedPercent(profitPercentage)}`)
    : `${formatSignedCurrency(totalProfit, baseCurrency, rates)} / ${formatSignedPercent(profitPercentage)}`;

  const dailyText = isPrivacyActive
    ? maskValue(`${formatSignedCurrency(dailyStats.dailyChange, baseCurrency, rates)} / ${formatSignedPercent(dailyStats.dailyChangePercent)}`)
    : `${formatSignedCurrency(dailyStats.dailyChange, baseCurrency, rates)} / ${formatSignedPercent(dailyStats.dailyChangePercent)}`;

  const realText = isPrivacyActive
    ? maskValue(formatSignedPercent(portfolioRealReturnPercent))
    : formatSignedPercent(portfolioRealReturnPercent);

  const goalTargetText = goalProgress
    ? (isPrivacyActive
      ? maskValue(formatCurrency(goalProgress.targetAmount, baseCurrency, rates))
      : formatCurrency(goalProgress.targetAmount, baseCurrency, rates))
    : '';

  if (isLoading) {
    return (
      <section className="col-span-12 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 md:p-4 dark:border-slate-800 dark:bg-slate-950/30" aria-hidden="true">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <article key={`kpi-skeleton-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="animate-pulse space-y-3">
                <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 w-44 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-36 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </article>
          ))}
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md md:col-span-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="animate-pulse space-y-3">
              <div className="h-3 w-44 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </article>
        </div>
      </section>
    );
  }

  return (
    <section className="col-span-12 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 md:p-4 dark:border-slate-800 dark:bg-slate-950/30">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <article className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 to-white p-5 shadow-lg dark:border-violet-400/25 dark:bg-slate-900">
          <p className="text-ui-h2 text-slate-800 dark:text-slate-100">Toplam Varlık</p>
          <p className="mt-2 text-ui-h1 text-slate-900 dark:text-slate-100">{totalValueText}</p>
          <div className={`mt-3 inline-flex items-center gap-2 text-sm font-semibold ${totalTrend.className}`}>
            {totalTrend.Icon ? <totalTrend.Icon className="h-4 w-4" aria-label={totalTrend.iconLabel} /> : null}
            <span>{totalProfitText}</span>
          </div>
          <p className="mt-1 text-ui-body text-slate-500 dark:text-slate-400">All-Time Kâr/Zarar</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-800 dark:bg-slate-900">
          <p className="text-ui-h2 text-slate-800 dark:text-slate-100">Bugünkü Performans</p>
          <div className={`mt-2 inline-flex items-center gap-2 text-2xl font-bold tracking-tight md:text-4xl ${dailyTrend.className}`}>
            {dailyTrend.Icon ? <dailyTrend.Icon className="h-5 w-5" aria-label={dailyTrend.iconLabel} /> : null}
            <span>{dailyText}</span>
          </div>
          <p className="mt-2 text-ui-body text-slate-500 dark:text-slate-400">Son iki gün kapanış değerine göre günlük net değişim.</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-800 dark:bg-slate-900">
          <p className="text-ui-h2 text-slate-800 dark:text-slate-100">Reel Performans</p>
          <div className={`mt-2 inline-flex items-center gap-2 text-2xl font-bold tracking-tight md:text-4xl ${realTrend.className}`}>
            {realTrend.Icon ? <realTrend.Icon className="h-5 w-5" aria-label={realTrend.iconLabel} /> : null}
            <span>{realText}</span>
          </div>
          <p className="mt-2 text-ui-body text-slate-500 dark:text-slate-400">{selectedInflationSourceLabel} enflasyonuna göre düzeltilmiş getiri.</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md md:col-span-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-ui-h2 text-slate-800 dark:text-slate-100">Hedef Takibi Özeti</p>
            {goalProgress ? <p className="text-ui-body text-slate-500 dark:text-slate-400">{goalProgress.name} • Hedef {goalTargetText}</p> : null}
          </div>

          {goalProgress ? (
            <>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-emerald-500"
                  style={{ width: `${goalProgress.progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">%{goalProgress.progress.toFixed(0)} tamamlandı</p>
            </>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-slate-300/70 bg-slate-100/80 p-4 dark:border-slate-700 dark:bg-slate-800/55">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <Target className="h-4 w-4 text-slate-400" />
                Henüz bir hedef eklenmedi.
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Hedef kartından ilk birikim hedefini oluşturarak ilerlemeyi takip edebilirsin.</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onGoalNavigate?.('ev')}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-ui-body font-semibold text-slate-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Ev Hedefi Varlıkları
            </button>
            <button
              type="button"
              onClick={() => onGoalNavigate?.('araba')}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-ui-body font-semibold text-slate-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Araba Hedefi Varlıkları
            </button>
            <button
              type="button"
              onClick={() => onGoalNavigate?.('emeklilik')}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-ui-body font-semibold text-slate-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Emeklilik Hedefi Varlıkları
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

KpiRibbon.propTypes = {
  dashboardTotalValue: PropTypes.number.isRequired,
  totalProfit: PropTypes.number.isRequired,
  profitPercentage: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  lineChartData: PropTypes.arrayOf(PropTypes.object),
  portfolioRealReturnPercent: PropTypes.number.isRequired,
  selectedInflationSourceLabel: PropTypes.string.isRequired,
  baseCurrency: PropTypes.string.isRequired,
  rates: PropTypes.object,
  userId: PropTypes.string,
  isPrivacyActive: PropTypes.bool,
  maskValue: PropTypes.func,
  isLoading: PropTypes.bool,
  onGoalNavigate: PropTypes.func,
};

KpiRibbon.defaultProps = {
  lineChartData: [],
  rates: {},
  userId: null,
  isPrivacyActive: false,
  maskValue: (value) => value,
  isLoading: false,
  onGoalNavigate: () => {},
};
