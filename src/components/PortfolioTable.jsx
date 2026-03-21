import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Coins, Edit2, Trash2, X, ChevronUp, ChevronDown, CheckCircle2, Flame, TrendingUp, TrendingDown, FileText, Download, Plus, Wallet, House, CarFront, BriefcaseBusiness } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrencyParts, formatTickerName, groupAssetsByPortfolio } from '../utils/helpers';
import { getMarketPriceKey, resolveAssetLivePrice, unitTypeToLabel } from '../utils/assetPricing';
import { getCategoryBadgeStyle, getCategoryColor } from '../utils/categoryStyles';
import { calculateRealReturnPercent, getLatestAnnualInflationRate } from '../utils/financeMath';
import PortfolioTableRow from './Table/PortfolioTableRow';
import PortfolioTableControls from './Table/PortfolioTableControls';
import PortfolioTableHeader from './Table/PortfolioTableHeader';
import AssetGroup from './dashboard/AssetGroup';
import { usePortfolioTableLogic } from '../hooks/usePortfolioTableLogic';





export default function PortfolioTable({
  portfolio,
  marketData,
  marketChanges,
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
  onAnalyzeAssetDrop,
  onNavigateToGoalFromAsset,
  onQuickAddPortfolio,
  handleSellAsset,
  handleRemoveAsset,
}) {
  const { isPrivacyActive, maskValue } = usePrivacy();
  const {
    searchQuery,
    setSearchQuery,
    sortConfig: resolvedSortConfig,
    handleSort: handleSortChange,
    activeCategory: resolvedActiveCategory,
    processedData: groupedDisplayedPortfolio,
    
    filteredPortfolio,
    categoryFilteredPortfolio,
    searchedDisplayedPortfolio,
    categoryFilterCounts,
    categoryFilterOptions,
    handleCategoryFilterSelect,
    getFilterDotColor,
    getAssetTitle
  } = usePortfolioTableLogic({
    data: portfolio,
    marketData,
    selectedBank,
    otherBankNames,
    selectedCategory,
    activeCategory,
    setActiveCategory,
    sortConfig,
    setSortConfig
  });

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
      <PortfolioTableControls
        selectedBank={selectedBank}
        selectedCategory={selectedCategory}
        onClearFilter={onClearFilter}
        sortConfig={resolvedSortConfig}
        onSortChange={handleSortChange}
        onExportPdfReport={onExportPdfReport}
        onExportExcelReport={onExportExcelReport}
        lastUpdated={lastUpdated}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categoryFilterOptions={categoryFilterOptions}
        resolvedActiveCategory={resolvedActiveCategory}
        categoryFilterCounts={categoryFilterCounts}
        getFilterDotColor={getFilterDotColor}
        onCategorySelect={handleCategoryFilterSelect}
      />
      <div className="p-6 md:p-8 space-y-3 pt-4">

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
            <PortfolioTableHeader sortConfig={resolvedSortConfig} handleSort={handleSortChange} />

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
                    return (
                      <PortfolioTableRow
                        key={item.id}
                        item={item}
                        livePrice={livePrice}
                        activePrice={activePrice}
                        itemTotalValue={itemTotalValue}
                        itemCost={itemCost}
                        itemProfit={itemProfit}
                        selectedCategory={selectedCategory}
                        marketMeta={marketMeta}
                        totalValue={totalValue}
                        marketChanges={marketChanges}
                        expandedAssetId={expandedAssetId}
                        isPrivacyActive={isPrivacyActive}
                        maskValue={maskValue}
                        onNavigateToGoalFromAsset={onNavigateToGoalFromAsset}
                        onAnalyzeAssetDrop={onAnalyzeAssetDrop}
                        onSelectCategory={onSelectCategory}
                        onBuy={openIncreaseModal}
                        onSell={openSellModal}
                        onEdit={openEditModal}
                        onDelete={handleRemoveAsset}
                        onToggleAccordion={handleAccordionToggle}
                        onQuickBuyAsset={onQuickBuyAsset}
                        renderCurrencyWithMutedSymbol={renderCurrencyWithMutedSymbol}
                        renderQuantity={renderQuantity}
                        formatCurrencyPlain={formatCurrencyPlain}
                        getAssetTitle={getAssetTitle}
                      />
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
  marketChanges: PropTypes.object,
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
  onAnalyzeAssetDrop: PropTypes.func,
  onNavigateToGoalFromAsset: PropTypes.func,
  onQuickAddPortfolio: PropTypes.func,
  handleSellAsset: PropTypes.func,
  handleRemoveAsset: PropTypes.func.isRequired,
};

PortfolioTable.defaultProps = {
  marketData: {},
  marketChanges: {},
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
  onAnalyzeAssetDrop: null,
  onNavigateToGoalFromAsset: null,
  onQuickAddPortfolio: null,
  handleSellAsset: null,
};
