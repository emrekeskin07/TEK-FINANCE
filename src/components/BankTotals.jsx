import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { SlidersHorizontal, Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency } from '../utils/helpers';

const EMERALD_SLICE = '#10B981';
const INDIGO_SLICE = '#312E81';

export default function BankTotals({ bankTotals, baseCurrency, rates, totalValue, selectedBank, onSelectBank }) {
  const { isPrivacyActive, maskValue } = usePrivacy();

  const { rows: institutionRows, distributionTotal } = useMemo(() => {
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

    return {
      rows: entries.map((entry, index) => ({
        ...entry,
        share: (entry.value / institutionsTotal) * 100,
        color: index === 0 ? EMERALD_SLICE : INDIGO_SLICE,
      })),
      distributionTotal: institutionsTotal,
    };
  }, [bankTotals]);

  const chartData = useMemo(() => {
    if (!institutionRows.length || distributionTotal <= 0) {
      return [];
    }

    const leadInstitution = institutionRows[0];
    const remainingValue = Math.max(0, distributionTotal - leadInstitution.value);

    if (remainingValue <= 0) {
      return [{
        name: leadInstitution.name,
        value: leadInstitution.value,
        share: 100,
        color: EMERALD_SLICE,
      }];
    }

    return [
      {
        name: leadInstitution.name,
        value: leadInstitution.value,
        share: (leadInstitution.value / distributionTotal) * 100,
        color: EMERALD_SLICE,
      },
      {
        name: 'Diğer',
        value: remainingValue,
        share: (remainingValue / distributionTotal) * 100,
        color: INDIGO_SLICE,
      },
    ];
  }, [institutionRows, distributionTotal]);

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
      <div className="rounded-lg border border-white/5 bg-slate-900/95 px-3 py-2 text-xs backdrop-blur-xl">
        <p className="font-semibold text-slate-100">{point.name}</p>
        <p className="mt-1 text-slate-300">{formatTryCurrencyText(point.value)}</p>
        <p className="text-slate-400">{isPrivacyActive ? maskValue(`%${point.share.toFixed(1)}`) : `%${point.share.toFixed(1)}`}</p>
      </div>
    );
  };

  const hasData = chartData.length > 0;
  const filterTitle = selectedBank ? 'Filtreyi temizle' : 'Filtre uygula';

  return (
    <div>
      {!hasData ? (
        <div className="rounded-2xl border border-white/5 bg-slate-900 p-8 text-sm text-slate-400 shadow-[0_16px_46px_rgba(2,6,23,0.6)] backdrop-blur-xl">
          Kayıtlı kurum verisi bulunmuyor.
        </div>
      ) : (
        <div className="relative rounded-3xl border border-white/5 bg-slate-900 p-8 shadow-[0_20px_58px_rgba(2,6,23,0.72)]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/35 bg-emerald-500/12">
              <Wallet className="h-5 w-5 text-emerald-300" />
            </div>

            <button
              type="button"
              onClick={() => {
                if (selectedBank) {
                  onSelectBank?.(null);
                  return;
                }

                if (chartData[0]?.name) {
                  onSelectBank?.(chartData[0].name);
                }
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900 text-slate-200 transition-all duration-200 hover:scale-105 hover:border-indigo-300/50 hover:text-slate-50"
              title={filterTitle}
              aria-label={filterTitle}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="relative min-h-[280px] lg:col-span-7">
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
                  <span className="pointer-events-none absolute inset-x-2 top-1/2 h-14 -translate-y-1/2 rounded-full bg-fuchsia-500/12 blur-2xl" aria-hidden="true" />
                  <p className="relative text-sm font-medium text-slate-400">Toplam Portföy</p>
                  <p className="relative mt-1 text-4xl font-black leading-none tracking-tight text-slate-50 drop-shadow-[0_0_18px_rgba(255,255,255,0.25)]">
                    {formatTryCurrencyText(centerTotalValue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <ul className="space-y-2.5">
                {chartData.map((entry) => {
                  const isSelected = selectedBank === entry.name;

                  return (
                    <li key={`legend-${entry.name}`}>
                      <button
                        type="button"
                        onClick={() => onSelectBank?.(entry.name)}
                        aria-pressed={isSelected}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-emerald-300/45 bg-slate-800/95 ring-1 ring-emerald-300/35'
                            : 'border-white/5 bg-slate-900/80 hover:border-indigo-300/45 hover:bg-slate-800/95'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex items-center gap-2.5">
                            <span
                              className="h-3 w-3 flex-shrink-0 rounded-full"
                              style={{
                                backgroundColor: entry.color,
                                boxShadow: `0 0 14px ${entry.color}`,
                              }}
                            />
                            <span className="text-sm font-medium text-slate-50 break-words">{entry.name}</span>
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
