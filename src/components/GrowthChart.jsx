import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { MARKET_DATA_ATTRIBUTION } from '../constants/trustContent';
import { useDashboardData } from '../context/DashboardContext';
import Button from './common/Button';
import { convertCurrency, formatCurrencyParts } from '../utils/helpers';

const RANGE_OPTIONS = [
  { key: '1D', label: '1D', days: 1, title: '1 Gün' },
  { key: '1W', label: '1W', days: 7, title: '1 Hafta' },
  { key: '1M', label: '1M', days: 30, title: '1 Ay' },
  { key: '1Y', label: '1Y', days: 365, title: '1 Yıl' },
];

const toFiniteNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

function TooltipContent({ active, payload, formatter }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const pointDate = payload[0]?.payload?.date || '-';

  const point = payload.find((item) => item?.dataKey === 'portfolio') || payload[0];

  return (
    <div className="min-w-[130px] rounded-lg border border-white/10 bg-[#0f172a]/95 px-3 py-2 text-xs backdrop-blur-sm">
      <p className="text-slate-400">{point?.payload?.date || '-'}</p>
      <p className="mt-1 font-semibold text-slate-100">{formatter(point?.value)}</p>
    </div>
  );
}

export default function GrowthChart() {
  const { lineChartData, rates, baseCurrency, loading, portfolioLoading } = useDashboardData();
  const { isPrivacyActive, maskValue } = usePrivacy();
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [isCompactScreen, setIsCompactScreen] = useState(false);
  const [selectedRange, setSelectedRange] = useState('1M');

  const safeLineChartData = useMemo(
    () => (Array.isArray(lineChartData) ? lineChartData : []),
    [lineChartData]
  );

  const filteredLineChartData = useMemo(() => {
    if (!safeLineChartData.length) {
      return [];
    }

    const selectedOption = RANGE_OPTIONS.find((option) => option.key === selectedRange);
    if (!selectedOption) {
      return safeLineChartData;
    }

    const latestTimestamp = safeLineChartData.reduce((maxValue, point) => {
      const timestamp = Number(point?.timestamp || 0);
      return Number.isFinite(timestamp) ? Math.max(maxValue, timestamp) : maxValue;
    }, 0);

    if (!latestTimestamp) {
      return safeLineChartData.slice(-Math.max(2, Math.min(selectedOption.days, safeLineChartData.length)));
    }

    const rangeMs = selectedOption.days * 24 * 60 * 60 * 1000;
    const threshold = latestTimestamp - rangeMs;

    const timeFiltered = safeLineChartData.filter((point) => Number(point?.timestamp || 0) >= threshold);
    if (timeFiltered.length >= 2) {
      return timeFiltered;
    }

    return safeLineChartData.slice(-Math.max(2, Math.min(selectedOption.days, safeLineChartData.length)));
  }, [safeLineChartData, selectedRange]);

  const convertedLineChartData = useMemo(
    () => filteredLineChartData.map((point) => ({
      ...point,
      value: convertCurrency(point?.value, baseCurrency, rates),
    })),
    [filteredLineChartData, baseCurrency, rates]
  );

  const chartData = useMemo(() => {
    if (!Array.isArray(convertedLineChartData) || !convertedLineChartData.length) {
      return [];
    }

    return convertedLineChartData.map((point) => ({
        date: point?.date,
        timestamp: point?.timestamp,
        portfolio: toFiniteNumber(point?.value),
      }));
  }, [convertedLineChartData]);

  const rangeChangePercent = useMemo(() => {
    if (convertedLineChartData.length < 2) {
      return null;
    }

    const firstValue = Number(convertedLineChartData[0]?.value || 0);
    const lastValue = Number(convertedLineChartData[convertedLineChartData.length - 1]?.value || 0);
    if (!Number.isFinite(firstValue) || !Number.isFinite(lastValue) || Math.abs(firstValue) < 0.0001) {
      return null;
    }

    return ((lastValue - firstValue) / Math.abs(firstValue)) * 100;
  }, [convertedLineChartData]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const applyMediaState = () => setIsCompactScreen(Boolean(mediaQuery.matches));

    applyMediaState();
    mediaQuery.addEventListener('change', applyMediaState);

    return () => mediaQuery.removeEventListener('change', applyMediaState);
  }, []);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    if (typeof window === 'undefined' || typeof window.ResizeObserver === 'undefined') {
      setIsReady(true);
      return undefined;
    }

    const update = () => {
      const rect = container.getBoundingClientRect();
      setIsReady(rect.width > 0 && rect.height > 0);
    };

    update();

    const observer = new window.ResizeObserver(() => update());
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const formatTryValue = (value) => {
    const rawText = formatCurrencyParts(Number(value || 0), baseCurrency, rates)
      .map((part) => part.value)
      .join('');

    return isPrivacyActive ? maskValue(rawText) : rawText;
  };

  const rangeChangeText = rangeChangePercent === null
    ? '--'
    : `${rangeChangePercent >= 0 ? '+' : '-'}%${Math.abs(rangeChangePercent).toFixed(1)}`;
  const displayedRangeChangeText = isPrivacyActive ? maskValue(rangeChangeText) : rangeChangeText;

  const hideNativeTooltip = (event) => {
    const button = event.currentTarget;
    if (button.hasAttribute('title')) {
      button.setAttribute('data-native-title', button.getAttribute('title') || '');
      button.removeAttribute('title');
    }
  };

  const restoreNativeTooltip = (event) => {
    const button = event.currentTarget;
    const cachedTitle = button.getAttribute('data-native-title');
    if (cachedTitle) {
      button.setAttribute('title', cachedTitle);
      button.removeAttribute('data-native-title');
    }
  };

  return (
    <motion.section
      layout
      transition={{ type: 'spring', stiffness: 140, damping: 24 }}
      className="col-span-12 lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-8 shadow-md dark:border-white/5 dark:bg-slate-900/40 dark:shadow-[0_26px_76px_rgba(2,6,23,0.62)] dark:backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] hover:border-fuchsia-400/35"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="flex items-center gap-2 text-ui-h2 text-slate-800 dark:text-slate-100">
            <TrendingUp className="h-4 w-4 text-primary" />
            Portföy Gelişimi
          </h3>
          <span className={`inline-flex min-h-[28px] items-center rounded-full border px-2.5 text-[11px] font-semibold ${
            rangeChangePercent === null
              ? 'border-white/10 bg-slate-900/60 text-slate-400'
              : (rangeChangePercent >= 0
                ? 'border-emerald-300/40 bg-emerald-500/20 text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.35)]'
                : 'border-pink-300/40 bg-pink-500/20 text-pink-100 shadow-[0_0_14px_rgba(236,72,153,0.3)]')
          }`}>
            {displayedRangeChangeText}
          </span>
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg border border-white/5 bg-slate-900/40 p-1 backdrop-blur-xl">
          {RANGE_OPTIONS.map((option) => {
            const isActive = selectedRange === option.key;
            return (
              <Button
                key={option.key}
                type="button"
                variant="ghost"
                onClick={() => setSelectedRange(option.key)}
                title={option.title}
                data-title={option.title}
                aria-label={option.title}
                onMouseEnter={hideNativeTooltip}
                onMouseLeave={restoreNativeTooltip}
                onFocus={hideNativeTooltip}
                onBlur={restoreNativeTooltip}
                className={`chart-range-tooltip relative min-h-[44px] rounded-md px-3 py-2 text-ui-body ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25 text-slate-50 shadow-[0_0_14px_rgba(217,70,239,0.24)]'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <span>{option.label}</span>
                {isActive ? (
                  <span className="absolute bottom-1 left-2 right-2 h-0.5 rounded-full bg-accent" aria-hidden="true" />
                ) : null}
              </Button>
            );
          })}
        </div>
      </div>

      <div ref={containerRef} className="relative h-[260px] min-h-[260px] w-full min-w-0 sm:h-[320px] md:h-[360px]">
        {loading || portfolioLoading ? (
          <div className="h-full w-full animate-pulse rounded-2xl border border-white/10 bg-slate-900/45 p-4" aria-hidden="true">
            <div className="mb-3 h-4 w-36 rounded bg-slate-800" />
            <div className="grid h-[86%] grid-cols-12 gap-3">
              <div className="col-span-1 h-full rounded bg-slate-800/85" />
              <div className="col-span-11 h-full rounded bg-slate-800/70" />
            </div>
          </div>
        ) : isReady && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" aspect={isCompactScreen ? 1 : undefined} minWidth={0} minHeight={0}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(203,213,225,0.2)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#cbd5e1"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                stroke="#cbd5e1"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatTryValue(value)}
                width={78}
              />
              <Tooltip content={(props) => <TooltipContent {...props} formatter={formatTryValue} />} />

              <Line
                type="monotone"
                dataKey="portfolio"
                name="Portföy"
                stroke="#A78BFA"
                strokeWidth={3.5}
                dot={false}
                activeDot={{ r: 4, stroke: '#10141d', strokeWidth: 2, fill: '#A78BFA' }}
                isAnimationActive
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
            Grafik hazırlanıyor...
          </div>
        )}

        <p className="pointer-events-none absolute bottom-2 right-2 text-ui-body text-slate-500 dark:text-slate-400">
          {MARKET_DATA_ATTRIBUTION}
        </p>
      </div>
    </motion.section>
  );
}
