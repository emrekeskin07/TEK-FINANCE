import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { RotateCcw, Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrivacy } from '../context/PrivacyContext';
import { MARKET_DATA_ATTRIBUTION } from '../constants/trustContent';
import { formatCurrency } from '../utils/helpers';
import { resolveAssetActivePrice } from '../utils/assetPricing';
import { getCategoryColor } from '../utils/categoryStyles';

const DEFAULT_CATEGORY_COLORS = ['#A78BFA', '#06B6D4', '#FF7F50', '#F59E0B', '#8B5CF6', '#22D3EE', '#FB7185', '#FBBF24'];

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
const normalizeCategoryText = (value) => String(value || '').trim().toLocaleLowerCase('tr-TR');

const mapCategoryToFilter = (category) => {
  const normalized = normalizeCategoryText(category);

  if (normalized.includes('hisse')) {
    return 'Hisse Senedi';
  }

  if (
    normalized.includes('değerli maden')
    || normalized.includes('degerli maden')
    || normalized.includes('emtia')
    || normalized.includes('altın')
    || normalized.includes('altin')
  ) {
    return 'Değerli Maden';
  }

  if (normalized.includes('döviz') || normalized.includes('doviz')) {
    return 'Döviz';
  }

  if (normalized.includes('fon')) {
    return 'Fon';
  }

  if (normalized.includes('kripto')) {
    return 'Kripto';
  }

  return String(category || 'Diğer');
};

const containsAny = (source, keywords) => keywords.some((keyword) => source.includes(keyword));

const isFxBasedAsset = (asset) => {
  const normalizedCategory = normalizeCategoryText(asset?.category);
  const normalizedName = normalizeCategoryText(asset?.name);
  const normalizedSymbol = normalizeCategoryText(asset?.symbol);
  const sourceText = `${normalizedCategory} ${normalizedName} ${normalizedSymbol}`;

  const fxKeywords = [
    'döviz',
    'doviz',
    'usd',
    'eur',
    'gbp',
    'xau',
    'xag',
    'altın',
    'altin',
    'gümüş',
    'gumus',
    'değerli maden',
    'degerli maden',
    'fx',
    'yabancı',
    'yabanci',
    'eurobond',
  ];

  return containsAny(sourceText, fxKeywords);
};

const computeAssetValue = (asset, marketData) => {
  const amount = toPositiveNumber(asset?.amount);
  const activePrice = toPositiveNumber(resolveAssetActivePrice(asset, marketData));
  return amount * activePrice;
};

export default function BankTotals({
  bankTotals,
  portfolio,
  marketData,
  baseCurrency,
  rates,
  totalValue,
  insightTone,
  activeCategory,
  onResetCategory,
}) {
  const { isPrivacyActive, maskValue } = usePrivacy();
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const syncScreenState = () => setIsSmallScreen(Boolean(mediaQuery.matches));

    syncScreenState();
    mediaQuery.addEventListener('change', syncScreenState);

    return () => mediaQuery.removeEventListener('change', syncScreenState);
  }, []);

  const resolvedActiveCategory = String(activeCategory || 'Tümü');
  const isAllCategoryView = resolvedActiveCategory === 'Tümü';

  const chartData = useMemo(() => {
    const source = Array.isArray(portfolio) ? portfolio : [];

    if (!source.length) {
      return [];
    }

    const grouped = new Map();

    source.forEach((asset, index) => {
      const assetValue = computeAssetValue(asset, marketData);
      if (assetValue <= 0) {
        return;
      }

      if (isAllCategoryView) {
        const key = mapCategoryToFilter(asset?.category);
        grouped.set(key, Number(grouped.get(key) || 0) + assetValue);
        return;
      }

      if (mapCategoryToFilter(asset?.category) !== resolvedActiveCategory) {
        return;
      }

      const key = resolveAssetName(asset);
      const existing = grouped.get(key) || { value: 0, sourceIndex: index };
      grouped.set(key, {
        value: Number(existing.value || 0) + assetValue,
        sourceIndex: existing.sourceIndex,
      });
    });

    const entries = Array.from(grouped.entries())
      .map(([label, value], index) => {
        if (isAllCategoryView) {
          const numericValue = Number(value || 0);
          return {
            id: `category:${label}`,
            label,
            value: numericValue,
            color: getCategoryColor(
              label === 'Değerli Maden'
                ? 'Değerli Madenler'
                : (label === 'Fon' ? 'Yatırım Fonu' : label)
            ),
            sortRef: index,
          };
        }

        const normalized = value || {};
        const numericValue = Number(normalized.value || 0);
        return {
          id: `asset:${label}`,
          label,
          value: numericValue,
          color: DEFAULT_CATEGORY_COLORS[index % DEFAULT_CATEGORY_COLORS.length],
          sortRef: Number(normalized.sourceIndex || index),
        };
      })
      .filter((item) => Number.isFinite(item.value) && item.value > 0)
      .sort((a, b) => b.value - a.value);

    let normalizedEntries = entries;

    // Fallback: if per-asset valuation cannot be resolved yet, render institution totals to keep donut visible.
    if (isAllCategoryView && normalizedEntries.length === 0) {
      normalizedEntries = Object.entries(bankTotals || {})
        .map(([label, rawValue], index) => ({
          id: `institution:${label}`,
          label,
          value: Number(rawValue || 0),
          color: DEFAULT_CATEGORY_COLORS[index % DEFAULT_CATEGORY_COLORS.length],
        }))
        .filter((item) => Number.isFinite(item.value) && item.value > 0)
        .sort((a, b) => b.value - a.value);
    }

    const sum = normalizedEntries.reduce((accumulator, item) => accumulator + item.value, 0);
    if (sum <= 0) {
      return [];
    }

    return normalizedEntries.map((item) => ({
      ...item,
      share: (item.value / sum) * 100,
    }));
  }, [portfolio, marketData, isAllCategoryView, resolvedActiveCategory, bankTotals]);

  const centerTotalValue = chartData.length > 0
    ? chartData.reduce((sum, item) => sum + item.value, 0)
    : (Number(totalValue || 0) > 0 ? Number(totalValue) : 0);
  const centerTitle = isAllCategoryView ? 'Kategori Dağılımı' : `${resolvedActiveCategory} Toplamı`;

  const distributionTip = useMemo(() => {
    const source = Array.isArray(portfolio) ? portfolio : [];
    if (!source.length) {
      return 'Portföy dağılımı oluştuğunda burada koruma ve denge ipuçları göreceksin.';
    }

    const totals = source.reduce((accumulator, asset) => {
      const value = computeAssetValue(asset, marketData);
      if (value <= 0) {
        return accumulator;
      }

      accumulator.total += value;
      if (isFxBasedAsset(asset)) {
        accumulator.fx += value;
      }

      return accumulator;
    }, { total: 0, fx: 0 });

    if (totals.total <= 0) {
      return 'Portföy dağılımı oluştuğunda burada koruma ve denge ipuçları göreceksin.';
    }

    const fxShare = (totals.fx / totals.total) * 100;
    const roundedFxShare = Math.round(fxShare);

    if (fxShare > 70) {
      return insightTone === 'neutral'
        ? `İpucu: Döviz bazlı varlık oranı %${roundedFxShare}. Kur şoklarına karşı koruma katsayısı yüksek.`
        : `İpucu: Portföyünün %${roundedFxShare}'i döviz bazlı varlıklarda, TL devalüasyonuna karşı korumadasın. ✅`;
    }

    if (fxShare < 30) {
      return insightTone === 'neutral'
        ? 'İpucu: TL bazlı ağırlık yüksek. Enflasyon dönemlerinde reel getiri riski artabilir.'
        : 'İpucu: Portföyünün çoğu TL bazlı, enflasyon karşısında alım gücün eriyebilir. ⚠️';
    }

    return insightTone === 'neutral'
      ? `İpucu: Döviz bazlı varlık oranı %${roundedFxShare}. Risk-getiri dağılımı dengeli görünüyor.`
      : `İpucu: Döviz bazlı varlık oranın %${roundedFxShare}. Koruma ve büyüme dengesini sürdürebilirsin.`;
  }, [portfolio, marketData, insightTone]);

  const formatTryCurrencyText = (value) => {
    const rawText = formatCurrency(value, baseCurrency, rates);

    return isPrivacyActive ? maskValue(rawText) : rawText;
  };

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

  const hasData = chartData.length > 0;
  const innerRadius = isSmallScreen ? 44 : 52;
  const outerRadius = isSmallScreen ? 74 : 92;
  const centerAmountText = formatTryCurrencyText(centerTotalValue);
  const centerAmountClass = useMemo(() => {
    const textLength = String(centerAmountText || '').length;

    if (textLength >= 22) {
      return 'text-sm sm:text-base';
    }

    if (textLength >= 16) {
      return 'text-base sm:text-lg';
    }

    return 'text-lg sm:text-xl';
  }, [centerAmountText]);

  return (
    <div>
      {!hasData ? (
        <div className="rounded-2xl border border-white/5 bg-slate-900 p-8 text-sm text-slate-400 shadow-[0_16px_46px_rgba(2,6,23,0.6)] backdrop-blur-xl">
          {isAllCategoryView ? 'Kayıtlı dağılım verisi bulunmuyor.' : 'Bu kategoride henüz varlığınız bulunmuyor.'}
        </div>
      ) : (
        <div className="relative rounded-3xl border border-white/5 bg-slate-900 p-8 shadow-[0_20px_58px_rgba(2,6,23,0.72)]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/35 bg-emerald-500/12">
              <Wallet className="h-5 w-5 text-emerald-300" />
            </div>

            {!isAllCategoryView ? (
              <button
                type="button"
                onClick={() => onResetCategory?.()}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-fuchsia-300/35 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 px-3 py-1.5 text-xs font-semibold text-slate-100 transition-all duration-200 hover:scale-105 hover:border-fuchsia-200/45"
                title="Tüm Portföy"
                aria-label="Tüm Portföy"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Geri Dön
              </button>
            ) : null}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={resolvedActiveCategory}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex flex-col gap-4 xl:flex-row xl:items-start xl:gap-4"
            >
              <div className="relative h-[250px] w-full shrink-0 xl:h-[280px] xl:w-[52%]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={innerRadius}
                      outerRadius={outerRadius}
                      minAngle={6}
                      paddingAngle={2}
                      isAnimationActive
                      animationDuration={500}
                    >
                      {chartData.map((entry) => (
                        <Cell
                          key={`category-slice-${entry.id}`}
                          fill={entry.color}
                          stroke="rgba(15,23,42,0.5)"
                          strokeWidth={1.5}
                          style={{
                            filter: `drop-shadow(0 0 12px ${entry.color}55)`,
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={renderTooltip} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                  <div className="relative px-3 text-center">
                    <span className="pointer-events-none absolute inset-x-2 top-1/2 h-14 -translate-y-1/2 rounded-full bg-fuchsia-500/12 blur-2xl" aria-hidden="true" />
                    <p className="relative text-xs font-medium text-slate-400 xl:text-sm">{centerTitle}</p>
                    <p className={`relative mt-1 max-w-[150px] break-words font-black leading-tight tracking-tight text-slate-50 drop-shadow-[0_0_18px_rgba(255,255,255,0.25)] ${centerAmountClass}`}>
                      {centerAmountText}
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full xl:w-[48%]">
                <ul className="flex w-full flex-col gap-4">
                  {chartData.map((entry) => {
                    return (
                      <li key={`legend-${entry.id}`} className="w-full">
                        <div className="w-full rounded-xl border border-white/5 bg-slate-900/80 px-3 py-2.5 text-left transition-all duration-200 hover:border-indigo-300/45 hover:bg-slate-800/95">
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
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-3 rounded-xl border border-indigo-300/25 bg-indigo-500/10 px-3 py-2 text-sm italic text-indigo-100">
                  {distributionTip}
                </div>

                <p className="mt-2 text-right text-[10px] text-slate-400">
                  {MARKET_DATA_ATTRIBUTION}
                </p>
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
  insightTone: PropTypes.oneOf(['coaching', 'neutral']),
  activeCategory: PropTypes.string,
  onResetCategory: PropTypes.func,
};

BankTotals.defaultProps = {
  bankTotals: {},
  portfolio: [],
  marketData: {},
  baseCurrency: 'TRY',
  rates: {},
  totalValue: 0,
  insightTone: 'coaching',
  activeCategory: 'Tümü',
  onResetCategory: () => {},
};
