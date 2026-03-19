import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';
import { useDashboardData } from '../context/DashboardContext';
import { formatCurrencyParts } from '../utils/helpers';

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
  const { lineChartData, rates } = useDashboardData();
  const { isPrivacyActive, maskValue } = usePrivacy();
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  const safeLineChartData = useMemo(
    () => (Array.isArray(lineChartData) ? lineChartData : []),
    [lineChartData]
  );

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
    const rawText = formatCurrencyParts(Number(value || 0), 'TRY', rates)
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
    const dataMax = safeLineChartData.reduce((maxValue, point) => {
      const value = Number(point?.value);
      return Number.isFinite(value) ? Math.max(maxValue, value) : maxValue;
    }, Number(dataMin || 0));

    return Number(dataMin || 0) - resolveAggressiveDomainPadding(dataMin, dataMax);
  };

  const getAreaDomainMax = (dataMax) => {
    const dataMin = safeLineChartData.reduce((minValue, point) => {
      const value = Number(point?.value);
      return Number.isFinite(value) ? Math.min(minValue, value) : minValue;
    }, Number(dataMax || 0));

    return Number(dataMax || 0) + resolveAggressiveDomainPadding(dataMin, dataMax);
  };

  return (
    <motion.section
      layout
      transition={{ type: 'spring', stiffness: 140, damping: 24 }}
      className="col-span-12 md:col-span-8 md:order-1 rounded-2xl border border-gray-800 bg-[#1A2232] p-4 shadow-2xl md:p-6"
    >
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-slate-300">
        <TrendingUp className="h-4 w-4 text-emerald-400" />
        Portföy Gelişimi (Son 7 Gün)
      </h3>

      <div ref={containerRef} className="relative h-[260px] min-h-[260px] w-full min-w-0 sm:h-[320px] md:h-[360px]">
        {isReady && safeLineChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={safeLineChartData}>
              <defs>
                <linearGradient id="growthChartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.05} />
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
                stroke="#22d3ee"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#growthChartGradient)"
                activeDot={{ r: 4, stroke: '#0f172a', strokeWidth: 2, fill: '#22d3ee' }}
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
