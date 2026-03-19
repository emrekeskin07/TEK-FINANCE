import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Wallet, Activity, DollarSign, TrendingUp, TrendingDown, PieChart as PieChartIcon, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, Sector } from 'recharts';
import { animate, motion, useSpring, useTransform } from 'framer-motion';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrencyParts, convertCurrency } from '../utils/helpers';
import { resolveAssetActivePrice } from '../utils/assetPricing';
import { getCategoryColor } from '../utils/categoryStyles';
import { CHART_ANIMATION, CHART_DONUT, CHART_LINE, CHART_THEME, darkenHex, lightenHex } from '../utils/chartConfig';

const TRY_CURRENCY_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
});

const SMALL_SLICE_THRESHOLD_PERCENT = 1;
const isOtherLabel = (value) => {
  const normalized = String(value || '').toLowerCase();
  return normalized === 'diger' || normalized === 'diğer';
};

const aggregateTinySlices = (rows, thresholdPercent = SMALL_SLICE_THRESHOLD_PERCENT) => {
  const list = Array.isArray(rows) ? rows : [];
  const total = list.reduce((sum, item) => sum + Number(item?.value || 0), 0);

  if (total <= 0) {
    return list;
  }

  let tinySum = 0;
  const largeRows = [];

  list.forEach((item) => {
    const value = Number(item?.value || 0);
    const share = (value / total) * 100;

    if (share < thresholdPercent) {
      tinySum += value;
      return;
    }

    largeRows.push(item);
  });

  if (tinySum <= 0) {
    return largeRows;
  }

  const existingOther = largeRows.find((item) => isOtherLabel(item?.name));
  if (existingOther) {
    return largeRows.map((item) => {
      if (!isOtherLabel(item?.name)) {
        return item;
      }

      return {
        ...item,
        value: Number((Number(item.value || 0) + tinySum).toFixed(2)),
      };
    });
  }

  return [
    ...largeRows,
    {
      name: 'Diğer',
      value: Number(tinySum.toFixed(2)),
    },
  ];
};

function PremiumTooltipContent({ active, payload, label, formatter }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <motion.div
      key={`${label || 'tooltip'}-${payload[0]?.name || 'item'}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      className="min-w-[140px] rounded-lg border border-white/10 bg-[#0f172a]/95 px-3 py-2 backdrop-blur-sm"
    >
      {label ? <p className="mb-1 text-xs text-slate-400">{label}</p> : null}
      {payload.map((entry, index) => {
        const formatted = formatter ? formatter(entry.value, entry.name) : entry.value;
        let valueLabel = formatted;

        if (Array.isArray(formatted)) {
          valueLabel = formatted[0];
        }

        return (
          <div key={`${entry.name}-${index}`} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-300">{entry.name}</span>
            <span className="font-semibold text-slate-100">{valueLabel}</span>
          </div>
        );
      })}
    </motion.div>
  );
}

function useAnimatedNumber(targetValue) {
  const springValue = useSpring(0);
  const transformedValue = useTransform(springValue, (latest) => Number(latest.toFixed(2)));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(springValue, Number(targetValue) || 0, {
      duration: 1.5,
      ease: 'easeOut',
    });

    return () => controls.stop();
  }, [springValue, targetValue]);

  useEffect(() => {
    const unsubscribe = transformedValue.on('change', (latest) => {
      setDisplayValue(latest);
    });

    setDisplayValue(transformedValue.get());
    return () => unsubscribe();
  }, [transformedValue]);

  return displayValue;
}

function useContainerReady() {
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    if (typeof window === 'undefined' || typeof window.ResizeObserver === 'undefined') {
      setIsReady(true);
      return undefined;
    }

    const updateReadiness = () => {
      const rect = container.getBoundingClientRect();
      setIsReady(rect.width > 0 && rect.height > 0);
    };

    updateReadiness();

    const observer = new window.ResizeObserver(() => {
      updateReadiness();
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  return [containerRef, isReady];
}

export default function SummaryCards({
  totalValue,
  totalCost,
  totalProfit,
  profitPercentage,
  baseCurrency,
  rates,
  bankTotals,
  categoryTotals,
  physicalAssetsTotal,
  portfolio,
  marketData,
  lineChartData,
  showTopCards = true,
  selectedBank = null,
  selectedCategory = null,
}) {
  const { isPrivacyActive, maskValue } = usePrivacy();

  const isChartFiltered = Boolean(selectedBank || selectedCategory);
  const filteredPortfolio = useMemo(() => {
    const source = Array.isArray(portfolio) ? portfolio : [];

    return source.filter((item) => {
      const bankName = item.bank || 'Banka Belirtilmedi';
      const categoryName = item.category || 'Diğer';
      const bankMatch = !selectedBank || bankName === selectedBank;
      const categoryMatch = !selectedCategory || categoryName === selectedCategory;

      return bankMatch && categoryMatch;
    });
  }, [portfolio, selectedBank, selectedCategory]);

  const bankTotalsForChart = useMemo(() => {
    if (!isChartFiltered) {
      return bankTotals || {};
    }

    return filteredPortfolio.reduce((acc, item) => {
      const currentPrice = resolveAssetActivePrice(item, marketData);
      const itemValue = currentPrice * item.amount;
      const safeBankName = item.bank || 'Banka Belirtilmedi';

      if (!acc[safeBankName]) {
        acc[safeBankName] = 0;
      }

      acc[safeBankName] += itemValue;
      return acc;
    }, {});
  }, [isChartFiltered, bankTotals, filteredPortfolio, marketData]);

  const categoryTotalsForChart = useMemo(() => {
    if (!isChartFiltered) {
      return categoryTotals || {};
    }

    return filteredPortfolio.reduce((acc, item) => {
      const currentPrice = resolveAssetActivePrice(item, marketData);
      const itemValue = currentPrice * item.amount;
      const categoryName = item.category || 'Diğer';

      if (!acc[categoryName]) {
        acc[categoryName] = 0;
      }

      acc[categoryName] += itemValue;
      return acc;
    }, {});
  }, [isChartFiltered, categoryTotals, filteredPortfolio, marketData]);
  
  const chartData = Object.keys(bankTotalsForChart || {}).map(bankName => ({
    name: bankName,
    value: Number(convertCurrency(bankTotalsForChart[bankName], baseCurrency, rates).toFixed(2))
  })).filter(item => item.value > 0);

  const categoryChartData = Object.keys(categoryTotalsForChart || {}).map((categoryName) => ({
    name: categoryName,
    value: Number(convertCurrency(categoryTotalsForChart[categoryName], baseCurrency, rates).toFixed(2))
  })).filter((item) => item.value > 0);

  const convertedPhysicalAssets = Number(
    convertCurrency(physicalAssetsTotal || 0, baseCurrency, rates).toFixed(2)
  );

  const detailedAssetRows = useMemo(() => {
    const rows = (isChartFiltered ? filteredPortfolio : (portfolio || [])).map((item) => {
      const currentPrice = resolveAssetActivePrice(item, marketData);
      const valueInTry = Number(currentPrice) * Number(item.amount || 0);
      const convertedValue = Number(convertCurrency(valueInTry, baseCurrency, rates).toFixed(2));

      return {
        id: item.id,
        label: item.name || item.symbol,
        symbol: item.symbol,
        category: item.category || 'Diğer',
        value: Number.isFinite(convertedValue) ? convertedValue : 0,
      };
    }).filter((item) => item.value > 0);

    if (convertedPhysicalAssets > 0 && !isChartFiltered) {
      rows.push({
        id: 'physical-assets',
        label: 'Fiziksel Varlıklar',
        symbol: 'MAL_VARLIGI',
        category: 'Fiziksel Varlıklar',
        value: convertedPhysicalAssets,
      });
    }

    const safeTotal = rows.reduce((sum, item) => sum + Number(item?.value || 0), 0);

    return rows
      .map((item) => ({
        ...item,
        totalShare: safeTotal > 0 ? (item.value / safeTotal) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [portfolio, filteredPortfolio, isChartFiltered, marketData, baseCurrency, rates, convertedPhysicalAssets]);

  const categoryInternalRows = useMemo(() => {
    const buckets = detailedAssetRows.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = {
          category: item.category,
          total: 0,
          items: [],
        };
      }

      acc[item.category].total += item.value;
      acc[item.category].items.push(item);
      return acc;
    }, {});

    return Object.values(buckets)
      .map((group) => ({
        ...group,
        totalShare: totalValue > 0 ? (group.total / totalValue) * 100 : 0,
        items: group.items
          .map((item) => ({
            ...item,
            categoryShare: group.total > 0 ? (item.value / group.total) * 100 : 0,
          }))
          .sort((a, b) => b.value - a.value),
      }))
      .sort((a, b) => b.total - a.total);
  }, [detailedAssetRows, totalValue]);

  const formatPercent = (value) => {
    const formatted = `%${Number(value || 0).toFixed(1)}`;
    return isPrivacyActive ? maskValue(formatted) : formatted;
  };

  const netWorthCategoryData = [...categoryChartData];
  if (convertedPhysicalAssets > 0) {
    netWorthCategoryData.push({
      name: 'Fiziksel Varlıklar',
      value: convertedPhysicalAssets,
    });
  }

  const netWorthBankData = [...chartData];
  if (convertedPhysicalAssets > 0 && !isChartFiltered) {
    netWorthBankData.push({
      name: 'Fiziksel Varlıklar',
      value: convertedPhysicalAssets,
    });
  }

  const bankPieData = useMemo(
    () => [...netWorthBankData].sort((a, b) => Number(b?.value || 0) - Number(a?.value || 0)),
    [netWorthBankData]
  );
  const categoryPieData = useMemo(
    () => [...netWorthCategoryData].sort((a, b) => Number(b?.value || 0) - Number(a?.value || 0)),
    [netWorthCategoryData]
  );

  const bankOnlyTotal = Object.values(bankTotalsForChart || {}).reduce(
    (sum, currentValue) => sum + Number(currentValue || 0),
    0
  );
  const netWorthDifference = Math.max(0, Number(totalValue || 0) - bankOnlyTotal);

  const animatedTotalValue = useAnimatedNumber(totalValue);
  const animatedTotalProfit = useAnimatedNumber(totalProfit);

  const premiumCardHighlightClass = "relative overflow-hidden before:pointer-events-none before:absolute before:left-4 before:right-4 before:top-0 before:h-px before:bg-white/5 before:content-[''] after:pointer-events-none after:absolute after:top-4 after:bottom-4 after:left-0 after:w-px after:bg-white/5 after:content-['']";

  const renderCurrencyWithMutedSymbol = (value) => {
    const plainCurrencyText = formatCurrencyParts(value, baseCurrency, rates)
      .map((part) => part.value)
      .join('');

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

  const [activeChartTab, setActiveChartTab] = useState('banks');
  const [selectedPieIndex, setSelectedPieIndex] = useState(null);
  const [renderedPieIndex, setRenderedPieIndex] = useState(null);
  const [hoveredPieIndex, setHoveredPieIndex] = useState(null);
  const [isPieInitialAnimation, setIsPieInitialAnimation] = useState(true);
  const [chartsReady, setChartsReady] = useState(false);
  const [pieChartContainerRef, pieChartContainerReady] = useContainerReady();
  const [areaChartContainerRef, areaChartContainerReady] = useContainerReady();
  const pieExpandSpring = useSpring(0, CHART_DONUT.spring);
  const [pieExpansionProgress, setPieExpansionProgress] = useState(0);
  const isBankTab = activeChartTab === 'banks';
  const activePieData = isBankTab ? bankPieData : categoryPieData;
  const canRenderPieChart = chartsReady && pieChartContainerReady;
  const canRenderAreaChart = chartsReady && areaChartContainerReady;
  const activePieTotal = activePieData.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const dominantBankIndex = useMemo(() => {
    if (!isBankTab || !activePieData.length || activePieTotal <= 0) {
      return null;
    }

    let maxIndex = 0;
    let maxValue = Number(activePieData[0]?.value || 0);
    activePieData.forEach((entry, index) => {
      const value = Number(entry?.value || 0);
      if (value > maxValue) {
        maxValue = value;
        maxIndex = index;
      }
    });

    return (maxValue / activePieTotal) > 0.9 ? maxIndex : null;
  }, [isBankTab, activePieData, activePieTotal]);
  const donutOuterRadius = Math.max(46, Math.round(CHART_DONUT.outerRadius * 0.8));
  const donutInnerRadius = Math.max(34, Math.round(donutOuterRadius * 0.88));

  useEffect(() => {
    setSelectedPieIndex(null);
    setRenderedPieIndex(null);
    setHoveredPieIndex(null);
    pieExpandSpring.set(0);
  }, [activeChartTab, pieExpandSpring]);

  useEffect(() => {
    if (selectedPieIndex !== null) {
      setRenderedPieIndex(selectedPieIndex);
    }

    pieExpandSpring.set(selectedPieIndex !== null ? 1 : 0);
  }, [selectedPieIndex, pieExpandSpring]);

  useEffect(() => {
    const unsubscribe = pieExpandSpring.on('change', (latest) => {
      setPieExpansionProgress(latest);

      if (selectedPieIndex === null && renderedPieIndex !== null && latest <= 0.02) {
        setRenderedPieIndex(null);
      }
    });

    setPieExpansionProgress(pieExpandSpring.get());
    return () => unsubscribe();
  }, [pieExpandSpring, selectedPieIndex, renderedPieIndex]);

  useEffect(() => {
    if (selectedPieIndex !== null && selectedPieIndex >= activePieData.length) {
      setSelectedPieIndex(null);
    }

    if (renderedPieIndex !== null && renderedPieIndex >= activePieData.length) {
      setRenderedPieIndex(null);
    }
  }, [activePieData.length, selectedPieIndex, renderedPieIndex]);

  useEffect(() => {
    if (selectedPieIndex === null && dominantBankIndex !== null) {
      setSelectedPieIndex(dominantBankIndex);
    }
  }, [selectedPieIndex, dominantBankIndex]);

  useEffect(() => {
    const frameHandle = window.requestAnimationFrame(() => {
      setChartsReady(true);
    });

    return () => window.cancelAnimationFrame(frameHandle);
  }, []);

  const getPieBaseColor = (entry, index) => {
    if (isBankTab) {
      return CHART_THEME.palette[index % CHART_THEME.palette.length];
    }

    return CHART_THEME.categoryPalette[index % CHART_THEME.categoryPalette.length];
  };

  const getPieColor = (entry, index) => {
    const baseColor = getPieBaseColor(entry, index);
    return hoveredPieIndex === index ? lightenHex(baseColor, 0.2) : baseColor;
  };

  const getPiePercent = (value) => {
    if (!activePieTotal) {
      return 0;
    }

    return (Number(value || 0) / activePieTotal) * 100;
  };

  const selectedSlice = selectedPieIndex !== null ? activePieData[selectedPieIndex] : null;
  const selectedSlicePercent = selectedSlice ? getPiePercent(selectedSlice.value) : null;
  const centerTitle = selectedSlice ? selectedSlice.name : 'TOPLAM VARLIK';
  const centerAmount = selectedSlice ? selectedSlice.value : activePieTotal;

  const formatChartCurrency = (value) => {
    const formatted = TRY_CURRENCY_FORMATTER.format(Number(value || 0));

    if (isPrivacyActive) {
      return maskValue(formatted);
    }

    return formatted;
  };

  const renderPieLegend = ({ payload }) => {
    const legendItems = Array.isArray(payload) ? payload : [];
    if (!legendItems.length) {
      return null;
    }

    return (
      <ul className="mt-4 max-h-[220px] space-y-2.5 overflow-y-auto pr-1">
        {legendItems.map((entry, index) => {
          const itemValue = Number(entry?.payload?.value || 0);
          const itemPercent = getPiePercent(itemValue);

          return (
            <li
              key={`${entry?.value || 'legend'}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5"
            >
              <div className="min-w-0 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.15)]"
                  style={{ backgroundColor: entry?.color || '#94a3b8' }}
                />
                <span className="truncate text-sm font-medium text-slate-200">{entry?.value}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-200">{formatChartCurrency(itemValue)}</p>
                <p className="text-[11px] font-semibold text-slate-400">{isPrivacyActive ? maskValue(`%${itemPercent.toFixed(1)}`) : `%${itemPercent.toFixed(1)}`}</p>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderActiveShape = (props) => {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
    } = props;

    const expansionFactor = 1 + ((CHART_DONUT.activeOuterScale - 1) * pieExpansionProgress);
    const activeOuterRadius = outerRadius * expansionFactor;
    const shadowColor = darkenHex(fill, 0.3);

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy + 1}
          innerRadius={innerRadius - 1}
          outerRadius={activeOuterRadius + 7}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={shadowColor}
          opacity={CHART_DONUT.shadowOpacity}
          filter="url(#activeSliceShadowBlur)"
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={activeOuterRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  return (
    <>
      {showTopCards ? (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-6 md:p-8 lg:p-10 shadow-2xl group hover:border-white/20 transition-all ${premiumCardHighlightClass}`}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-slate-300/90 text-xs font-bold uppercase tracking-[0.12em] mb-1.5">Net Değer</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100">{renderCurrencyWithMutedSymbol(animatedTotalValue)}</h2>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Wallet className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-xs text-slate-500 relative z-10">
            (Bankalardaki Toplam: {renderCurrencyWithMutedSymbol(bankOnlyTotal)})
          </p>
          {netWorthDifference > 0 ? (
            <p className="text-[11px] text-slate-400 mt-1 relative z-10">
              Mal Varlığı Katkısı (Araç/Gayrimenkul/Diğer): {renderCurrencyWithMutedSymbol(netWorthDifference)}
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 mt-1 relative z-10">Net değer şu an yalnızca bankadaki varlıklardan oluşuyor.</p>
          )}
        </div>

        <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-6 md:p-8 lg:p-10 shadow-2xl group hover:border-white/20 transition-all ${premiumCardHighlightClass}`}>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-slate-300/90 text-xs font-bold uppercase tracking-[0.12em] mb-1.5">Toplam Maliyet</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-200">{renderCurrencyWithMutedSymbol(totalCost)}</h2>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <DollarSign className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </div>

        <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-6 md:p-8 lg:p-10 shadow-2xl group hover:border-white/20 transition-all ${premiumCardHighlightClass}`}>
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-slate-300/90 text-xs font-bold uppercase tracking-[0.12em] mb-1.5">Net Kâr / Zarar</p>
              <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${totalProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {totalProfit > 0 ? '+' : ''}{renderCurrencyWithMutedSymbol(animatedTotalProfit)}
              </h2>
            </div>
            <div className={`p-3 rounded-xl ${totalProfit >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
              {totalProfit >= 0 ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-rose-400" />}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm relative z-10">
            <span className={`font-semibold px-2 py-0.5 rounded-md ${totalProfit >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
              {isPrivacyActive ? maskValue(`${totalProfit > 0 ? '+' : ''}${profitPercentage}%`) : `${totalProfit > 0 ? '+' : ''}${profitPercentage}%`}
            </span>
            <span className="text-slate-400">tüm zamanlar</span>
          </div>
        </div>
      </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
        <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl lg:col-span-5 flex flex-col ${premiumCardHighlightClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-300 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-purple-400" />
                Dağılım Analizi (TRY)
              </h3>
              {isChartFiltered ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-sky-200">
                  <Filter className="h-3 w-3" />
                  Filtrelendi
                </span>
              ) : null}
            </div>
            <div className="inline-flex items-center gap-1.5 bg-black/20 border border-white/10 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setActiveChartTab('banks')}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                  isBankTab ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Kurumlara Göre
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab('categories')}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                  !isBankTab ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Varlıklara Göre
              </button>
            </div>
          </div>

          <p className="text-[11px] font-medium text-slate-500 mb-3">
            {isBankTab ? 'Kurum bazlı portföy dağılımı' : 'Varlık türü bazlı net değer dağılımı (Fiziksel Varlıklar dahil)'}
          </p>

          <div ref={pieChartContainerRef} className="h-[280px] sm:h-[320px] md:h-[360px] w-full min-w-0 min-h-[280px] relative">
            {activePieData.length > 0 && canRenderPieChart ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                  <defs>
                    <filter id="activeSliceShadowBlur" x="-50%" y="-50%" width="220%" height="220%">
                      <feGaussianBlur stdDeviation={CHART_DONUT.shadowBlur} />
                    </filter>
                  </defs>
                  <Pie
                    data={activePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={donutInnerRadius}
                    outerRadius={donutOuterRadius}
                    paddingAngle={CHART_DONUT.paddingAngle}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={isPieInitialAnimation}
                    animationDuration={CHART_DONUT.animationDuration}
                    animationEasing={CHART_ANIMATION.easing}
                    label={false}
                    labelLine={false}
                    activeIndex={renderedPieIndex ?? undefined}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setHoveredPieIndex(index)}
                    onMouseLeave={() => setHoveredPieIndex(null)}
                    onAnimationEnd={() => {
                      setIsPieInitialAnimation(false);
                    }}
                    onClick={(_, index) => {
                      setSelectedPieIndex(index);
                    }}
                  >
                    {activePieData.map((entry, index) => (
                      <Cell key={`${activeChartTab}-cell-${index}`} fill={getPieColor(entry, index)} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={(props) => (
                      <PremiumTooltipContent
                        {...props}
                        formatter={(value) => formatChartCurrency(value)}
                      />
                    )}
                  />
                  <Legend
                    layout="vertical"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    content={renderPieLegend}
                    wrapperStyle={{
                      paddingTop: '14px',
                      fontSize: `${CHART_THEME.legendFontSize}px`,
                      fontFamily: CHART_THEME.fontFamily,
                    }}
                  />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center px-4">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300/90"
                      style={{ fontFamily: CHART_THEME.fontFamily }}
                    >
                      {centerTitle}
                    </p>
                    <p
                      className="text-2xl font-bold text-slate-100 leading-tight"
                      style={{ fontFamily: CHART_THEME.fontFamily }}
                    >
                      {formatChartCurrency(centerAmount)}
                    </p>
                    {selectedSlice ? (
                      <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{isPrivacyActive ? maskValue(`%${selectedSlicePercent?.toFixed(1)}`) : `%${selectedSlicePercent?.toFixed(1)}`}</p>
                    ) : null}
                  </div>
                </div>
              </>
            ) : activePieData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">Veri bulunamadı</div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">Grafik hazırlanıyor...</div>
            )}
          </div>
        </div>

        <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl lg:col-span-7 flex flex-col ${premiumCardHighlightClass}`}>
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-300 flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Portföy Gelişimi (Son 7 Gün)
          </h3>
          <div ref={areaChartContainerRef} className="h-[260px] sm:h-[320px] md:h-[360px] w-full min-w-0 min-h-[260px] relative">
            {canRenderAreaChart ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineChartData}>
                <defs>
                  <linearGradient id="portfolioFlowGradient" x1="0" y1="0" x2="0" y2="1">
                    {CHART_THEME.lineGradientStops.map((stop) => (
                      <stop
                        key={stop.offset}
                        offset={stop.offset}
                        stopColor={stop.color}
                        stopOpacity={0.1}
                      />
                    ))}
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.gridStroke} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke={CHART_THEME.axisStroke}
                  fontSize={CHART_THEME.axisFontSize}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontFamily: CHART_THEME.fontFamily }}
                />
                <YAxis 
                  domain={['dataMin - 1000', 'dataMax + 1000']}
                  stroke={CHART_THEME.axisStroke}
                  fontSize={CHART_THEME.axisFontSize}
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => formatChartCurrency(value)}
                  width={50}
                  tick={{ fontFamily: CHART_THEME.fontFamily }}
                />
                <Tooltip 
                  content={(props) => (
                    <PremiumTooltipContent
                      {...props}
                      formatter={(value) => formatChartCurrency(value)}
                    />
                  )}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={CHART_THEME.lineStrokeColor}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#portfolioFlowGradient)" 
                  activeDot={CHART_LINE.activeDot}
                  isAnimationActive
                  animationDuration={CHART_ANIMATION.duration}
                  animationEasing={CHART_ANIMATION.easing}
                  animationBegin={CHART_ANIMATION.lineBegin}
                />
              </AreaChart>
            </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">Grafik hazırlanıyor...</div>
            )}
          </div>
        </div>
      </div>

      {!isBankTab ? (
        <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 md:p-8 lg:p-10 shadow-2xl ${premiumCardHighlightClass}`}>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-cyan-300" />
            <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-300">Detaylı İçerik Dağılımı</h3>
          </div>
          <p className="text-[11px] font-medium text-slate-500 mb-5">Konsantrasyon riski için varlıkların toplam ve kategori içindeki payları</p>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-8 lg:gap-10">
            <div className="rounded-xl border border-white/10 bg-black/15 p-4 md:p-6">
              <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-300 mb-3">Tüm Portföy İçindeki Varlık Ağırlıkları</h4>
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {detailedAssetRows.map((item) => (
                  <div key={item.id}>
                    <div className="flex items-center justify-between gap-2 text-sm mb-1">
                      <div className="min-w-0">
                        <span className="text-slate-200 font-semibold">{item.label}</span>
                        <span className="text-slate-500 text-xs font-medium ml-2">({item.category})</span>
                      </div>
                      <span className="text-cyan-300 text-[11px] font-bold">{formatPercent(item.totalShare)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-400/90"
                        style={{ width: `${Math.min(item.totalShare, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/15 p-4 md:p-6">
              <h4 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-300 mb-3">Kategori İç Dağılımı</h4>
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {categoryInternalRows.map((group) => (
                  <div key={group.category} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: getCategoryColor(group.category) }}>{group.category}</span>
                      <span className="text-[11px] font-medium text-slate-400">Toplam Pay: {formatPercent(group.totalShare)}</span>
                    </div>
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <div key={`${group.category}-${item.id}`}>
                          <div className="flex items-center justify-between gap-2 text-xs mb-1">
                            <span className="text-slate-300/90 text-[11px] font-medium truncate">{item.label}</span>
                            <span className="text-slate-400 text-[11px] font-semibold">{formatPercent(item.categoryShare)}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mb-1">{item.label}, {group.category} kategorisinin {formatPercent(item.categoryShare)}'ını oluşturuyor.</p>
                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(item.categoryShare, 100)}%`, backgroundColor: getCategoryColor(group.category) }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}