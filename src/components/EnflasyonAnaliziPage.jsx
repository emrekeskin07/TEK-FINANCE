import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ShieldAlert } from 'lucide-react';
import { inflationData } from '../data/inflationData';
import { calculatePurchasingPowerChange } from '../utils/financeMath';

const SOURCE_LABELS = {
  tuik: 'TÜİK (Resmi)',
  enag: 'ENAG (Bağımsız)',
};

const BAR_COLORS = {
  nominal: '#6366f1',
  inflation: '#fb7185',
};

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
});

const formatPercent = (value) => `%${Number(value || 0).toFixed(2)}`;

const resolveAvailablePeriod = (source) => {
  const now = new Date();
  const currentYear = String(now.getFullYear());
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const normalizedSource = String(source || 'tuik').toLowerCase();

  const currentValue = inflationData?.[currentYear]?.[normalizedSource]?.[currentMonth];
  if (Number.isFinite(Number(currentValue))) {
    return { year: currentYear, month: currentMonth };
  }

  const yearsDesc = Object.keys(inflationData)
    .sort((a, b) => Number(b) - Number(a));

  for (const year of yearsDesc) {
    const monthMap = inflationData?.[year]?.[normalizedSource] || {};
    const monthsDesc = Object.keys(monthMap).sort((a, b) => Number(b) - Number(a));

    for (const month of monthsDesc) {
      if (Number.isFinite(Number(monthMap[month]))) {
        return { year, month };
      }
    }
  }

  return { year: currentYear, month: currentMonth };
};

export default function EnflasyonAnaliziPage({
  nominalReturnPercent = 0,
  referenceAmount = 0,
  inflationSource = 'enag',
  onInflationSourceChange,
}) {
  const [chartReady, setChartReady] = useState(false);
  const source = inflationSource;

  useEffect(() => {
    const frameHandle = window.requestAnimationFrame(() => {
      setChartReady(true);
    });

    return () => window.cancelAnimationFrame(frameHandle);
  }, []);

  const period = useMemo(() => resolveAvailablePeriod(source), [source]);

  const analysis = useMemo(() => {
    try {
      return calculatePurchasingPowerChange({
        nominalReturnPercent: Number(nominalReturnPercent || 0),
        year: period.year,
        month: period.month,
        source,
      });
    } catch {
      return null;
    }
  }, [nominalReturnPercent, period.year, period.month, source]);

  const inflationRate = Number(analysis?.inflationRatePercent || 0);
  const realReturn = Number(analysis?.realReturnPercent || 0);
  const purchasingPowerAmount = Number(referenceAmount || 0) * (realReturn / 100);
  const nominalProfitAmount = Number(referenceAmount || 0) * (Number(nominalReturnPercent || 0) / 100);
  const realProfitAmount = Number(referenceAmount || 0) * (realReturn / 100);
  const inflationLossAmount = Math.max(0, nominalProfitAmount - realProfitAmount);
  const isLoss = realReturn < 0;

  const bars = [
    {
      metric: 'Benim Getirim',
      value: Number(nominalReturnPercent || 0),
      color: BAR_COLORS.nominal,
    },
    {
      metric: 'Enflasyon Oranı',
      value: inflationRate,
      color: BAR_COLORS.inflation,
    },
  ];

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-300">Enflasyon Analizi</h2>
          <p className="text-xs text-slate-500 mt-1">Getirinizin enflasyon karşısındaki reel etkisi</p>
        </div>

        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => onInflationSourceChange?.('tuik')}
            className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors ${
              source === 'tuik' ? 'bg-indigo-500/30 text-indigo-100' : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            TÜİK (Resmi)
          </button>
          <button
            type="button"
            onClick={() => onInflationSourceChange?.('enag')}
            className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors ${
              source === 'enag' ? 'bg-rose-500/30 text-rose-100' : 'text-slate-300 hover:text-slate-100'
            }`}
          >
            ENAG (Bağımsız)
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 backdrop-blur-2xl p-8 md:p-10 shadow-[0_30px_90px_rgba(15,23,42,0.4)]">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-rose-400/10 blur-3xl" />
        <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-indigo-400/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className={`w-4 h-4 ${isLoss ? 'text-rose-300' : 'text-emerald-300'}`} />
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-200">Alım Gücü Durumu</h3>
          </div>

          {analysis ? (
            <>
              <p className={`text-4xl md:text-5xl font-extrabold tracking-tight ${isLoss ? 'text-[#FF4D6D]' : 'text-[#2BFF88]'}`}>
                {isLoss
                  ? `${TRY_FORMATTER.format(Math.abs(purchasingPowerAmount))} Kayıptasınız`
                  : `${TRY_FORMATTER.format(Math.abs(purchasingPowerAmount))} Avantajdasınız`}
              </p>
              <p className={`mt-3 text-sm ${isLoss ? 'text-rose-200/90' : 'text-emerald-200/90'}`}>
                {isLoss
                  ? 'Paranız enflasyon karşısında eriyor'
                  : 'Paranız enflasyonun üzerinde reel değer kazanımı sağlıyor'}
              </p>
              <p className="mt-2 text-xs text-slate-300/80">
                Reel getiri: {formatPercent(realReturn)} | Kaynak: {SOURCE_LABELS[source]} | Donem: {period.month}.{period.year}
              </p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-3 md:p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">Nominal vs Enflasyon Etkisi</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 p-3">
                    <p className="text-[11px] text-emerald-100/90">Nominal Getiri (Saf Kâr)</p>
                    <p className="mt-1 text-base font-bold text-emerald-200">
                      {TRY_FORMATTER.format(nominalProfitAmount)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-rose-300/25 bg-rose-500/10 p-3">
                    <p className="text-[11px] text-rose-100/90">Enflasyon Kaybı</p>
                    <p className="mt-1 text-base font-bold text-rose-200">
                      {TRY_FORMATTER.format(inflationLossAmount)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-amber-200">Secili kaynak icin enflasyon verisi bulunamadi.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 md:p-6">
        <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-300 mb-4">Getiri vs Enflasyon</h3>
        <div className="h-[300px] w-full relative">
          {chartReady ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 10, right: 12, left: 0, bottom: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="metric" tick={{ fill: '#cbd5e1', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(value) => `%${Number(value).toFixed(0)}`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                formatter={(value) => formatPercent(value)}
              />
              <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                {bars.map((entry) => (
                  <Cell key={entry.metric} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">Grafik hazırlanıyor...</div>
          )}
        </div>
      </div>
    </section>
  );
}
