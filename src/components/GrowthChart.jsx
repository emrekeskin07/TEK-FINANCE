import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { useDashboardData } from '../context/DashboardContext';
import Button from './common/Button';
import { convertCurrency, formatCurrencyParts } from '../utils/helpers';
import { fetchYahooHistoryBatch } from '../services/api';

const RANGE_OPTIONS = [
  { key: '1G', label: '1G', days: 1, title: '1 Gün' },
  { key: '1H', label: '1H', days: 7, title: '1 Hafta' },
  { key: '1A', label: '1A', days: 30, title: '1 Ay' },
  { key: '3A', label: '3A', days: 90, title: '3 Ay' },
  { key: '1Y', label: '1Y', days: 365, title: '1 Yıl' },
  { key: 'TUMU', label: 'TÜMÜ', days: null, title: 'Tüm Zamanlar' },
];

const BENCHMARK_RANGE_BY_CHART_RANGE = {
  '1G': '1mo',
  '1H': '1mo',
  '1A': '1mo',
  '3A': '3mo',
  '1Y': '1y',
  'TUMU': '5y',
};

const BIST_SYMBOL = '^XU100';
const USD_SYMBOL = 'USDTRY=X';

const toFiniteNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeSeriesBase100 = (values) => {
  if (!Array.isArray(values) || !values.length) {
    return [];
  }

  const baseValue = values.find((value) => Number.isFinite(Number(value)) && Number(value) > 0);
  const baseNumeric = Number(baseValue || 0);
  if (!Number.isFinite(baseNumeric) || baseNumeric <= 0) {
    return values.map(() => null);
  }

  return values.map((value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return null;
    }

    return Number(((numeric / baseNumeric) * 100).toFixed(3));
  });
};

const resampleSeriesByLength = (series, targetLength) => {
  if (!Array.isArray(series) || !series.length || !Number.isFinite(Number(targetLength)) || targetLength <= 0) {
    return [];
  }

  if (targetLength === 1) {
    return [toFiniteNumber(series[series.length - 1]?.close)];
  }

  if (series.length === 1) {
    return Array.from({ length: targetLength }, () => toFiniteNumber(series[0]?.close));
  }

  const maxSourceIndex = series.length - 1;
  const maxTargetIndex = targetLength - 1;

  return Array.from({ length: targetLength }, (_, targetIndex) => {
    const ratio = targetIndex / maxTargetIndex;
    const sourceIndex = Math.min(maxSourceIndex, Math.max(0, Math.round(ratio * maxSourceIndex)));
    return toFiniteNumber(series[sourceIndex]?.close);
  });
};

function TooltipContent({ active, payload, formatter, isBenchmarkMode }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const pointDate = payload[0]?.payload?.date || '-';

  if (isBenchmarkMode) {
    const rows = payload
      .filter((item) => typeof item?.dataKey === 'string')
      .map((item) => ({
        key: item.dataKey,
        label: item.name,
        color: item.color,
        value: Number(item?.value),
      }));

    return (
      <div className="min-w-[150px] rounded-lg border border-white/10 bg-[#0f172a]/95 px-3 py-2 text-xs backdrop-blur-sm">
        <p className="text-slate-400">{pointDate}</p>
        {rows.map((row) => (
          <p key={`tooltip-${row.key}`} className="mt-1 flex items-center gap-2 text-slate-100">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
            <span>{row.label}: {Number.isFinite(row.value) ? `${row.value.toFixed(2)} (100 baz)` : '-'}</span>
          </p>
        ))}
      </div>
    );
  }

  const point = payload.find((item) => item?.dataKey === 'portfolio') || payload[0];

  return (
    <div className="min-w-[130px] rounded-lg border border-white/10 bg-[#0f172a]/95 px-3 py-2 text-xs backdrop-blur-sm">
      <p className="text-slate-400">{point?.payload?.date || '-'}</p>
      <p className="mt-1 font-semibold text-slate-100">{formatter(point?.value)}</p>
    </div>
  );
}

export default function GrowthChart() {
  const { lineChartData, rates, baseCurrency } = useDashboardData();
  const { isPrivacyActive, maskValue } = usePrivacy();
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [isCompactScreen, setIsCompactScreen] = useState(false);
  const [selectedRange, setSelectedRange] = useState('TUMU');
  const [isBistBenchmarkEnabled, setIsBistBenchmarkEnabled] = useState(false);
  const [isUsdBenchmarkEnabled, setIsUsdBenchmarkEnabled] = useState(false);
  const [benchmarkSeries, setBenchmarkSeries] = useState({
    [BIST_SYMBOL]: [],
    [USD_SYMBOL]: [],
  });

  const safeLineChartData = useMemo(
    () => (Array.isArray(lineChartData) ? lineChartData : []),
    [lineChartData]
  );

  const filteredLineChartData = useMemo(() => {
    if (!safeLineChartData.length) {
      return [];
    }

    const selectedOption = RANGE_OPTIONS.find((option) => option.key === selectedRange);
    if (!selectedOption || selectedOption.days === null) {
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

  const isBenchmarkMode = isBistBenchmarkEnabled || isUsdBenchmarkEnabled;
  const selectedBenchmarkRange = BENCHMARK_RANGE_BY_CHART_RANGE[selectedRange] || '6mo';

  useEffect(() => {
    let isMounted = true;

    const loadBenchmarkSeries = async () => {
      if (!isBenchmarkMode) {
        if (isMounted) {
          setBenchmarkSeries({
            [BIST_SYMBOL]: [],
            [USD_SYMBOL]: [],
          });
        }
        return;
      }

      const symbols = [];
      if (isBistBenchmarkEnabled) {
        symbols.push(BIST_SYMBOL);
      }
      if (isUsdBenchmarkEnabled) {
        symbols.push(USD_SYMBOL);
      }

      const data = await fetchYahooHistoryBatch({
        symbols,
        range: selectedBenchmarkRange,
        interval: '1d',
      });

      if (!isMounted) {
        return;
      }

      const bySymbol = {
        [BIST_SYMBOL]: [],
        [USD_SYMBOL]: [],
      };

      (Array.isArray(data) ? data : []).forEach((item) => {
        const symbol = String(item?.symbol || '').trim().toUpperCase();
        if (symbol === BIST_SYMBOL || symbol === USD_SYMBOL) {
          bySymbol[symbol] = Array.isArray(item?.series) ? item.series : [];
        }
      });

      setBenchmarkSeries(bySymbol);
    };

    loadBenchmarkSeries();

    return () => {
      isMounted = false;
    };
  }, [isBenchmarkMode, isBistBenchmarkEnabled, isUsdBenchmarkEnabled, selectedBenchmarkRange]);

  const chartData = useMemo(() => {
    const baseSeries = Array.isArray(convertedLineChartData) ? convertedLineChartData : [];
    if (!baseSeries.length) {
      return [];
    }

    const portfolioValues = baseSeries.map((point) => toFiniteNumber(point?.value));
    const portfolioValuesNormalized = isBenchmarkMode
      ? normalizeSeriesBase100(portfolioValues)
      : portfolioValues;

    const bistResampled = isBistBenchmarkEnabled
      ? resampleSeriesByLength(benchmarkSeries[BIST_SYMBOL], baseSeries.length)
      : [];
    const usdResampled = isUsdBenchmarkEnabled
      ? resampleSeriesByLength(benchmarkSeries[USD_SYMBOL], baseSeries.length)
      : [];

    const normalizedBist = isBistBenchmarkEnabled ? normalizeSeriesBase100(bistResampled) : [];
    const normalizedUsd = isUsdBenchmarkEnabled ? normalizeSeriesBase100(usdResampled) : [];

    return baseSeries.map((point, index) => {
      const row = {
        date: point?.date,
        timestamp: point?.timestamp,
        portfolio: toFiniteNumber(portfolioValuesNormalized[index]),
      };

      if (isBistBenchmarkEnabled) {
        row.bist100 = toFiniteNumber(normalizedBist[index]);
      }

      if (isUsdBenchmarkEnabled) {
        row.usdtry = toFiniteNumber(normalizedUsd[index]);
      }

      return row;
    });
  }, [convertedLineChartData, isBenchmarkMode, isBistBenchmarkEnabled, isUsdBenchmarkEnabled, benchmarkSeries]);

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
  }, [chartData, isBenchmarkMode]);

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
      className="col-span-12 lg:col-span-7 rounded-2xl border border-white/5 bg-slate-900/40 p-8 shadow-[0_26px_76px_rgba(2,6,23,0.62)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] hover:border-fuchsia-400/35"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-tight text-slate-50">
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

        <div className="flex flex-col items-end gap-2">
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
                  className={`chart-range-tooltip relative min-h-[44px] rounded-md px-3 py-2 text-[11px] ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25 text-slate-50 shadow-[0_0_14px_rgba(217,70,239,0.24)]'
                      : 'text-slate-400 hover:text-slate-100'
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

          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-slate-900/50 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-slate-300/35">
              <input
                type="checkbox"
                checked={isBistBenchmarkEnabled}
                onChange={(event) => setIsBistBenchmarkEnabled(Boolean(event.target.checked))}
                className="h-4 w-4 accent-slate-300"
              />
              BIST100 ile Kıyasla
            </label>

            <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-slate-900/50 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-yellow-300/35">
              <input
                type="checkbox"
                checked={isUsdBenchmarkEnabled}
                onChange={(event) => setIsUsdBenchmarkEnabled(Boolean(event.target.checked))}
                className="h-4 w-4 accent-yellow-300"
              />
              USD ile Kıyasla
            </label>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="relative h-[260px] min-h-[260px] w-full min-w-0 sm:h-[320px] md:h-[360px]">
        {isReady && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" aspect={isCompactScreen ? 1 : undefined}>
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
                domain={isBenchmarkMode ? ['auto', 'auto'] : ['auto', 'auto']}
                stroke="#cbd5e1"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => (
                  isBenchmarkMode
                    ? `%${(Number(value || 0) - 100).toFixed(0)}`
                    : formatTryValue(value)
                )}
                width={78}
              />
              <Tooltip content={(props) => <TooltipContent {...props} formatter={formatTryValue} isBenchmarkMode={isBenchmarkMode} />} />

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

              {isBistBenchmarkEnabled ? (
                <Line
                  type="monotone"
                  dataKey="bist100"
                  name="BIST100"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="7 5"
                  dot={false}
                  activeDot={{ r: 3 }}
                  isAnimationActive
                  animationDuration={500}
                />
              ) : null}

              {isUsdBenchmarkEnabled ? (
                <Line
                  type="monotone"
                  dataKey="usdtry"
                  name="USD/TRY"
                  stroke="#facc15"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={{ r: 3 }}
                  isAnimationActive
                  animationDuration={500}
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
            Grafik hazırlanıyor...
          </div>
        )}

        <p className="pointer-events-none absolute bottom-2 right-2 text-[10px] text-slate-400">
          Veriler Yahoo Finance ve Binance API aracılığıyla gecikmeli olarak sağlanmaktadır.
        </p>
      </div>
    </motion.section>
  );
}
