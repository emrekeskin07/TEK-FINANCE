import { useCallback, useMemo, useState } from 'react';
import { usePortfolioData } from './usePortfolioData';

const OTHER_THRESHOLD_PERCENT = 1;

export function useCalculations({
  portfolio,
  marketData,
  marketChanges,
  manualAssets,
  inflationSource,
}) {
  const [selectedBank, setSelectedBank] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const data = usePortfolioData({
    portfolio,
    marketData,
    marketChanges,
    manualAssets,
    inflationSource,
  });

  const otherBankNames = useMemo(() => {
    const entries = Object.entries(data?.bankTotals || {})
      .map(([name, value]) => ({ name, value: Number(value || 0) }))
      .filter((entry) => Number.isFinite(entry.value) && entry.value > 0);

    const total = entries.reduce((sum, entry) => sum + entry.value, 0);
    if (total <= 0) {
      return [];
    }

    return entries
      .filter((entry) => ((entry.value / total) * 100) < OTHER_THRESHOLD_PERCENT)
      .map((entry) => entry.name);
  }, [data?.bankTotals]);

  const handleBankSelect = useCallback((bankName) => {
    if (!bankName) {
      setSelectedBank(null);
      return;
    }

    setSelectedBank(bankName);
  }, []);

  const handleCategorySelect = useCallback((categoryName) => {
    setSelectedCategory((prevSelected) => (prevSelected === categoryName ? null : categoryName));
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedBank(null);
    setSelectedCategory(null);
  }, []);

  const filteredPortfolio = useMemo(() => (
    (Array.isArray(portfolio) ? portfolio : []).filter((item) => {
      const bankName = item.bank || 'Banka Belirtilmedi';
      const categoryName = item.category || 'Diğer';
      const bankMatch = !selectedBank
        || (selectedBank === 'Diğer'
          ? otherBankNames.includes(bankName)
          : bankName === selectedBank);
      const categoryMatch = !selectedCategory || categoryName === selectedCategory;

      return bankMatch && categoryMatch;
    })
  ), [portfolio, selectedBank, selectedCategory, otherBankNames]);

  return {
    ...data,
    selectedBank,
    selectedCategory,
    otherBankNames,
    filteredPortfolio,
    handleBankSelect,
    handleCategorySelect,
    clearFilters,
  };
}
