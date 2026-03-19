import { useCallback, useMemo, useState } from 'react';
import { usePortfolioData } from './usePortfolioData';

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

  const handleBankSelect = useCallback((bankName) => {
    setSelectedBank((prevSelected) => (prevSelected === bankName ? null : bankName));
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
      const bankMatch = !selectedBank || bankName === selectedBank;
      const categoryMatch = !selectedCategory || categoryName === selectedCategory;

      return bankMatch && categoryMatch;
    })
  ), [portfolio, selectedBank, selectedCategory]);

  return {
    ...data,
    selectedBank,
    selectedCategory,
    filteredPortfolio,
    handleBankSelect,
    handleCategorySelect,
    clearFilters,
  };
}
