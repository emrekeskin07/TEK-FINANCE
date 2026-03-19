import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { SlidersHorizontal, Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrency } from '../utils/helpers';
import { resolveAssetLivePrice } from '../utils/assetPricing';

const CATEGORY_COLORS = ['#A78BFA', '#06B6D4', '#FF7F50', '#F59E0B', '#8B5CF6', '#22D3EE', '#FB7185', '#FBBF24'];

const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const resolveAssetName = (asset) => {
  const explicitName = String(asset?.name || '').trim();
  if (explicitName) {
    return explicitName;
  }

  const symbol = String(asset?.symbol || '').trim();
  if (symbol) {
    return symbol;
  }

  const category = String(asset?.category || '').trim();
  return category || 'Varlık';
};

const sortNodeRecursive = (node) => {
  const sortedChildren = (node.children || [])
    .map((child) => sortNodeRecursive(child))
    .sort((a, b) => b.value - a.value);

  return {
    ...node,
    children: sortedChildren,
  };
};

const buildNestedPortfolioData = (portfolio, marketData, bankTotals) => {
  const institutionStore = new Map();

  (Array.isArray(portfolio) ? portfolio : []).forEach((asset, index) => {
    const institutionName = String(asset?.bank || 'Kurum Belirtilmedi').trim() || 'Kurum Belirtilmedi';
    const assetClassName = String(asset?.category || 'Diğer').trim() || 'Diğer';
    const assetName = resolveAssetName(asset);
    const amount = toPositiveNumber(asset?.amount);
    const livePrice = resolveAssetLivePrice(asset, marketData);
    const fallbackPrice = toPositiveNumber(asset?.avgPrice);
    const activePrice = toPositiveNumber(livePrice) || fallbackPrice;
    const totalAssetValue = amount * activePrice;

    if (totalAssetValue <= 0) {
      return;
    }

    if (!institutionStore.has(institutionName)) {
      institutionStore.set(institutionName, {
        node: {
          id: `institution:${institutionName}`,
          label: institutionName,
          value: 0,
          children: [],
        },
        classStore: new Map(),
      });
    }

    const institutionEntry = institutionStore.get(institutionName);
    institutionEntry.node.value += totalAssetValue;

    if (!institutionEntry.classStore.has(assetClassName)) {
      institutionEntry.classStore.set(assetClassName, {
        id: `class:${institutionName}:${assetClassName}`,
        label: assetClassName,
        value: 0,
        children: [],
      });
    }

    const classNode = institutionEntry.classStore.get(assetClassName);
    classNode.value += totalAssetValue;
    classNode.children.push({
      id: `asset:${asset?.id || `${institutionName}-${assetClassName}-${index}`}`,
      label: assetName,
      value: totalAssetValue,
      children: [],
    });
  });

  let institutions = Array.from(institutionStore.values()).map((entry) => ({
    ...entry.node,
    children: Array.from(entry.classStore.values()),
  }));

  // Fallback: portfolio yoksa bankTotals ile en az kurum seviyesini göster.
  if (!institutions.length) {
    institutions = Object.entries(bankTotals || {})
      .map(([name, value]) => ({
        id: `institution:${name}`,
        label: name,
        value: toPositiveNumber(value),
        children: [],
      }))
      .filter((entry) => entry.value > 0);
  }

  const root = {
    id: 'root',
    label: 'Portföy',
    value: institutions.reduce((sum, item) => sum + item.value, 0),
    children: institutions,
  };

  return sortNodeRecursive(root);
};

export default function BankTotals({ bankTotals, portfolio, marketData, baseCurrency, rates, totalValue, selectedBank, onSelectBank }) {
  const { isPrivacyActive, maskValue } = usePrivacy();
  const [selectedPath, setSelectedPath] = useState([]);

  const nestedData = useMemo(
    () => buildNestedPortfolioData(portfolio, marketData, bankTotals),
    [portfolio, marketData, bankTotals]
  );

  useEffect(() => {
    setSelectedPath((previousPath) => {
      const normalizedPath = [];
      let currentNode = nestedData;

      for (const id of previousPath) {
        const nextNode = (currentNode.children || []).find((child) => child.id === id);
        if (!nextNode) {
          break;
        }
        normalizedPath.push(id);
        currentNode = nextNode;
      }

      return normalizedPath;
    });
  }, [nestedData]);

  const { currentNode, pathNodes } = useMemo(() => {
    let cursor = nestedData;
    const visitedPath = [];

    selectedPath.forEach((id) => {
      const nextNode = (cursor.children || []).find((child) => child.id === id);
      if (!nextNode) {
        return;
      }
      visitedPath.push(nextNode);
      cursor = nextNode;
    });

    return {
      currentNode: cursor,
      pathNodes: visitedPath,
    };
  }, [nestedData, selectedPath]);

  const currentTotal = toPositiveNumber(currentNode?.value);
  const chartData = useMemo(() => {
    return (currentNode?.children || []).map((item, index) => ({
      ...item,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      share: currentTotal > 0 ? (item.value / currentTotal) * 100 : 0,
    }));
  }, [currentNode, currentTotal]);

  const centerTotalValue = currentTotal > 0
    ? currentTotal
    : (Number(totalValue || 0) > 0 ? Number(totalValue) : 0);
  const centerTitle = selectedPath.length > 0 ? currentNode?.label : 'Toplam Portföy';

  const formatTryCurrencyText = (value) => {
    const rawText = formatCurrency(value, baseCurrency, rates);

    return isPrivacyActive ? maskValue(rawText) : rawText;
  };

  const activePieIndex = selectedPath.length === 0
    ? chartData.findIndex((entry) => entry.label === selectedBank)
    : -1;

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
        <p className="font-semibold text-slate-100">{point.label}</p>
        <p className="mt-1 text-slate-300">{formatTryCurrencyText(point.value)}</p>
        <p className="text-slate-400">{isPrivacyActive ? maskValue(`%${point.share.toFixed(1)}`) : `%${point.share.toFixed(1)}`}</p>
      </div>
    );
  };

  const breadcrumbItems = [
    { id: 'root', label: 'Portföy', depth: 0 },
    ...pathNodes.map((node, index) => ({ id: node.id, label: node.label, depth: index + 1 })),
  ];

  const handleDrill = (childNode) => {
    if (!childNode) {
      return;
    }

    if (childNode.children?.length > 0) {
      const nextPath = [...selectedPath, childNode.id];
      setSelectedPath(nextPath);

      // Kurum seviyesindeyken dashboard filtreleri ile senkron kal.
      if (nextPath.length === 1) {
        onSelectBank?.(childNode.label);
      }
      return;
    }

    if (selectedPath.length === 0) {
      onSelectBank?.(childNode.label);
    }
  };

  const handleGoUp = () => {
    if (selectedPath.length === 0) {
      onSelectBank?.(null);
      return;
    }

    const nextPath = selectedPath.slice(0, -1);
    setSelectedPath(nextPath);
    if (nextPath.length === 0) {
      onSelectBank?.(null);
    }
  };

  const hasData = chartData.length > 0;
  const filterTitle = selectedPath.length > 0 ? 'Üst seviyeye çık' : 'Filtreyi temizle';

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
              onClick={handleGoUp}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900 text-slate-200 transition-all duration-200 hover:scale-105 hover:border-indigo-300/50 hover:text-slate-50"
              title={filterTitle}
              aria-label={filterTitle}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
            {breadcrumbItems.map((item, index) => {
              const isLast = index === breadcrumbItems.length - 1;

              return (
                <React.Fragment key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.depth === 0) {
                        setSelectedPath([]);
                        onSelectBank?.(null);
                        return;
                      }

                      setSelectedPath(selectedPath.slice(0, item.depth));
                    }}
                    className={`rounded-md px-1.5 py-0.5 transition-colors ${isLast ? 'text-slate-200' : 'hover:text-slate-200'}`}
                  >
                    {item.label}
                  </button>
                  {!isLast ? <span className="text-slate-500">&gt;</span> : null}
                </React.Fragment>
              );
            })}
          </nav>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentNode.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="grid grid-cols-1 gap-6 lg:grid-cols-12"
            >
              <div className="relative min-h-[280px] lg:col-span-7">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={64}
                      outerRadius={112}
                      minAngle={6}
                      paddingAngle={2}
                      activeIndex={activePieIndex >= 0 ? activePieIndex : undefined}
                    >
                      {chartData.map((entry) => {
                        const isSelected = selectedPath.length === 0 && selectedBank === entry.label;

                        return (
                          <Cell
                            key={`drill-slice-${entry.id}`}
                            fill={entry.color}
                            stroke={isSelected ? '#f8fafc' : 'rgba(15,23,42,0.5)'}
                            strokeWidth={isSelected ? 3 : 1.5}
                            onClick={() => handleDrill(entry)}
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
                    <p className="relative text-sm font-medium text-slate-400">{centerTitle}</p>
                    <p className="relative mt-1 text-4xl font-black leading-none tracking-tight text-slate-50 drop-shadow-[0_0_18px_rgba(255,255,255,0.25)]">
                      {formatTryCurrencyText(centerTotalValue)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <ul className="space-y-2.5">
                  {chartData.map((entry) => {
                    const isSelected = selectedPath.length === 0 && selectedBank === entry.label;

                    return (
                      <li key={`legend-${entry.id}`}>
                        <button
                          type="button"
                          onClick={() => handleDrill(entry)}
                          aria-pressed={isSelected}
                          className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                            isSelected
                              ? 'border-emerald-300/45 bg-slate-800/95 ring-1 ring-emerald-300/35'
                              : 'border-white/5 bg-slate-900/80 hover:border-indigo-300/45 hover:bg-slate-800/95'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className="mt-[2px] h-3 w-3 flex-shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: entry.color,
                                    boxShadow: `0 0 14px ${entry.color}`,
                                  }}
                                />
                                <span className="text-sm font-medium text-slate-50 break-words">{entry.label}</span>
                              </div>
                              <p className="mt-1 pl-5 text-xs font-semibold text-slate-300">{formatTryCurrencyText(entry.value)}</p>
                            </div>
                            <span className="shrink-0 text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-violet-300">
                              {isPrivacyActive ? maskValue(`%${entry.share.toFixed(1)}`) : `%${entry.share.toFixed(1)}`}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

BankTotals.propTypes = {
  bankTotals: PropTypes.object,
  portfolio: PropTypes.arrayOf(PropTypes.object),
  marketData: PropTypes.object,
  baseCurrency: PropTypes.string,
  rates: PropTypes.object,
  totalValue: PropTypes.number,
  selectedBank: PropTypes.string,
  onSelectBank: PropTypes.func,
};
