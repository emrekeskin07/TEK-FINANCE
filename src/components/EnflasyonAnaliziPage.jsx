import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import InfoTooltip from './common/InfoTooltip';
import { ChevronDown, FileText, ShieldAlert, Sparkles } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { inflationData } from '../data/inflationData';
import { calculatePurchasingPowerChange } from '../utils/financeMath';

const SOURCE_LABELS = {
  tuik: 'TÜİK (Resmi)',
  enag: 'ENAG (Bağımsız)',
};

const RANGE_OPTIONS = [
  { key: '1A', label: '1A', months: 1 },
  { key: '3A', label: '3A', months: 3 },
  { key: '1Y', label: '1Y', months: 12 },
  { key: 'ALL', label: 'ALL', months: null },
];

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
});

const formatPercent = (value) => {
  const numericValue = Number(value || 0);
  return `${numericValue >= 0 ? '+' : '-'}%${Math.abs(numericValue).toFixed(2)}`;
};

const buildInflationTimeline = (source, nominalReturnPercent) => {
  const sourceKey = String(source || 'enag').toLowerCase();
  const yearsAsc = Object.keys(inflationData || {}).sort((a, b) => Number(a) - Number(b));
  const safeNominalReturn = Math.max(-99.9, Number(nominalReturnPercent || 0));
  const monthlyNominalFactor = Math.pow(1 + (safeNominalReturn / 100), 1 / 12);

  let nominalIndex = 100;
  let inflationIndex = 100;
  const timeline = [];

  yearsAsc.forEach((year) => {
    const sourceMap = inflationData?.[year]?.[sourceKey] || {};
    const monthsAsc = Object.keys(sourceMap).sort((a, b) => Number(a) - Number(b));

    monthsAsc.forEach((month) => {
      const monthlyInflation = Number(sourceMap?.[month]);
      if (!Number.isFinite(monthlyInflation)) {
        return;
      }

      nominalIndex *= monthlyNominalFactor;
      inflationIndex *= (1 + (monthlyInflation / 100));

      const nominalValue = nominalIndex - 100;
      const inflationValue = inflationIndex - 100;
      const realGap = nominalValue - inflationValue;

      timeline.push({
        key: `${year}-${month}`,
        dateLabel: `${String(month).padStart(2, '0')}.${year}`,
        timestamp: new Date(Number(year), Number(month) - 1, 1).getTime(),
        nominalValue,
        inflationValue,
        realGap,
      });
    });
  });

  return timeline;
};

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
  const [selectedRange, setSelectedRange] = useState('ALL');
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);
  const source = inflationSource;

  useEffect(() => {
    if (typeof window === 'undefined') {
      setChartReady(true);
      return undefined;
    }

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

  const inflationTimeline = useMemo(
    () => buildInflationTimeline(source, nominalReturnPercent),
    [source, nominalReturnPercent]
  );

  const filteredTimeline = useMemo(() => {
    if (!inflationTimeline.length) {
      return [];
    }

    const selectedOption = RANGE_OPTIONS.find((option) => option.key === selectedRange);
    if (!selectedOption || selectedOption.months === null) {
      return inflationTimeline;
    }

    const requiredPoints = Math.max(2, selectedOption.months);
    return inflationTimeline.slice(-requiredPoints);
  }, [inflationTimeline, selectedRange]);

  const latestVisiblePoint = filteredTimeline[filteredTimeline.length - 1] || null;
  const currentRealGapPercent = Number(latestVisiblePoint?.realGap || 0);

  const prediction = useMemo(() => {
    const annualReal = Number(realReturn || 0);
    if (!Number.isFinite(annualReal) || annualReal <= 0 || annualReal <= -99.9) {
      return null;
    }

    const monthlyRealRate = Math.pow(1 + (annualReal / 100), 1 / 12) - 1;
    if (!Number.isFinite(monthlyRealRate) || monthlyRealRate <= 0) {
      return null;
    }

    const monthsToDouble = Math.max(1, Math.ceil(Math.log(2) / Math.log(1 + monthlyRealRate)));
    return {
      monthsToDouble,
      monthlyRealRatePercent: monthlyRealRate * 100,
    };
  }, [realReturn]);

  const exportRows = filteredTimeline.map((point) => ([
    point.dateLabel,
    formatPercent(point.nominalValue),
    formatPercent(point.inflationValue),
    formatPercent(point.realGap),
  ]));

  const handleExportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    doc.setFontSize(14);
    doc.text('TEK Finans - Enflasyon Analizi Raporu', 40, 42);

    doc.setFontSize(10);
    doc.text(`Kaynak: ${SOURCE_LABELS[source]}`, 40, 62);
    doc.text(`Nominal Getiri: ${formatPercent(nominalReturnPercent)}`, 40, 78);
    doc.text(`Reel Getiri: ${formatPercent(realReturn)}`, 40, 94);
    doc.text(`Enflasyon Oranı: ${formatPercent(inflationRate)}`, 40, 110);

    autoTable(doc, {
      startY: 128,
      head: [['Dönem', 'Benim Getirim', 'Enflasyon Oranı', 'Reel Fark']],
      body: exportRows,
      styles: {
        fontSize: 9,
        cellPadding: 6,
      },
      headStyles: {
        fillColor: [15, 23, 42],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    doc.save(`enflasyon-analizi-${source}.pdf`);
    setIsReportMenuOpen(false);
  };

  const handleExportExcel = () => {
    const lines = [
      ['Donem', 'Benim Getirim', 'Enflasyon Orani', 'Reel Fark'].join(';'),
      ...exportRows.map((row) => row.join(';')),
    ];

    const csvContent = `\uFEFF${lines.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `enflasyon-analizi-${source}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsReportMenuOpen(false);
  };

  const renderTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) {
      return null;
    }

    const nominalPoint = payload.find((item) => item.dataKey === 'nominalValue');
    const inflationPoint = payload.find((item) => item.dataKey === 'inflationValue');

    return (
      <div className="rounded-xl border border-white/5 bg-slate-900/75 px-3 py-2 text-xs backdrop-blur-xl">
        <p className="font-semibold text-slate-100">{label}</p>
        <p className="mt-1 text-emerald-200">Benim Getirim: {formatPercent(nominalPoint?.value || 0)}</p>
        <p className="text-rose-200">Enflasyon: {formatPercent(inflationPoint?.value || 0)}</p>
      </div>
    );
  };

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-300">Enflasyon Analizi</h2>
          <p className="text-xs text-slate-500 mt-1">Getirinizin enflasyon karşısındaki reel etkisi</p>
        </div>

        <div className="inline-flex items-center rounded-full border border-white/5 bg-slate-900/40 p-1 backdrop-blur-xl">
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

      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/40 p-8 backdrop-blur-xl shadow-[0_30px_90px_rgba(15,23,42,0.4)] md:p-10">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-rose-400/10 blur-3xl" />
        <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-indigo-400/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className={`w-4 h-4 ${isLoss ? 'text-rose-300' : 'text-emerald-300'}`} />
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-200">Alım Gücü Durumu</h3>
          </div>

          {analysis ? (
            <>
              <p className={`text-4xl md:text-5xl font-extrabold tracking-tight ${isLoss ? 'text-[#FF4D6D]' : 'text-emerald-400'}`}>
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

              <div className="mt-5 rounded-2xl border border-white/5 bg-slate-900/40 p-3 backdrop-blur-xl md:p-4">
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

      <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl shadow-[0_24px_72px_rgba(2,6,23,0.62)] md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-300">Getiri vs Enflasyon</h3>

          <div className="relative" onBlur={() => window.setTimeout(() => setIsReportMenuOpen(false), 120)}>
            <button
              type="button"
              onClick={() => setIsReportMenuOpen((prev) => !prev)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-purple-700 bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-purple-800 dark:border-fuchsia-300/35 dark:bg-gradient-to-r dark:from-violet-500/25 dark:to-fuchsia-500/25 dark:text-slate-50 dark:hover:from-violet-500/35 dark:hover:to-fuchsia-500/35"
              aria-haspopup="menu"
              aria-expanded={isReportMenuOpen}
            >
              <FileText className="h-3.5 w-3.5" />
              Rapor Al (PDF/Excel)
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isReportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isReportMenuOpen ? (
              <div className="absolute right-0 z-20 mt-1 min-w-[190px] overflow-hidden rounded-lg border border-white/5 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl" role="menu">
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleExportPdf}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/10"
                  role="menuitem"
                >
                  PDF Raporu
                </button>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleExportExcel}
                  className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/10"
                  role="menuitem"
                >
                  Excel (CSV)
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 inline-flex items-center gap-1 rounded-lg border border-white/5 bg-slate-900/40 p-1 backdrop-blur-xl">
          {RANGE_OPTIONS.map((option) => {
            const isActive = selectedRange === option.key;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setSelectedRange(option.key)}
                className={`min-h-[40px] rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25 text-slate-50 shadow-[0_0_14px_rgba(217,70,239,0.24)]' : 'text-slate-400 hover:text-slate-100'}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="relative h-[320px] min-h-[320px] min-w-0 rounded-2xl border border-white/5 bg-slate-900/40 p-3 backdrop-blur-xl xl:col-span-8">
            {chartReady && filteredTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredTimeline} margin={{ top: 14, right: 16, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="inflationNominalFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34D399" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#34D399" stopOpacity={0.04} />
                    </linearGradient>
                    <linearGradient id="inflationSourceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.26} />
                      <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.03} />
                    </linearGradient>
                    <filter id="nominalGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="4" result="nominalBlur" />
                      <feMerge>
                        <feMergeNode in="nominalBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="inflationGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="4" result="inflationBlur" />
                      <feMerge>
                        <feMergeNode in="inflationBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
                    stroke="#cbd5e1"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#cbd5e1"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value >= 0 ? '+' : ''}%${Number(value || 0).toFixed(0)}`}
                    width={54}
                  />
                  <Tooltip content={renderTooltip} labelFormatter={(label) => label} />

                  <Area
                    type="monotone"
                    dataKey="nominalValue"
                    name="Benim Getirim"
                    stroke="#34D399"
                    strokeWidth={2.6}
                    fill="url(#inflationNominalFill)"
                    filter="url(#nominalGlow)"
                    activeDot={{ r: 4, fill: '#34D399', stroke: '#0f172a', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="inflationValue"
                    name="Enflasyon Oranı"
                    stroke="#F43F5E"
                    strokeWidth={2.6}
                    fill="url(#inflationSourceFill)"
                    filter="url(#inflationGlow)"
                    activeDot={{ r: 4, fill: '#F43F5E', stroke: '#0f172a', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">Grafik hazırlanıyor...</div>
            )}
          </div>

          <aside className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl xl:col-span-4">
            <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-fuchsia-500/15 blur-3xl" aria-hidden="true" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-lg border border-white/5 bg-slate-900/40 px-2.5 py-1.5 backdrop-blur-xl">
                <Sparkles className="h-4 w-4 text-fuchsia-300" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">Tahmin</span>
              </div>

              {prediction ? (
                <>
                  <p className="mt-3 text-sm text-slate-200">
                    Enflasyonu aşmaya devam ederseniz tahmini <span className="font-black text-emerald-300">{prediction.monthsToDouble} ay</span> içinde varlığınızı <span className="font-black text-slate-50">2x</span> büyütebilirsiniz.
                  </p>
                  <p className="mt-2 text-xs text-slate-400">Aylık reel momentum: {formatPercent(prediction.monthlyRealRatePercent)}</p>
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-300">Reel getiri pozitife geçtiğinde tahmini zenginleşme süresi burada görünecek.</p>
              )}

              <div className="mt-4 rounded-xl border border-white/5 bg-slate-900/40 p-3 backdrop-blur-xl">
                <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-slate-400">
                  Anlık Reel Fark
                  <InfoTooltip content="Portföyünüzün son ay ENAG enflasyonuna karşı reel performans farkı. Negatif değer, enflasyonun getirinizin önünde olduğunu gösterir." />
                </p>
                <p className={`mt-1 text-2xl font-black ${currentRealGapPercent >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {formatPercent(currentRealGapPercent)}
                </p>
                <p className="mt-1 text-xs text-slate-400">Kaynak: {SOURCE_LABELS[source]}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
