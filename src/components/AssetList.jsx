import React from 'react';
import { motion } from 'framer-motion';
import PortfolioTable from './PortfolioTable';
import { useDashboardData } from '../context/DashboardContext';

export default function AssetList() {
  const {
    portfolio,
    marketData,
    marketMeta,
    loading,
    lastUpdated,
    baseCurrency,
    rates,
    totalValue,
    selectedBank,
    selectedCategory,
    handleCategorySelect,
    sortConfig,
    setSortConfig,
    clearDashboardFilters,
    openEditModal,
    openAddModal,
    onQuickBuyAsset,
    sellAsset,
    removeAsset,
  } = useDashboardData();

  return (
    <motion.section
      layout
      transition={{ type: 'spring', stiffness: 140, damping: 24 }}
      className="col-span-12 md:col-span-9 md:order-4 rounded-2xl border border-white/5 bg-[#1A2232] p-6 shadow-2xl md:p-8"
    >
      <PortfolioTable
        portfolio={portfolio}
        marketData={marketData}
        marketMeta={marketMeta}
        loading={loading}
        lastUpdated={lastUpdated}
        baseCurrency={baseCurrency}
        rates={rates}
        totalValue={totalValue}
        selectedBank={selectedBank}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
        sortConfig={sortConfig}
        setSortConfig={setSortConfig}
        onClearFilter={clearDashboardFilters}
        openEditModal={openEditModal}
        onQuickBuyAsset={onQuickBuyAsset}
        onQuickAddPortfolio={(portfolioName) => openAddModal({ portfolioName, forcePrefill: true })}
        handleSellAsset={sellAsset}
        handleRemoveAsset={removeAsset}
      />
    </motion.section>
  );
}
