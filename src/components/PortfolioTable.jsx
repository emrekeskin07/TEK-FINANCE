import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Coins, Edit2, Trash2, X, ChevronUp, ChevronDown, CheckCircle2, Flame, TrendingUp, TrendingDown, FileText, Download, Plus, Wallet } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrencyParts, formatTickerName, groupAssetsByPortfolio } from '../utils/helpers';
import { getMarketPriceKey, resolveAssetLivePrice, unitTypeToLabel } from '../utils/assetPricing';
import { getCategoryBadgeStyle, getCategoryColor } from '../utils/categoryStyles';
import { calculateRealReturnPercent, getLatestAnnualInflationRate } from '../utils/financeMath';
import AssetGroup from './dashboard/AssetGroup';
import InfoTooltip from './common/InfoTooltip';

const getLatestAnnualEnagRate = () => {
  try {
    const result = getLatestAnnualInflationRate({ source: 'enag' });
    return Number(result?.inflationRatePercent || 0);
  } catch {
    return 0;
  }
};

const LATEST_ANNUAL_ENAG_RATE = getLatestAnnualEnagRate();
const OUNCE_TO_GRAM = 31.1035;
const DEFAULT_CATEGORY_FILTERS = ['Tümü', 'Hisse Senedi', 'Değerli Maden', 'Döviz', 'Fon', 'Kripto'];

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

const getFilterDotColor = (filterLabel) => {
  if (filterLabel === 'Tümü') {
    return '#a78bfa';
  }

  const filterToCategoryMap = {
    'Hisse Senedi': 'Hisse Senedi',
    'Değerli Maden': 'Değerli Madenler',
    'Döviz': 'Döviz',
    'Fon': 'Yatırım Fonu',
    'Kripto': 'Kripto',
  };

  return getCategoryColor(filterToCategoryMap[filterLabel] || filterLabel);
};

const getInflationScore = (itemCost, itemProfit) => {
  const nominalReturnPercent = itemCost > 0 ? ((itemProfit / itemCost) * 100) : 0;
  const realReturnPercent = calculateRealReturnPercent(nominalReturnPercent, LATEST_ANNUAL_ENAG_RATE);
  const isProtected = realReturnPercent >= 0;
  const tooltip = `Bu varlık enflasyona karşı alım gücünü %${Math.abs(realReturnPercent).toFixed(2)} ${isProtected ? 'korudu' : 'kaybetti'}.`;

  return {
    isProtected,
    tooltip,
  };
};

export default function PortfolioTable({
  portfolio,
  marketData,
  marketMeta,
  loading,
  lastUpdated,
  baseCurrency,
  rates,
  totalValue,
  selectedBank,
  otherBankNames,
  selectedCategory,
  activeCategory,
  setActiveCategory,
  onSelectCategory,
  sortConfig,
  setSortConfig,
  onClearFilter,
  onExportPdfReport,
  onExportExcelReport,
  openEditModal,
  onQuickBuyAsset,
  onIncreaseAsset,
  onQuickAddPortfolio,
  handleSellAsset,
  handleRemoveAsset,
}) {
  const { isPrivacyActive, maskValue } = usePrivacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [localActiveCategory, setLocalActiveCategory] = useState('Tümü');
  const resolvedActiveCategory = activeCategory || localActiveCategory;
  const handleCategoryFilterSelect = (nextCategory) => {
    if (typeof setActiveCategory === 'function') {
      setActiveCategory(nextCategory);
      return;
    }

    setLocalActiveCategory(nextCategory);
  };
  const filteredPortfolio = portfolio.filter((item) => {
    const bankName = item.bank || 'Banka Belirtilmedi';
    const categoryName = item.category || 'Diğer';
    const bankMatch = !selectedBank
      || (selectedBank === 'Diğer'
        ? otherBankNames.includes(bankName)
        : bankName === selectedBank);
    const categoryMatch = !selectedCategory || categoryName === selectedCategory;

    return bankMatch && categoryMatch;
  });

  const handleSortChange = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }

      return { key, direction: 'desc' };
    });
  };

  const displayedPortfolio = filteredPortfolio
    .map((item) => {
      const normalizedSymbol = String(item?.symbol || '').trim().toUpperCase();
      const usdTry = Number(marketData?.['TRY=X']);
      const gcfOunceUsd = Number(marketData?.['GC=F__USD_OUNCE']);
      const gcfGramTry = Number(marketData?.['GC=F__GRAM']);
      const gcfOunceTry = Number(marketData?.['GC=F__ONS'] || marketData?.['GC=F']);

      let livePrice = resolveAssetLivePrice(item, marketData);
      if (normalizedSymbol === 'GC=F') {
        if (Number.isFinite(gcfOunceUsd) && gcfOunceUsd > 0 && Number.isFinite(usdTry) && usdTry > 0) {
          livePrice = (gcfOunceUsd / OUNCE_TO_GRAM) * usdTry;
        } else if (Number.isFinite(gcfGramTry) && gcfGramTry > 0) {
          livePrice = gcfGramTry;
        } else if (Number.isFinite(gcfOunceTry) && gcfOunceTry > 0) {
          livePrice = gcfOunceTry / OUNCE_TO_GRAM;
        }
      }

      const activePrice = Number.isFinite(livePrice) ? livePrice : item.avgPrice;
      const itemTotalValue = activePrice * item.amount;
      const itemCost = item.avgPrice * item.amount;
      const itemProfit = itemTotalValue - itemCost;

      return {
        item,
        livePrice,
        activePrice,
        itemTotalValue,
        itemCost,
        itemProfit,
      };
    })
    .sort((a, b) => {
      let aValue = 0;
      let bValue = 0;

      if (sortConfig.key === 'totalValue') {
        aValue = a.itemTotalValue;
        bValue = b.itemTotalValue;
      } else if (sortConfig.key === 'profit') {
        aValue = a.itemProfit;
        bValue = b.itemProfit;
      }

      const directionFactor = sortConfig.direction === 'asc' ? 1 : -1;
      return (aValue - bValue) * directionFactor;
    });

  const searchedDisplayedPortfolio = useMemo(() => {
    const normalizedQuery = String(searchQuery || '').trim().toLocaleLowerCase('tr-TR');

    if (!normalizedQuery) {
      return displayedPortfolio;
    }

    return displayedPortfolio.filter(({ item }) => {
      const assetName = getAssetTitle(item).toLocaleLowerCase('tr-TR');
      const institutionName = String(item?.bank || 'Banka Belirtilmedi').toLocaleLowerCase('tr-TR');
      return assetName.includes(normalizedQuery) || institutionName.includes(normalizedQuery);
    });
  }, [displayedPortfolio, searchQuery]);

  const categoryFilterCounts = useMemo(() => {
    const counts = filteredPortfolio.reduce((accumulator, item) => {
      const key = mapCategoryToFilter(item?.category);
      accumulator[key] = Number(accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    counts.Tümü = filteredPortfolio.length;
    return counts;
  }, [filteredPortfolio]);

  const categoryFilterOptions = useMemo(() => {
    const dynamicFilters = Object.keys(categoryFilterCounts)
      .filter((label) => label !== 'Tümü' && !DEFAULT_CATEGORY_FILTERS.includes(label))
      .sort((first, second) => first.localeCompare(second, 'tr'));

    return [...DEFAULT_CATEGORY_FILTERS, ...dynamicFilters];
  }, [categoryFilterCounts]);

  const categoryFilteredPortfolio = useMemo(() => {
    if (resolvedActiveCategory === 'Tümü') {
      return searchedDisplayedPortfolio;
    }

    return searchedDisplayedPortfolio.filter(({ item }) => mapCategoryToFilter(item?.category) === resolvedActiveCategory);
  }, [searchedDisplayedPortfolio, resolvedActiveCategory]);

  const groupedDisplayedPortfolio = useMemo(
    () => groupAssetsByPortfolio(categoryFilteredPortfolio)
      .sort((a, b) => Number(b?.totalValue || 0) - Number(a?.totalValue || 0)),
    [categoryFilteredPortfolio]
  );

  const handleEmptyCategoryAdd = () => {
    const firstPortfolioName = String(
      filteredPortfolio[0]?.portfolioName
      || categoryFilteredPortfolio[0]?.item?.portfolioName
      || 'Genel Portföy'
    );

    onQuickAddPortfolio?.(firstPortfolioName);
  };

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

  const formatCurrencyPlain = (value) => {
    return formatCurrencyParts(value, baseCurrency, rates)
      .map((part) => part.value)
      .join('');
  };

  const formatNumericText = (value, maxFractionDigits = 8) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return '-';
    }

    return numericValue.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFractionDigits,
    });
  };

  const renderMaskedText = (text) => (isPrivacyActive ? maskValue(text) : text);
  const renderQuantity = (value, maxFractionDigits = 8) => renderMaskedText(formatNumericText(value, maxFractionDigits));

  const getHesapDetayi = (item) => {
    if (item.hesapTuru === 'Vadeli (Mevduat)' || item.hesapTuru === 'Vadeli Hesap (Mevduat)') {
      const faiz = Number(item.faizOrani);
      const faizText = Number.isFinite(faiz) ? `Vadeli %${faiz}` : 'Vadeli';
      const rawDate = item.vadeSonuTarihi ? new Date(item.vadeSonuTarihi) : null;
      const isDateValid = rawDate && !Number.isNaN(rawDate.getTime());

      if (isDateValid) {
        return `${faizText} • ${rawDate.toLocaleDateString('tr-TR')}`;
      }

      return faizText;
    }

    if (item.hesapTuru === 'Faizsiz Katılım') {
      return 'Faizsiz Katılım';
    }

    if (item.hesapTuru === 'Vadesiz Hesap') {
      return 'Vadesiz';
    }

    return 'Vadesiz';
  };

  const getAssetDetailLabel = (item) => {
    const categoryName = item.category || 'Diğer';
    const displayName = String(item?.name || '').trim() || formatTickerName(item?.symbol);

    if (categoryName === 'Değerli Madenler' || categoryName === 'Emtia/Altın' || categoryName === 'Emtia') {
      const storagePrefix = item.saklamaTuru === 'Fiziksel/Evde' ? 'Fiziksel' : 'Banka';
      return `${storagePrefix} ${displayName}`;
    }

    return displayName;
  };

  const getAssetTitle = (item) => {
    return String(item?.name || '').trim() || formatTickerName(item?.symbol);
  };

  const showSkeleton = loading && !(lastUpdated instanceof Date);
  const [openPortfolios, setOpenPortfolios] = useState({});
  const [expandedAssetId, setExpandedAssetId] = useState(null);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [sellTarget, setSellTarget] = useState(null);
  const [sellAmount, setSellAmount] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellSubmitting, setSellSubmitting] = useState(false);
  const [increaseModalOpen, setIncreaseModalOpen] = useState(false);
  const [increaseTarget, setIncreaseTarget] = useState(null);
  const [increaseAmount, setIncreaseAmount] = useState('');
  const [increasePrice, setIncreasePrice] = useState('');
  const [increaseSubmitting, setIncreaseSubmitting] = useState(false);
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);

  useEffect(() => {
    setOpenPortfolios((prev) => {
      const nextState = {};
      groupedDisplayedPortfolio.forEach((group) => {
        const key = String(group.portfolioName || 'Genel Portföy');
        nextState[key] = prev[key] ?? true;
      });

      return nextState;
    });
  }, [groupedDisplayedPortfolio]);

  const handleAccordionToggle = (assetId) => {
    setExpandedAssetId((prevId) => (prevId === assetId ? null : assetId));
  };

  const togglePortfolioAccordion = (portfolioName) => {
    const key = String(portfolioName || 'Genel Portföy');
    setOpenPortfolios((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? true),
    }));
  };

  const openSellModal = (item, activePrice) => {
    setSellTarget(item);
    setSellAmount('');
    setSellPrice(Number.isFinite(Number(activePrice)) && Number(activePrice) > 0 ? String(Number(activePrice)) : '');
    setSellModalOpen(true);
  };

  const closeSellModal = () => {
    if (sellSubmitting) {
      return;
    }

    setSellModalOpen(false);
    setSellTarget(null);
    setSellAmount('');
    setSellPrice('');
  };

  const openIncreaseModal = (item, activePrice) => {
    setIncreaseTarget(item);
    setIncreaseAmount('');
    setIncreasePrice(Number.isFinite(Number(activePrice)) && Number(activePrice) > 0 ? String(Number(activePrice)) : '');
    setIncreaseModalOpen(true);
  };

  const closeIncreaseModal = () => {
    if (increaseSubmitting) {
      return;
    }

    setIncreaseModalOpen(false);
    setIncreaseTarget(null);
    setIncreaseAmount('');
    setIncreasePrice('');
  };

  const handleSellSubmit = async (event) => {
    event.preventDefault();

    if (!sellTarget || typeof handleSellAsset !== 'function') {
      return;
    }

    const amountNumeric = Number(sellAmount);
    const priceNumeric = Number(sellPrice);

    if (!Number.isFinite(amountNumeric) || amountNumeric <= 0) {
      return;
    }

    if (!Number.isFinite(priceNumeric) || priceNumeric <= 0) {
      return;
    }

    setSellSubmitting(true);
    const isSuccess = await handleSellAsset({
      assetId: sellTarget.id,
      sellAmount: amountNumeric,
      sellPrice: priceNumeric,
    });
    setSellSubmitting(false);

    if (isSuccess) {
      closeSellModal();
    }
  };

  const handleIncreaseSubmit = async (event) => {
    event.preventDefault();

    if (!increaseTarget || typeof onIncreaseAsset !== 'function') {
      return;
    }

    const amountNumeric = Number(increaseAmount);
    const priceNumeric = Number(increasePrice);

    if (!Number.isFinite(amountNumeric) || amountNumeric <= 0) {
      return;
    }

    if (!Number.isFinite(priceNumeric) || priceNumeric <= 0) {
      return;
    }

    setIncreaseSubmitting(true);
    const isSuccess = await onIncreaseAsset({
      assetId: increaseTarget.id,
      addedAmount: amountNumeric,
      buyPrice: priceNumeric,
    });
    setIncreaseSubmitting(false);

    if (isSuccess) {
      closeIncreaseModal();
    }
  };

  const sellAmountNumber = Number(sellAmount);
  const sellPriceNumber = Number(sellPrice);
  const sellTargetAmount = Number(sellTarget?.amount || 0);
  const estimatedRemainingAmount = Number.isFinite(sellAmountNumber)
    ? Math.max(0, sellTargetAmount - sellAmountNumber)
    : sellTargetAmount;
  const estimatedTotalProceeds = Number.isFinite(sellAmountNumber) && Number.isFinite(sellPriceNumber)
    ? Math.max(0, sellAmountNumber * sellPriceNumber)
    : 0;

  return (
    <>
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:border-white/5 dark:bg-slate-900/40 dark:shadow-[0_20px_68px_rgba(2,6,23,0.62)] dark:backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] hover:border-white/15 before:pointer-events-none before:absolute before:left-4 before:right-4 before:top-0 before:h-px before:bg-white/10 before:content-[''] after:pointer-events-none after:absolute after:top-4 after:bottom-4 after:left-0 after:w-px after:bg-white/10 after:content-['']">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-6 md:p-8">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-ui-h2 flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Coins className="w-5 h-5 text-blue-400" />
            VARLIKLARIM
          </h3>
          {selectedBank && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/35 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold text-sky-100">
              Kurum: {selectedBank}
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300/35 bg-indigo-500/15 px-3 py-1.5 text-[11px] font-semibold text-indigo-100">
              Kategori: {selectedCategory}
            </span>
          )}
          {(selectedBank || selectedCategory) && (
            <button
              type="button"
              onClick={() => onClearFilter?.()}
              className="inline-flex min-h-[44px] transform-gpu items-center gap-1.5 rounded-full border border-fuchsia-300/35 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25 px-3 py-1.5 text-xs font-semibold text-slate-50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg"
              title="Filtreleri temizle"
            >
              <X className="w-3.5 h-3.5" />
              Filtreyi Temizle (X)
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-slate-900/40 backdrop-blur-xl p-1">
          <button
            type="button"
            onClick={() => handleSortChange('totalValue')}
            className={`inline-flex min-h-[44px] transform-gpu items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg ${sortConfig.key === 'totalValue' ? 'bg-primary/22 text-slate-100' : 'text-slate-400 hover:bg-slate-800/60'}`}
            title="Toplam değere göre sırala"
          >
            Toplam Değer
            {sortConfig.key === 'totalValue' && (
              sortConfig.direction === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => handleSortChange('profit')}
            className={`inline-flex min-h-[44px] transform-gpu items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg ${sortConfig.key === 'profit' ? 'bg-emerald-500/20 text-emerald-100' : 'text-slate-400 hover:bg-slate-800/60'}`}
            title="Kâr/zarara göre sırala"
          >
            Kâr/Zarar
            {sortConfig.key === 'profit' && (
              sortConfig.direction === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div className="relative" onBlur={() => window.setTimeout(() => setIsReportMenuOpen(false), 120)}>
          <button
            type="button"
            onClick={() => setIsReportMenuOpen((prev) => !prev)}
            className="inline-flex min-h-[44px] transform-gpu items-center gap-2 rounded-md border border-purple-700 bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-purple-800 dark:border-fuchsia-300/35 dark:bg-gradient-to-r dark:from-violet-500/25 dark:to-fuchsia-500/25 dark:text-slate-50 dark:hover:from-violet-500/35 dark:hover:to-fuchsia-500/35"
            title="Rapor seçeneklerini aç"
            aria-haspopup="menu"
            aria-expanded={isReportMenuOpen}
          >
            <FileText className="h-3.5 w-3.5" />
            Rapor Al
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isReportMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isReportMenuOpen ? (
            <div className="absolute right-0 z-20 mt-1 min-w-[190px] overflow-hidden rounded-lg border border-white/5 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-xl" role="menu">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setIsReportMenuOpen(false);
                  onExportPdfReport?.();
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/10"
                role="menuitem"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-300" />
                PDF (Profesyonel)
              </button>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setIsReportMenuOpen(false);
                  onExportExcelReport?.();
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/10"
                role="menuitem"
              >
                <Download className="h-3.5 w-3.5 text-sky-300" />
                Excel (CSV)
              </button>
            </div>
          ) : null}
        </div>

        {lastUpdated ? (
          <span className="text-ui-body text-slate-500">
            Son: {lastUpdated.toLocaleTimeString('tr-TR')}
          </span>
        ) : null}
      </div>

      <div className="p-6 md:p-8 space-y-3">
        <div className="mb-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Varlık ara..."
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-ui-body text-slate-700 placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-400/60 dark:border-white/10 dark:bg-slate-900/35 dark:text-slate-100"
          />
        </div>

        <div className="-mx-1 overflow-x-auto pb-1">
          <div className="inline-flex min-w-full items-center gap-2 px-1">
            {categoryFilterOptions.map((category) => {
              const isActive = resolvedActiveCategory === category;
              const count = Number(categoryFilterCounts[category] || 0);
              const dotColor = getFilterDotColor(category);

              return (
                <button
                  key={`category-filter-${category}`}
                  type="button"
                  onClick={() => handleCategoryFilterSelect(category)}
                  className={`inline-flex min-h-[38px] items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${isActive
                    ? 'border-fuchsia-300/45 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_10px_26px_rgba(168,85,247,0.38)] hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg'
                    : 'border-slate-300/30 bg-slate-100 text-slate-700 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-slate-200/90 dark:border-slate-700/60 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80'}`}
                  title={`${category} filtresi`}
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
                  <span>{category}</span>
                  <span className={`${isActive ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'}`}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {showSkeleton ? (
          <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`portfolio-skeleton-${index}`} className="rounded-xl border border-white/10 bg-transparent p-4">
                <div className="skeleton-ui mb-3 h-3 w-40 rounded" />
                <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-center">
                  <div className="skeleton-ui h-4 w-32 rounded md:col-span-4" />
                  <div className="skeleton-ui h-4 w-44 rounded md:col-span-5" />
                  <div className="skeleton-ui h-4 w-24 rounded md:col-span-2 md:ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : groupedDisplayedPortfolio.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-slate-900/40 p-8 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-slate-800/60 text-slate-400">
              <Wallet className="h-6 w-6" />
            </div>
            <p className="mt-4 text-base font-semibold text-slate-100">Henüz birikim yolculuğuna başlamadın.</p>
            <p className="mt-1 text-sm text-slate-400">
              {resolvedActiveCategory !== 'Tümü'
                ? 'Bu kategori için henüz varlık görünmüyor.'
                : (searchedDisplayedPortfolio.length === 0 ? 'Aramana uygun varlık bulunamadı.' : 'İlk varlığını ekleyerek paneli canlandır.')}
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleEmptyCategoryAdd}
                className="inline-flex min-h-[44px] transform-gpu items-center gap-2 rounded-xl border border-fuchsia-300/40 bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(168,85,247,0.35)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg"
              >
                <Plus className="h-3.5 w-3.5" />
                İlk Varlığını Ekle
              </button>
            </div>
          </div>
        ) : (
          <div className="max-h-[62vh] overflow-y-auto pr-1">
            <div className="sticky top-0 z-20 grid grid-cols-12 gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-ui-body font-semibold uppercase tracking-[0.08em] text-slate-500 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-400 md:px-5">
              <div className="col-span-2">Kurum</div>
              <div className="col-span-2">Varlık</div>
              <div className="col-span-2">Kategori</div>
              <div className="col-span-2 text-right">Toplam Değer</div>
              <div className="col-span-2 text-right">K / Z</div>
              <div className="col-span-1 text-right">Portföy %</div>
              <div className="col-span-1 text-right">İşlemler</div>
            </div>

            <div className="mt-2 space-y-3">
          <AnimatePresence initial={false} mode="popLayout">
            {groupedDisplayedPortfolio.map((group) => {
              const groupProfitPercent = group.totalCost > 0 ? ((group.totalProfit / group.totalCost) * 100).toFixed(2) : '0.00';

              const portfolioKey = String(group.portfolioName || 'Genel Portföy');
              const isPortfolioOpen = openPortfolios[portfolioKey] ?? true;

              return (
                <motion.div
                  key={`portfolio-group-${portfolioKey}`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                >
                  <AssetGroup
                    group={group}
                    isOpen={isPortfolioOpen}
                    groupProfitPercent={groupProfitPercent}
                    onToggle={() => togglePortfolioAccordion(portfolioKey)}
                    onQuickAdd={() => onQuickAddPortfolio?.(portfolioKey)}
                    renderCurrency={renderCurrencyWithMutedSymbol}
                    isPrivacyActive={isPrivacyActive}
                    maskValue={maskValue}
                    >
                  <AnimatePresence initial={false} mode="popLayout">
                  {group.items.map(({ item, livePrice, activePrice, itemTotalValue, itemCost, itemProfit }) => {
                const categoryName = item.category || 'Diğer';
                const isCategorySelected = selectedCategory === categoryName;
                const isCashAsset = categoryName === 'Nakit' || categoryName === 'Nakit/Banka';
                const priceSymbol = String(item?.symbol || '').trim().toUpperCase();
                const unitPriceKey = getMarketPriceKey({ symbol: priceSymbol, unitType: item?.unitType || item?.unit_type });
                const unitPriceMeta = marketMeta?.[unitPriceKey];
                const symbolPriceMeta = marketMeta?.[priceSymbol];
                const resolvedPriceMeta = unitPriceMeta || symbolPriceMeta || null;
                const isCachedPrice = resolvedPriceMeta?.source === 'cache';
                const hasLivePrice = Number.isFinite(livePrice) && livePrice > 0;
                const isCostFallback = !hasLivePrice && !isCachedPrice;
                const cachedTimeLabel = Number.isFinite(Number(resolvedPriceMeta?.cachedAt))
                  ? `Saat ${new Date(Number(resolvedPriceMeta.cachedAt)).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} verisi`
                  : 'Piyasa Kapalı';
                const itemWeightPercent = totalValue > 0 ? ((itemTotalValue / totalValue) * 100).toFixed(1) : '0.0';
                const itemProfitPercent = itemCost > 0 ? ((itemProfit / itemCost) * 100).toFixed(2) : '0.00';
                const itemProfitSign = itemProfit >= 0 ? '+' : '-';
                const itemProfitSummary = `${itemProfitSign}${Math.abs(Number(itemProfitPercent)).toFixed(2)}% / ${itemProfitSign}${formatCurrencyPlain(Math.abs(itemProfit))}`;
                const inflationScore = getInflationScore(itemCost, itemProfit);
                const isExpanded = expandedAssetId === item.id;

                return (
            <motion.article
              key={item.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="group/asset overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 dark:border-white/5 dark:bg-slate-900/35 dark:backdrop-blur-xl transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div className="grid grid-cols-12 items-center gap-3 px-4 py-3 md:px-5">
                <div className="col-span-2 min-w-0 text-ui-body text-slate-500 dark:text-slate-400 truncate group-hover/asset:text-slate-700 dark:group-hover/asset:text-slate-200">
                  {item.bank || 'Banka Belirtilmedi'}
                </div>

                <div className="col-span-2 min-w-0 text-ui-body font-semibold text-slate-700 dark:text-slate-200 truncate group-hover/asset:text-slate-900 dark:group-hover/asset:text-slate-100">
                  {getAssetTitle(item)}
                </div>

                <div className="col-span-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => onSelectCategory?.(categoryName)}
                    style={getCategoryBadgeStyle(categoryName, isCategorySelected)}
                    className={`text-[11px] font-semibold uppercase tracking-[0.04em] rounded-full px-2.5 py-1 border transition-all cursor-pointer ${
                      isCategorySelected ? 'ring-1 ring-white/50 shadow-[0_0_12px_rgba(255,255,255,0.12)]' : 'hover:brightness-110'
                    }`}
                    title={`${categoryName} filtresi uygula`}
                  >
                    {categoryName}
                  </button>
                </div>

                <div className="col-span-2 text-right text-ui-body font-semibold font-mono text-slate-700 dark:text-slate-200 group-hover/asset:text-slate-900 dark:group-hover/asset:text-slate-100">
                  {renderCurrencyWithMutedSymbol(itemTotalValue)}
                </div>

                <div className={`col-span-2 text-right text-ui-body font-semibold font-mono ${itemProfit >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                  {renderMaskedText(itemProfitSummary)}
                </div>

                <div className="col-span-1 text-right text-ui-body font-semibold font-mono text-slate-500 dark:text-slate-300">
                  {renderMaskedText(`%${itemWeightPercent}`)}
                </div>

                <div className="col-span-1 flex justify-end items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openIncreaseModal(item, activePrice)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-500/15 text-emerald-100 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-emerald-500/25"
                    title="Hızlı Ekle"
                    aria-label="Hızlı Ekle"
                  >
                    <Plus className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue-300/30 bg-blue-500/10 text-blue-100 opacity-0 transition-all duration-200 group-hover/asset:opacity-100 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-blue-500/20"
                    title="Düzenle"
                    aria-label="Düzenle"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveAsset(item.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-300/30 bg-rose-500/10 text-rose-100 opacity-0 transition-all duration-200 group-hover/asset:opacity-100 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-rose-500/20"
                    title="Sil"
                    aria-label="Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAccordionToggle(item.id)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/5 bg-slate-900/40 backdrop-blur-xl transition-transform ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
                    title="Detayı aç"
                    aria-label="Detayı aç"
                  >
                    <ChevronDown className="h-4 w-4 text-slate-300" />
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isExpanded ? (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.26, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/10 px-4 py-4 md:px-5 md:py-5 space-y-4 bg-slate-900/35 backdrop-blur-xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        <div className="rounded-lg border border-white/5 bg-slate-900/40 backdrop-blur-xl px-3 py-2.5">
                          <p className="text-[11px] text-slate-500">Miktar</p>
                          <p className="text-sm font-semibold text-slate-200">{renderQuantity(item.amount)} {unitTypeToLabel(item.unitType || item.unit_type)}</p>
                        </div>
                        <div className="rounded-lg border border-white/5 bg-slate-900/40 backdrop-blur-xl px-3 py-2.5">
                          <p className="text-[11px] text-slate-500">Güncel Fiyat</p>
                          <p className={`text-sm font-semibold ${hasLivePrice ? 'text-blue-300' : (isCachedPrice ? 'text-amber-200' : 'text-slate-300')}`}>
                            {renderCurrencyWithMutedSymbol(activePrice)}
                          </p>
                          {isCachedPrice ? (
                            <p className="text-[11px] text-amber-300 mt-1">{cachedTimeLabel}</p>
                          ) : null}
                          {isCostFallback ? (
                            <p className="text-[11px] text-slate-500 mt-1">Maliyet fiyatı</p>
                          ) : null}
                        </div>
                        <div className="rounded-lg border border-white/5 bg-slate-900/40 backdrop-blur-xl px-3 py-2.5">
                          <p className="text-[11px] text-slate-500">Ortalama Maliyet</p>
                          <p className="text-sm font-semibold text-slate-200">{renderCurrencyWithMutedSymbol(item.avgPrice)}</p>
                        </div>
                        <div className="rounded-lg border border-white/5 bg-slate-900/40 backdrop-blur-xl px-3 py-2.5" title={inflationScore.tooltip}>
                          <p className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            Enflasyon Karnesi
                            <InfoTooltip content="Varlığınızın getirisinin ENAG enflasyonunun altında kaldığını gösterir." />
                          </p>
                          <div className="mt-1 inline-flex items-center gap-2">
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${inflationScore.isProtected ? 'border-emerald-300/50 bg-emerald-400/10' : 'border-rose-300/55 bg-rose-400/10'}`}>
                              {inflationScore.isProtected ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                              ) : (
                                <Flame className="h-4 w-4 text-rose-300" />
                              )}
                            </span>
                            <span className={`text-xs font-medium ${inflationScore.isProtected ? 'text-emerald-200' : 'text-rose-200'}`}>
                              {inflationScore.isProtected ? 'Alım gücü korunuyor' : 'Alım gücü eriyor'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-lg border border-white/5 bg-slate-900/40 backdrop-blur-xl px-3 py-2">
                          <p className="text-[11px] text-slate-500">Kâr / Zarar</p>
                          <p className={`text-sm font-semibold ${itemProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {itemProfit > 0 ? '+' : ''}{renderCurrencyWithMutedSymbol(itemProfit)}
                          </p>
                          <p className={`text-[11px] font-semibold ${itemProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {isPrivacyActive ? maskValue(`${itemProfit > 0 ? '+' : ''}${itemProfitPercent}%`) : `${itemProfit > 0 ? '+' : ''}${itemProfitPercent}%`}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/5 bg-slate-900/40 backdrop-blur-xl px-3 py-2">
                          <p className="text-[11px] text-slate-500">Portföy Payı</p>
                          <p className="text-sm font-semibold text-blue-300">{isPrivacyActive ? maskValue(`%${itemWeightPercent}`) : `%${itemWeightPercent}`}</p>
                          {isCashAsset ? (
                            <p className="text-[11px] text-cyan-200 mt-1">{getHesapDetayi(item)}</p>
                          ) : null}
                        </div>
                        <div className="rounded-lg border border-white/5 bg-slate-900/40 backdrop-blur-xl px-3 py-2">
                          <p className="text-[11px] text-slate-500">Kategori</p>
                          <button
                            type="button"
                            onClick={() => onSelectCategory?.(categoryName)}
                            style={getCategoryBadgeStyle(categoryName, isCategorySelected)}
                            className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.04em] rounded-full px-3 py-1.5 border transition-all cursor-pointer ${
                              isCategorySelected ? 'ring-1 ring-white/50 shadow-[0_0_12px_rgba(255,255,255,0.12)]' : 'hover:brightness-110'
                            }`}
                            title={`${categoryName} filtresi uygula`}
                          >
                            {categoryName}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onQuickBuyAsset?.(item)}
                          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-50 transform-gpu transition-transform duration-200 hover:scale-105 active:scale-95 hover:shadow-[0_0_24px_rgba(16,185,129,0.45)]"
                          title="Alım Kaydet"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Alım Kaydet</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openSellModal(item, activePrice)}
                          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500 px-3 py-1.5 text-xs font-semibold text-rose-50 transform-gpu transition-transform duration-200 hover:scale-105 active:scale-95 hover:shadow-[0_0_24px_rgba(244,63,94,0.45)]"
                          title="Satış Kaydet"
                        >
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>Satış Kaydet</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-2 rounded-lg text-slate-300 hover:text-blue-300 hover:bg-blue-400/10 transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAsset(item.id)}
                          className="p-2 rounded-lg text-slate-300 hover:text-rose-300 hover:bg-rose-400/10 transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.article>
                );
              })}
              </AnimatePresence>
                  </AssetGroup>
                </motion.div>
              );
            })}
          </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
    <AnimatePresence>
      {sellModalOpen && sellTarget ? (
        <motion.div
          key="sell-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 8, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-md rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-xl p-5 shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-rose-300" />
                  Satış Modu
                </h4>
                <p className="mt-0.5 text-[11px] text-slate-500">Parçalı satış işlemi</p>
                <p className="mt-1 text-xs text-slate-400">{sellTarget.bank || 'Banka Belirtilmedi'} • {sellTarget.symbol}</p>
              </div>
              <button
                type="button"
                onClick={closeSellModal}
                className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                title="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSellSubmit} className="mt-4 space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Satılacak Miktar</label>
                  <button
                    type="button"
                    onClick={() => setSellAmount(String(Number(sellTarget.amount || 0)))}
                    className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/25"
                  >
                    Tümünü Sat / MAX
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.00000001"
                  max={Number(sellTarget.amount || 0)}
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  placeholder={renderMaskedText(`Maks: ${formatNumericText(sellTarget.amount || 0)}`)}
                  required
                  className="w-full rounded-lg border border-white/5 bg-slate-900/40 backdrop-blur-xl p-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Satış Fiyatı (1 Lot)</label>
                <input
                  type="number"
                  min="0"
                  step="0.00000001"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="Örn: 125.45"
                  required
                  className="w-full rounded-lg border border-white/5 bg-slate-900/40 backdrop-blur-xl p-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="rounded-xl border border-sky-300/20 bg-sky-500/10 px-3 py-2.5 text-xs text-sky-100">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-200">Bilgi</p>
                <p className="mt-1 text-slate-200">
                  Satış sonrası kalan tahmini miktar: <span className="font-semibold">{renderQuantity(estimatedRemainingAmount)}</span>
                </p>
                <p className="mt-1 text-slate-200">
                  Bu satıştan gelecek toplam para: <span className="font-semibold">{Number.isFinite(estimatedTotalProceeds) ? renderCurrencyWithMutedSymbol(estimatedTotalProceeds) : '-'}</span>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeSellModal}
                  className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-ui-body text-slate-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
                  disabled={sellSubmitting}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="rounded-lg border border-emerald-300/35 bg-emerald-500 px-3 py-2 text-ui-body font-semibold text-emerald-50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-emerald-400 disabled:opacity-60"
                  disabled={sellSubmitting}
                >
                  {sellSubmitting ? 'Satılıyor...' : 'Satışı Onayla'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}

      {increaseModalOpen && increaseTarget ? (
        <motion.div
          key="increase-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 8, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 8, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-md rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-xl p-5 shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-emerald-300" />
                  Miktar Artır
                </h4>
                <p className="mt-1 text-xs text-slate-400">
                  {increaseTarget.bank || 'Banka Belirtilmedi'} • {increaseTarget.hesapTuru || 'Vadesiz'} • {increaseTarget.symbol}
                </p>
              </div>
              <button
                type="button"
                onClick={closeIncreaseModal}
                className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                title="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleIncreaseSubmit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Yeni Alınan Miktar</label>
                <input
                  type="number"
                  min="0"
                  step="0.00000001"
                  value={increaseAmount}
                  onChange={(e) => setIncreaseAmount(e.target.value)}
                  placeholder="Örn: 10"
                  required
                  className="w-full rounded-lg border border-white/5 bg-slate-900/40 backdrop-blur-xl p-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Alış Fiyatı</label>
                <input
                  type="number"
                  min="0"
                  step="0.00000001"
                  value={increasePrice}
                  onChange={(e) => setIncreasePrice(e.target.value)}
                  placeholder="Örn: 125.45"
                  required
                  className="w-full rounded-lg border border-white/5 bg-slate-900/40 backdrop-blur-xl p-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeIncreaseModal}
                  className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-ui-body text-slate-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-slate-100 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
                  disabled={increaseSubmitting}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="rounded-lg border border-emerald-300/35 bg-emerald-500 px-3 py-2 text-ui-body font-semibold text-emerald-50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-emerald-400 disabled:opacity-60"
                  disabled={increaseSubmitting}
                >
                  {increaseSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
    </>
  );
}

PortfolioTable.propTypes = {
  portfolio: PropTypes.arrayOf(PropTypes.object).isRequired,
  marketData: PropTypes.object,
  marketMeta: PropTypes.object,
  loading: PropTypes.bool,
  lastUpdated: PropTypes.instanceOf(Date),
  baseCurrency: PropTypes.string.isRequired,
  rates: PropTypes.object,
  totalValue: PropTypes.number.isRequired,
  selectedBank: PropTypes.string,
  otherBankNames: PropTypes.arrayOf(PropTypes.string),
  selectedCategory: PropTypes.string,
  activeCategory: PropTypes.string,
  setActiveCategory: PropTypes.func,
  onSelectCategory: PropTypes.func,
  sortConfig: PropTypes.shape({
    key: PropTypes.string,
    direction: PropTypes.string,
  }).isRequired,
  setSortConfig: PropTypes.func.isRequired,
  onClearFilter: PropTypes.func,
  onExportPdfReport: PropTypes.func,
  onExportExcelReport: PropTypes.func,
  openEditModal: PropTypes.func.isRequired,
  onQuickBuyAsset: PropTypes.func,
  onIncreaseAsset: PropTypes.func,
  onQuickAddPortfolio: PropTypes.func,
  handleSellAsset: PropTypes.func,
  handleRemoveAsset: PropTypes.func.isRequired,
};

PortfolioTable.defaultProps = {
  marketData: {},
  marketMeta: {},
  loading: false,
  lastUpdated: null,
  rates: {},
  selectedBank: null,
  otherBankNames: [],
  selectedCategory: null,
  activeCategory: 'Tümü',
  setActiveCategory: null,
  onSelectCategory: null,
  onClearFilter: null,
  onExportPdfReport: null,
  onExportExcelReport: null,
  onQuickBuyAsset: null,
  onIncreaseAsset: null,
  onQuickAddPortfolio: null,
  handleSellAsset: null,
};
