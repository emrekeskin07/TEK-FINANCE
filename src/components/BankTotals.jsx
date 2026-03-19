import React, { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrencyParts } from '../utils/helpers';

const OTHER_THRESHOLD_PERCENT = 1;
const PIE_COLORS = ['#38bdf8', '#818cf8', '#22d3ee', '#34d399', '#f59e0b', '#f472b6', '#a78bfa', '#94a3b8'];

export default function BankTotals({ bankTotals, rates, totalValue, selectedBank, onSelectBank }) {
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

  const centerTotalValue = Number(totalValue || 0) > 0 ? Number(totalValue) : distributionTotal;

  const renderTryCurrencyWithMutedSymbol = (value) => {
    const plainCurrencyText = formatCurrencyParts(value, 'TRY', rates)
      .map((part) => part.value)
      .join('');

    if (isPrivacyActive) {
      return <span>{maskValue(plainCurrencyText)}</span>;
    }

    return (
      <>
        {formatCurrencyParts(value, 'TRY', rates).map((part, index) => (
          part.type === 'currency'
            ? <span key={`${part.type}-${index}`} className="text-slate-400/75">{part.value}</span>
            : <span key={`${part.type}-${index}`}>{part.value}</span>
        ))}
      </>
    );
  };

  const formatTryCurrencyText = (value) => {
    const rawText = formatCurrencyParts(value, 'TRY', rates)
      .map((part) => part.value)
      .join('');

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
        <h2 className="text-sm font-bold uppercase tracking-[0.13em] text-slate-200">KURUMLARDAKI DAĞILIM</h2>
        <p className="mt-1 text-xs font-medium text-slate-500">Portföyün kurumlara göre yüzdesel dağılımı</p>
      </div>

      {!hasData ? (
        <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-400">
          Kayıtlı kurum verisi bulunmuyor.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/15 p-3 md:p-4">
          <div className="relative h-[250px] w-full min-h-[250px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={92}
                  paddingAngle={2}
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
                        onClick={() => !entry.isOther && onSelectBank?.(entry.name)}
                        style={{ cursor: entry.isOther ? 'default' : 'pointer' }}
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={renderTooltip} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="px-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Total Value</p>
                <p className="mt-1 text-2xl md:text-[28px] font-black leading-tight tracking-tight text-slate-100">
                  {renderTryCurrencyWithMutedSymbol(centerTotalValue)}
                </p>
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
                    onClick={() => !entry.isOther && onSelectBank?.(entry.name)}
                    disabled={entry.isOther}
                    aria-pressed={entry.isOther ? undefined : isSelected}
                    className={`w-full rounded-lg border px-2.5 py-2 transition-all duration-200 ${
                      entry.isOther
                        ? 'cursor-default border-white/10 bg-white/[0.03]'
                        : 'cursor-pointer border-white/10 bg-white/[0.03] hover:border-sky-300/40 hover:bg-sky-500/10'
                    } ${isSelected ? 'border-sky-200/60 bg-sky-400/10 ring-1 ring-sky-200/60' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="truncate font-semibold text-slate-200">{entry.name}</span>
                      </div>
                      <span className="font-semibold text-slate-400">{isPrivacyActive ? maskValue(`%${entry.share.toFixed(1)}`) : `%${entry.share.toFixed(1)}`}</span>
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
