import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { useDashboardData } from '../context/DashboardContext';
import Button from './common/Button';
import { convertCurrency, formatCurrencyParts } from '../utils/helpers';

const RANGE_OPTIONS = [
  { key: '1G', label: '1G', days: 1 },
  { key: '1H', label: '1H', days: 7 },
  { key: '1A', label: '1A', days: 30 },
  { key: '3A', label: '3A', days: 90 },
  { key: '1Y', label: '1Y', days: 365 },
  { key: 'TUMU', label: 'TÜMÜ', days: null },
];

function TooltipContent({ active, payload, formatter }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0];

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

  const resolveAggressiveDomainPadding = (minValue, maxValue) => {
    const safeMin = Number.isFinite(Number(minValue)) ? Number(minValue) : 0;
    const safeMax = Number.isFinite(Number(maxValue)) ? Number(maxValue) : safeMin;
    const range = Math.max(Math.abs(safeMax - safeMin), Math.abs(safeMax), Math.abs(safeMin), 1);

    return Math.max(range * 0.18, 1000);
  };

  const getAreaDomainMin = (dataMin) => {
    const dataMax = convertedLineChartData.reduce((maxValue, point) => {
      const value = Number(point?.value);
      return Number.isFinite(value) ? Math.max(maxValue, value) : maxValue;
    }, Number(dataMin || 0));

    return Number(dataMin || 0) - resolveAggressiveDomainPadding(dataMin, dataMax);
  };

  const getAreaDomainMax = (dataMax) => {
    const dataMin = convertedLineChartData.reduce((minValue, point) => {
      const value = Number(point?.value);
      return Number.isFinite(value) ? Math.min(minValue, value) : minValue;
    }, Number(dataMax || 0));

    return Number(dataMax || 0) + resolveAggressiveDomainPadding(dataMin, dataMax);
  };

  return (
    <motion.section
      layout
      transition={{ type: 'spring', stiffness: 140, damping: 24 }}
      className="col-span-12 md:col-span-8 md:order-1 rounded-2xl border border-white/5 bg-[#1A2232] p-6 shadow-2xl md:p-8"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-slate-300">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          Portföy Gelişimi
        </h3>

        <div className="inline-flex items-center gap-1 rounded-lg border border-white/5 bg-black/20 p-1">
          {RANGE_OPTIONS.map((option) => {
            const isActive = selectedRange === option.key;
            return (
              <Button
                key={option.key}
                type="button"
                variant="ghost"
                onClick={() => setSelectedRange(option.key)}
                className={`relative min-h-[44px] rounded-md px-3 py-2 text-[11px] ${
                  isActive
                    ? 'bg-emerald-500/18 text-emerald-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{option.label}</span>
                {isActive ? (
                  <span className="absolute bottom-1 left-2 right-2 h-0.5 rounded-full bg-emerald-400" aria-hidden="true" />
                ) : null}
              </Button>
            );
          })}
        </div>
      </div>

      <div ref={containerRef} className="relative h-[260px] min-h-[260px] w-full min-w-0 sm:h-[320px] md:h-[360px]">
        {isReady && convertedLineChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" aspect={isCompactScreen ? 1 : undefined}>
            <AreaChart data={convertedLineChartData}>
              <defs>
                <linearGradient id="growthChartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.06} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[getAreaDomainMin, getAreaDomainMax]}
                allowDataOverflow
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatTryValue}
                width={78}
              />
              <Tooltip content={(props) => <TooltipContent {...props} formatter={formatTryValue} />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#growthChartGradient)"
                activeDot={{ r: 4, stroke: '#0f172a', strokeWidth: 2, fill: '#10b981' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
            Grafik hazırlanıyor...
          </div>
        )}
      </div>
    </motion.section>
  );
}
