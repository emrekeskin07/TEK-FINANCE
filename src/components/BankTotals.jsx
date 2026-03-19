import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Building2, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency, formatCurrencyParts } from '../utils/helpers';

const OTHER_THRESHOLD_PERCENT = 1;
const PIE_COLORS = ['#8B5CF6', '#F59E0B', '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#A855F7'];

export default function BankTotals({ bankTotals, baseCurrency, rates, totalValue, selectedBank, onSelectBank }) {
  const { isPrivacyActive, maskValue } = usePrivacy();

  const { rows: bankGroups, distributionTotal } = useMemo(() => {
    const entries = Object.entries(bankTotals || {})
      .map(([name, value]) => ({
        name,
        value: Number(value || 0),
      }))
      .filter((entry) => Number.isFinite(entry.value) && entry.value > 0)
      .sort((a, b) => b.value - a.value);

    const institutionsTotal = entries.reduce((sum, entry) => sum + entry.value, 0);
    if (institutionsTotal <= 0) {
      return { rows: [], distributionTotal: 0 };
    }

    const major = [];
    let otherValue = 0;

    entries.forEach((entry) => {
      const share = (entry.value / institutionsTotal) * 100;
      if (share < OTHER_THRESHOLD_PERCENT) {
        otherValue += entry.value;
        return;
      }

      major.push({
        ...entry,
        share,
        isOther: false,
      });
    });

    if (otherValue > 0) {
      major.push({
        name: 'Diğer',
        value: otherValue,
        share: (otherValue / institutionsTotal) * 100,
        isOther: true,
      });
    }

    return {
      rows: major.sort((a, b) => b.value - a.value),
      distributionTotal: institutionsTotal,
    };
  }, [bankTotals]);

  const chartData = useMemo(
    () => bankGroups.map((entry, index) => ({
      ...entry,
      color: PIE_COLORS[index % PIE_COLORS.length],
    })),
    [bankGroups]
  );

  const selectedEntry = useMemo(
    () => chartData.find((entry) => entry.name === selectedBank) || null,
    [chartData, selectedBank]
  );

  const centerTotalValue = selectedEntry
    ? selectedEntry.value
    : (Number(totalValue || 0) > 0 ? Number(totalValue) : distributionTotal);
  const centerTitle = selectedEntry ? selectedEntry.name : 'Toplam Varlik';

  const renderTryCurrencyWithMutedSymbol = (value) => {
    const plainCurrencyText = formatCurrency(value, baseCurrency, rates);

    if (isPrivacyActive) {
      return <span>{maskValue(plainCurrencyText)}</span>;
    }

    return (
      <>
        {formatCurrencyParts(value, baseCurrency, rates).map((part, index) => (
          part.type === 'currency'
            ? <span key={`${part.type}-${index}`} className="text-slate-400/75">{part.value}</span>
            : <span key={`${part.type}-${index}`}>{part.value}</span>
        ))}
      </>
    );
  };

  const formatTryCurrencyText = (value) => {
    const rawText = formatCurrency(value, baseCurrency, rates);

    return isPrivacyActive ? maskValue(rawText) : rawText;
  };

  const activePieIndex = chartData.findIndex((entry) => entry.name === selectedBank);

  const renderTooltip = ({ active, payload }) => {
    if (!active || !Array.isArray(payload) || payload.length === 0) {
      return null;
    }

    const point = payload[0]?.payload;
    if (!point) {
      return null;
    }

    return (
      <div className="rounded-lg border border-white/10 bg-[#0f172a]/95 px-3 py-2 text-xs backdrop-blur-sm">
        <p className="font-semibold text-slate-100">{point.name}</p>
        <p className="mt-1 text-slate-300">{formatTryCurrencyText(point.value)}</p>
        <p className="text-slate-400">{isPrivacyActive ? maskValue(`%${point.share.toFixed(1)}`) : `%${point.share.toFixed(1)}`}</p>
      </div>
    );
  };

  const hasData = chartData.length > 0;

  return (
    <div>
      <div className="mb-4">
        <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-sky-300/25 bg-sky-500/10">
          <Building2 className="h-4 w-4 text-sky-200/90" />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-tight text-text-main">KURUMLARDAKI DAĞILIM</h2>
        <p className="mt-1 text-xs font-medium text-text-muted">Portföyün kurumlara göre yüzdesel dağılımı</p>
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-white/5 bg-white/5 p-6 text-sm text-slate-400 shadow-2xl">
          Kayıtlı kurum verisi bulunmuyor.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-card/70 p-6 shadow-[0_16px_46px_rgba(15,23,42,0.45)] backdrop-blur-md md:p-8">
          <div className="relative h-[250px] w-full min-h-[250px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={98}
                  minAngle={5}
                  paddingAngle={1}
                  activeIndex={activePieIndex >= 0 ? activePieIndex : undefined}
                >
                  {chartData.map((entry) => {
                    const isSelected = selectedBank === entry.name;

                    return (
                      <Cell
                        key={`institution-slice-${entry.name}`}
                        fill={entry.color}
                        stroke={isSelected ? '#e2e8f0' : 'rgba(15,23,42,0.45)'}
                        strokeWidth={isSelected ? 3 : 1}
                        onClick={() => onSelectBank?.(entry.name)}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={renderTooltip} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div key={`center-${centerTitle}`} className="pointer-events-auto px-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-tight text-slate-300">{centerTitle}</p>
                <p className="mt-1 text-2xl md:text-[28px] font-black leading-tight tracking-tight text-slate-100 drop-shadow-[0_0_12px_rgba(56,189,248,0.3)]">
                  {renderTryCurrencyWithMutedSymbol(centerTotalValue)}
                </p>
                {selectedBank ? (
                  <button
                    type="button"
                    onClick={() => onSelectBank?.(null)}
                    className="mt-2 inline-flex min-h-[44px] transform-gpu items-center gap-1.5 rounded-full border border-sky-300/35 bg-sky-500/15 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-sky-100 transition-all duration-200 hover:scale-105 hover:bg-sky-500/25 active:scale-95 hover:shadow-[0_0_18px_rgba(56,189,248,0.35)]"
                    title="Kurum filtresini temizle"
                  >
                    <X className="h-3.5 w-3.5" />
                    Filtreyi Temizle (X)
                  </button>
                ) : (
                  <p className="mt-2 text-[10px] font-medium text-slate-500">Bir dilime tıklayarak filtrele</p>
                )}
              </div>
            </div>
          </div>

          <ul className="mt-3 space-y-1.5">
            {chartData.map((entry) => {
              const isSelected = selectedBank === entry.name;

              return (
                <li key={`legend-${entry.name}`}>
                  <button
                    type="button"
                    onClick={() => onSelectBank?.(entry.name)}
                    aria-pressed={isSelected}
                    className={`w-full min-h-[44px] transform-gpu rounded-lg border px-2.5 py-2 transition-all duration-200 ${
                      'cursor-pointer border-white/10 bg-white/[0.03] hover:scale-[1.03] hover:border-sky-300/40 hover:bg-sky-500/10 active:scale-[0.98]'
                    } ${isSelected ? 'border-sky-200/60 bg-sky-400/10 ring-1 ring-sky-200/60' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="truncate font-semibold text-slate-200">{entry.name}</span>
                      </div>
                      <span className="font-semibold text-slate-300">{isPrivacyActive ? maskValue(`%${entry.share.toFixed(1)}`) : `%${entry.share.toFixed(1)}`}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

BankTotals.propTypes = {
  bankTotals: PropTypes.object,
  baseCurrency: PropTypes.string,
  rates: PropTypes.object,
  totalValue: PropTypes.number,
  selectedBank: PropTypes.string,
  onSelectBank: PropTypes.func,
};
