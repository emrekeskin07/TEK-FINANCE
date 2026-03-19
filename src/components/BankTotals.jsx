import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Building2, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency } from '../utils/helpers';

const OTHER_THRESHOLD_PERCENT = 1;
const PIE_COLORS = ['#A78BFA', '#06B6D4', '#EC4899', '#10B981', '#C4B5FD', '#22D3EE', '#F472B6', '#34D399'];

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

  const centerTotalValue = Number(totalValue || 0) > 0 ? Number(totalValue) : distributionTotal;

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
      <div className="rounded-lg border border-white/5 bg-slate-900/80 px-3 py-2 text-xs backdrop-blur-xl">
        <p className="font-semibold text-slate-100">{point.name}</p>
        <p className="mt-1 text-slate-300">{formatTryCurrencyText(point.value)}</p>
        <p className="text-slate-400">{isPrivacyActive ? maskValue(`%${point.share.toFixed(1)}`) : `%${point.share.toFixed(1)}`}</p>
      </div>
    );
  };

  const hasData = chartData.length > 0;

  return (
    <div>
      <div className="mb-5">
        <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/18">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-tight text-slate-50">KURUMLARDAKI DAĞILIM</h2>
        <p className="mt-1 text-xs font-medium text-slate-400">Portföyün kurumlara göre yüzdesel dağılımı</p>
      </div>

      {!hasData ? (
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-8 text-sm text-slate-400 shadow-[0_16px_46px_rgba(2,6,23,0.6)] backdrop-blur-xl">
          Kayıtlı kurum verisi bulunmuyor.
        </div>
      ) : (
        <div className="relative rounded-3xl border border-white/5 bg-slate-900/40 p-8 shadow-[0_18px_56px_rgba(2,6,23,0.62)] backdrop-blur-xl">
          {selectedBank ? (
            <button
              type="button"
              onClick={() => onSelectBank?.(null)}
              className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/5 bg-slate-900/40 text-slate-300 backdrop-blur-xl transition-all duration-200 hover:scale-105 hover:border-fuchsia-300/40 hover:text-slate-100"
              title="Filtreyi temizle"
              aria-label="Filtreyi temizle"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            <div className="relative min-h-[280px] md:col-span-7">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={64}
                    outerRadius={112}
                    minAngle={6}
                    paddingAngle={2}
                    activeIndex={activePieIndex >= 0 ? activePieIndex : undefined}
                  >
                    {chartData.map((entry) => {
                      const isSelected = selectedBank === entry.name;

                      return (
                        <Cell
                          key={`institution-slice-${entry.name}`}
                          fill={entry.color}
                          stroke={isSelected ? '#f8fafc' : 'rgba(15,23,42,0.5)'}
                          strokeWidth={isSelected ? 3 : 1.5}
                          onClick={() => onSelectBank?.(entry.name)}
                          style={{
                            cursor: 'pointer',
                            filter: `drop-shadow(0 0 12px ${entry.color}55)`,
                          }}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip content={renderTooltip} />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative px-3 text-center">
                  <span className="pointer-events-none absolute inset-x-6 top-1/2 h-12 -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-2xl" aria-hidden="true" />
                  <p className="relative text-sm font-medium text-slate-400">Toplam Portföy</p>
                  <p className="relative mt-1 text-4xl font-black tracking-tight text-slate-50 drop-shadow-[0_0_20px_rgba(236,72,153,0.28)]">
                    {formatTryCurrencyText(centerTotalValue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-5">
              <ul className="space-y-2">
                {chartData.map((entry) => {
                  const isSelected = selectedBank === entry.name;

                  return (
                    <li key={`legend-${entry.name}`}>
                      <button
                        type="button"
                        onClick={() => onSelectBank?.(entry.name)}
                        aria-pressed={isSelected}
                        className={`w-full min-h-[52px] rounded-xl border px-3 py-2.5 transition-all duration-200 ${
                          isSelected
                            ? 'border-fuchsia-300/40 bg-slate-900/60 ring-1 ring-fuchsia-300/35'
                            : 'border-white/5 bg-slate-900/40 hover:border-sky-300/35 hover:bg-slate-900/55'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex items-center gap-2.5">
                            <span
                              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                              style={{
                                backgroundColor: entry.color,
                                boxShadow: `0 0 14px ${entry.color}`,
                              }}
                            />
                            <span className="truncate text-sm font-medium text-slate-300">{entry.name}</span>
                          </div>
                          <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-violet-300">
                            {isPrivacyActive ? maskValue(`%${entry.share.toFixed(1)}`) : `%${entry.share.toFixed(1)}`}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
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
