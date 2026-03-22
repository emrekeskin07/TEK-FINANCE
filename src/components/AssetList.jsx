import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import PortfolioTable from './PortfolioTable';
import { useDashboardData } from '../context/DashboardContext';
import { resolveAssetLivePrice, unitTypeToLabel } from '../utils/assetPricing';
import { exportPortfolioReportExcelCsv, exportPortfolioReportPdf } from '../utils/reportExport';

export default function AssetList({ activeAssetCategory, setActiveAssetCategory }) {
  const {
    portfolio,
    marketData,
    marketChanges,
    marketMeta,
    loading,
    lastUpdated,
    baseCurrency,
    rates,
    totalValue,
    selectedInstitution,
    selectedBank,
    otherBankNames,
    selectedCategory,
    activeAssetCategory,
    handleCategorySelect,
    setActiveAssetCategory,
    sortConfig,
    setSortConfig,
    clearDashboardFilters,
    openEditModal,
    openAddModal,
    onQuickBuyAsset,
    onIncreaseAsset,
    onAnalyzeAssetDrop,
    onNavigateToGoalFromAsset,
    sellAsset,
    removeAsset,
  } = useDashboardData();

  const activeBankFilter = selectedInstitution || selectedBank;

  const reportData = useMemo(() => {
    const filteredAssets = (Array.isArray(portfolio) ? portfolio : []).filter((item) => {
      const bankName = item.bank || 'Banka Belirtilmedi';
      const categoryName = item.category || 'Diğer';
      const bankMatch = !activeBankFilter
        || (activeBankFilter === 'Diğer'
          ? otherBankNames.includes(bankName)
          : bankName === activeBankFilter);
      const categoryMatch = !selectedCategory || categoryName === selectedCategory;
      return bankMatch && categoryMatch;
    });

    const reportAssets = filteredAssets.map((item) => {
      const amount = Number(item.amount || 0);
      const avgPrice = Number(item.avgPrice || 0);
      const livePrice = resolveAssetLivePrice(item, marketData);
      const currentPrice = Number.isFinite(Number(livePrice)) ? Number(livePrice) : avgPrice;
      const totalValueForItem = currentPrice * amount;
      const totalCostForItem = avgPrice * amount;
      const profitForItem = totalValueForItem - totalCostForItem;

      return {
        bank: item.bank || 'Banka Belirtilmedi',
        name: item.name || item.symbol || '-',
        symbol: item.symbol || '-',
        category: item.category || 'Diğer',
        amount,
        amountLabel: `${amount.toLocaleString('tr-TR', { maximumFractionDigits: 8 })} ${unitTypeToLabel(item.unitType || item.unit_type)}`,
        avgPrice,
        currentPrice,
        totalValue: totalValueForItem,
        totalCost: totalCostForItem,
        profit: profitForItem,
      };
    });

    const distribution = reportAssets.reduce((acc, row) => {
      const key = row.bank || 'Banka Belirtilmedi';
      acc[key] = Number(acc[key] || 0) + Number(row.totalValue || 0);
      return acc;
    }, {});

    const summary = reportAssets.reduce((acc, row) => {
      acc.totalValue += Number(row.totalValue || 0);
      acc.totalCost += Number(row.totalCost || 0);
      acc.totalProfit += Number(row.profit || 0);
      return acc;
    }, {
      totalValue: 0,
      totalCost: 0,
      totalProfit: 0,
      profitPercentage: 0,
    });

    summary.profitPercentage = summary.totalCost > 0
      ? (summary.totalProfit / summary.totalCost) * 100
      : 0;

    return {
      assets: reportAssets,
      distribution,
      summary,
    };
  }, [portfolio, activeBankFilter, selectedCategory, marketData, otherBankNames]);

  const handleExportPdf = async () => {
    try {
      await exportPortfolioReportPdf({
        baseCurrency,
        rates,
        summary: reportData.summary,
        distribution: reportData.distribution,
        assets: reportData.assets,
      });
    } catch (error) {
      console.error('PDF raporu olusturulamadi:', error);
    }
  };

  const handleExportExcel = () => {
    exportPortfolioReportExcelCsv({
      baseCurrency,
      rates,
      summary: reportData.summary,
      distribution: reportData.distribution,
      assets: reportData.assets,
    });
  };

  return (
    <motion.section
      layout
      transition={{ type: 'spring', stiffness: 140, damping: 24 }}
      className="col-span-12 rounded-2xl border border-white/5 bg-slate-900/40 p-8 shadow-[0_24px_72px_rgba(2,6,23,0.62)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] hover:border-fuchsia-400/35"
    >
      <PortfolioTable
        portfolio={portfolio}
        marketData={marketData}
        marketChanges={marketChanges}
        marketMeta={marketMeta}
        loading={loading}
        lastUpdated={lastUpdated}
        baseCurrency={baseCurrency}
        rates={rates}
        totalValue={totalValue}
        selectedBank={activeBankFilter}
        otherBankNames={otherBankNames}
        selectedCategory={selectedCategory}
        activeCategory={activeAssetCategory}
        setActiveCategory={setActiveAssetCategory}
        onSelectCategory={handleCategorySelect}
        sortConfig={sortConfig}
        setSortConfig={setSortConfig}
        onClearFilter={clearDashboardFilters}
        onExportPdfReport={handleExportPdf}
        onExportExcelReport={handleExportExcel}
        openEditModal={openEditModal}
        onQuickBuyAsset={onQuickBuyAsset}
        onIncreaseAsset={onIncreaseAsset}
        onAnalyzeAssetDrop={onAnalyzeAssetDrop}
        onNavigateToGoalFromAsset={onNavigateToGoalFromAsset}
        onQuickAddPortfolio={(portfolioName) => openAddModal({ portfolioName, forcePrefill: true })}
        handleSellAsset={sellAsset}
        handleRemoveAsset={removeAsset}
      />
    </motion.section>
  );
}
