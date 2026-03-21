import { useState, useMemo } from 'react';
import { resolveAssetLivePrice } from '../utils/assetPricing';
import { getCategoryColor } from '../utils/categoryStyles';
import { formatTickerName, groupAssetsByPortfolio } from '../utils/helpers';

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

const getAssetTitle = (item) => {
  return String(item?.name || '').trim() || formatTickerName(item?.symbol);
};

export function usePortfolioTableLogic({
  data: portfolio = [],
  marketData = {},
  selectedBank,
  otherBankNames = [],
  selectedCategory,
  activeCategory: externalActiveCategory,
  setActiveCategory: externalSetActiveCategory,
  sortConfig: externalSortConfig,
  setSortConfig: externalSetSortConfig
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localActiveCategory, setLocalActiveCategory] = useState('Tümü');
  const [localSortConfig, setLocalSortConfig] = useState({ key: 'totalValue', direction: 'desc' });

  const activeCategory = externalActiveCategory !== undefined ? externalActiveCategory : localActiveCategory;
  const sortConfig = externalSortConfig || localSortConfig;

  const setActiveCategory = (nextCategory) => {
    if (typeof externalSetActiveCategory === 'function') {
      externalSetActiveCategory(nextCategory);
    } else {
      setLocalActiveCategory(nextCategory);
    }
  };

  const setSortConfig = (updater) => {
    if (typeof externalSetSortConfig === 'function') {
      externalSetSortConfig(updater);
    } else {
      setLocalSortConfig(updater);
    }
  };

  const handleCategoryFilterSelect = (nextCategory) => {
    setActiveCategory(nextCategory);
  };

  const filteredPortfolio = (Array.isArray(portfolio) ? portfolio : []).filter((item) => {
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
    if (activeCategory === 'Tümü') {
      return searchedDisplayedPortfolio;
    }

    return searchedDisplayedPortfolio.filter(({ item }) => mapCategoryToFilter(item?.category) === activeCategory);
  }, [searchedDisplayedPortfolio, activeCategory]);

  const groupedDisplayedPortfolio = useMemo(
    () => groupAssetsByPortfolio(categoryFilteredPortfolio)
      .sort((a, b) => Number(b?.totalValue || 0) - Number(a?.totalValue || 0)),
    [categoryFilteredPortfolio]
  );

  return {
    searchQuery,
    setSearchQuery,
    sortConfig,
    handleSort: handleSortChange,
    activeCategory,
    setActiveCategory,
    processedData: groupedDisplayedPortfolio,
    
    // Extracted things needed by Table and Controls
    filteredPortfolio,
    categoryFilteredPortfolio,
    searchedDisplayedPortfolio,
    categoryFilterCounts,
    categoryFilterOptions,
    handleCategoryFilterSelect,
    getFilterDotColor,
    getAssetTitle
  };
}
