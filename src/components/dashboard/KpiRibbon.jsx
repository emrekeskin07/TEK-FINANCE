import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { TrendingDown, TrendingUp, Wallet, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../../utils/helpers';
import { resolveAssetActivePrice } from '../../utils/assetPricing';

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

const toSignedPercent = (value) => {
  const numeric = toSafeNumber(value);
  return `${numeric >= 0 ? '+' : '-'}%${Math.abs(numeric).toFixed(2)}`;
};

export default function KpiRibbon({
  dashboardTotalValue,
  totalProfit,
  profitPercentage,
  baseCurrency,
  rates,
  portfolio,
  marketData,
  isPrivacyActive,
  maskValue,
  isLoading,
}) {
  const performers = useMemo(() => {
    const rows = (Array.isArray(portfolio) ? portfolio : []).map((item) => {
      const amount = toSafeNumber(item?.amount);
      const avgPrice = toSafeNumber(item?.avgPrice || item?.cost);
      const currentPrice = toSafeNumber(resolveAssetActivePrice(item, marketData));
      const costValue = amount * avgPrice;
      const currentValue = amount * currentPrice;
      const profitValue = currentValue - costValue;
      const profitPercentValue = costValue > 0 ? ((profitValue / costValue) * 100) : 0;

      return {
        name: String(item?.name || item?.symbol || 'Varlık').trim(),
        profitPercentValue,
        profitValue,
      };
    });

    if (!rows.length) {
      return {
        best: null,
        worst: null,
      };
    }

    const sorted = [...rows].sort((a, b) => b.profitPercentValue - a.profitPercentValue);

    return {
      best: sorted[0] || null,
      worst: sorted[sorted.length - 1] || null,
    };
  }, [portfolio, marketData]);

  const totalTrend = resolveTrend(totalProfit);

  const totalValueText = isPrivacyActive
    ? maskValue(formatCurrency(dashboardTotalValue, baseCurrency, rates))
    : formatCurrency(dashboardTotalValue, baseCurrency, rates);

  const totalProfitText = isPrivacyActive
    ? maskValue(`${formatSignedCurrency(totalProfit, baseCurrency, rates)} / ${formatSignedPercent(profitPercentage)}`)
    : `${formatSignedCurrency(totalProfit, baseCurrency, rates)} / ${formatSignedPercent(profitPercentage)}`;

  const bestText = performers.best
    ? `${performers.best.name} • ${toSignedPercent(performers.best.profitPercentValue)}`
    : '--';
  const worstText = performers.worst
    ? `${performers.worst.name} • ${toSignedPercent(performers.worst.profitPercentValue)}`
    : '--';

  const displayedBestText = isPrivacyActive ? maskValue(bestText) : bestText;
  const displayedWorstText = isPrivacyActive ? maskValue(worstText) : worstText;

  if (isLoading) {
    return (
      <section className="col-span-12 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 md:p-4 dark:border-slate-800 dark:bg-slate-950/30" aria-hidden="true">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <article key={`kpi-skeleton-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="animate-pulse space-y-3">
                <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-8 w-44 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-36 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="col-span-12 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 md:p-6 dark:border-slate-800 dark:bg-slate-950/30">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" aria-hidden="true" />
          <p className="relative z-10 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-white">
            <Wallet className="h-4 w-4 text-white" />
            Toplam Portföy Değeri
          </p>
          <motion.p
            key={`total-${toSafeNumber(dashboardTotalValue).toFixed(2)}`}
            initial={{ opacity: 0.55, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="relative z-10 mt-3 text-4xl font-extrabold tracking-tight text-white drop-shadow-sm"
          >
            {totalValueText}
          </motion.p>
          <p className="relative z-10 mt-2 text-sm text-slate-300">Güncel toplam varlık büyüklüğü</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Toplam Kâr / Zarar</p>
          <motion.p
            key={`profit-${toSafeNumber(totalProfit).toFixed(2)}`}
            initial={{ opacity: 0.55, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`mt-3 text-4xl font-extrabold tracking-tight drop-shadow-sm flex items-baseline gap-2 ${totalTrend.className}`}
          >
            <span className="text-slate-900 dark:text-white">{totalProfitText.split(' / ')[0]}</span>
            <span className={`text-[1.35rem] font-bold ${totalProfit >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>/ {totalProfitText.split(' / ')[1]}</span>
          </motion.p>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">Net performans özeti</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
            <Trophy className="h-4 w-4 text-emerald-500" />
            En İyi Varlık
          </p>
          <motion.p
            key={`best-${bestText}`}
            initial={{ opacity: 0.55, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mt-3 text-3xl font-extrabold tracking-tight flex items-baseline gap-2"
          >
            <span className="text-slate-900 dark:text-white">{displayedBestText.split(' • ')[0]}</span>
            <span className="text-[1.25rem] font-bold text-emerald-500 leading-none">
              {displayedBestText.split(' • ')[1] ? `• ${displayedBestText.split(' • ')[1]}` : ''}
            </span>
          </motion.p>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">Getiriye göre en güçlü performans</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
            <TrendingDown className="h-4 w-4 text-rose-500" />
            En Zayıf Varlık
          </p>
          <motion.p
            key={`worst-${worstText}`}
            initial={{ opacity: 0.55, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mt-3 text-3xl font-extrabold tracking-tight flex items-baseline gap-2"
          >
            <span className="text-slate-900 dark:text-white">{displayedWorstText.split(' • ')[0]}</span>
            <span className="text-[1.25rem] font-bold text-rose-500 leading-none">
              {displayedWorstText.split(' • ')[1] ? `• ${displayedWorstText.split(' • ')[1]}` : ''}
            </span>
          </motion.p>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">Risk odaklı takip noktası</p>
        </article>
      </div>
    </section>
  );
}

KpiRibbon.propTypes = {
  dashboardTotalValue: PropTypes.number.isRequired,
  totalProfit: PropTypes.number.isRequired,
  profitPercentage: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  baseCurrency: PropTypes.string.isRequired,
  rates: PropTypes.object,
  portfolio: PropTypes.arrayOf(PropTypes.object),
  marketData: PropTypes.object,
  isPrivacyActive: PropTypes.bool,
  maskValue: PropTypes.func,
  isLoading: PropTypes.bool,
};

KpiRibbon.defaultProps = {
  rates: {},
  portfolio: [],
  marketData: {},
  isPrivacyActive: false,
  maskValue: (value) => value,
  isLoading: false,
};
