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
        <article className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 to-white p-6 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-violet-400/25 dark:bg-slate-900">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            <Wallet className="h-3.5 w-3.5" />
            Toplam Portföy Değeri
          </p>
          <motion.p
            key={`total-${toSafeNumber(dashboardTotalValue).toFixed(2)}`}
            initial={{ opacity: 0.55, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mt-3 text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
          >
            {totalValueText}
          </motion.p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Güncel toplam varlık büyüklüğü</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Toplam Kâr / Zarar</p>
          <motion.p
            key={`profit-${toSafeNumber(totalProfit).toFixed(2)}`}
            initial={{ opacity: 0.55, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`mt-3 text-4xl font-bold tracking-tight ${totalTrend.className}`}
          >
            {totalProfitText}
          </motion.p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Net performans özeti</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            <Trophy className="h-3.5 w-3.5 text-emerald-500" />
            En İyi Varlık
          </p>
          <motion.p
            key={`best-${bestText}`}
            initial={{ opacity: 0.55, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mt-3 text-3xl font-bold tracking-tight text-emerald-500"
          >
            {displayedBestText}
          </motion.p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Getiriye göre en güçlü performans</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
            En Zayıf Varlık
          </p>
          <motion.p
            key={`worst-${worstText}`}
            initial={{ opacity: 0.55, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mt-3 text-3xl font-bold tracking-tight text-rose-500"
          >
            {displayedWorstText}
          </motion.p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Risk odaklı takip noktası</p>
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
