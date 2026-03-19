import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Coins, Edit2, Trash2, X, ChevronUp, ChevronDown, CheckCircle2, Flame, TrendingUp, TrendingDown, FileText, Download } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrencyParts, formatTickerName, groupAssetsByPortfolio } from '../utils/helpers';
import { getMarketPriceKey, resolveAssetLivePrice, unitTypeToLabel } from '../utils/assetPricing';
import { getCategoryBadgeStyle } from '../utils/categoryStyles';
import { calculateRealReturnPercent, getLatestAnnualInflationRate } from '../utils/financeMath';
import AssetGroup from './dashboard/AssetGroup';

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
  onSelectCategory,
  sortConfig,
  setSortConfig,
  onClearFilter,
  onExportPdfReport,
  onExportExcelReport,
  openEditModal,
  onQuickBuyAsset,
  onQuickAddPortfolio,
  handleSellAsset,
  handleRemoveAsset,
}) {
  const { isPrivacyActive, maskValue } = usePrivacy();
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

  const groupedDisplayedPortfolio = useMemo(
    () => groupAssetsByPortfolio(displayedPortfolio)
      .sort((a, b) => Number(b?.totalValue || 0) - Number(a?.totalValue || 0)),
    [displayedPortfolio]
  );

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
    <div className="bg-white/5 relative overflow-hidden backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-[1.01] hover:border-white/10 before:pointer-events-none before:absolute before:left-4 before:right-4 before:top-0 before:h-px before:bg-white/5 before:content-[''] after:pointer-events-none after:absolute after:top-4 after:bottom-4 after:left-0 after:w-px after:bg-white/5 after:content-[''] flex flex-col">
      <div className="p-6 md:p-8 border-b border-white/5 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-lg font-semibold flex items-center gap-2">
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
              className="inline-flex min-h-[44px] transform-gpu items-center gap-1.5 rounded-full border border-blue-300/40 bg-gradient-to-r from-blue-500/20 to-cyan-400/20 px-3 py-1.5 text-xs font-semibold text-blue-100 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-[0_0_18px_rgba(59,130,246,0.28)]"
              title="Filtreleri temizle"
            >
              <X className="w-3.5 h-3.5" />
              Filtreyi Temizle (X)
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => handleSortChange('totalValue')}
            className={`inline-flex min-h-[44px] transform-gpu items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${sortConfig.key === 'totalValue' ? 'bg-blue-500/20 text-blue-200' : 'text-slate-300 hover:bg-white/10'}`}
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
            className={`inline-flex min-h-[44px] transform-gpu items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${sortConfig.key === 'profit' ? 'bg-emerald-500/20 text-emerald-200' : 'text-slate-300 hover:bg-white/10'}`}
            title="Kâr/zarara göre sırala"
          >
            Kâr/Zarar
            {sortConfig.key === 'profit' && (
              sortConfig.direction === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => onExportPdfReport?.()}
            className="inline-flex min-h-[44px] transform-gpu items-center gap-1.5 rounded-md border border-emerald-300/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition-all duration-200 hover:scale-105 hover:bg-emerald-500/25 active:scale-95"
            title="PDF raporu indir"
          >
            <FileText className="h-3.5 w-3.5" />
            Rapor Al (PDF)
          </button>
          <button
            type="button"
            onClick={() => onExportExcelReport?.()}
            className="inline-flex min-h-[44px] transform-gpu items-center gap-1.5 rounded-md border border-sky-300/30 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-100 transition-all duration-200 hover:scale-105 hover:bg-sky-500/25 active:scale-95"
            title="Excel uyumlu CSV raporu indir"
          >
            <Download className="h-3.5 w-3.5" />
            Excel (CSV)
          </button>
        </div>

        {lastUpdated ? (
          <span className="text-xs text-slate-500">
            Son: {lastUpdated.toLocaleTimeString('tr-TR')}
          </span>
        ) : null}
      </div>

      <div className="p-6 md:p-8 space-y-3">
        {displayedPortfolio.length === 0 ? (
          <div className="p-6 rounded-xl border border-white/5 bg-white/5 text-center text-sm text-slate-500 shadow-2xl">
            {portfolio.length === 0
              ? 'Henüz bir varlık eklemediniz.'
              : 'Seçili filtreler için varlık bulunamadı.'}
          </div>
        ) : (
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
              className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => handleAccordionToggle(item.id)}
                className="w-full text-left px-4 py-3 md:px-5 md:py-4 hover:bg-white/[0.04] transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-3 md:gap-4">
                  <div className="md:col-span-4 min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400">Banka / Kurum</p>
                    <p className="text-sm font-semibold text-slate-200 truncate">{item.bank || 'Banka Belirtilmedi'}</p>
                  </div>
                  <div className="md:col-span-5 min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400">Varlık Adı</p>
                    <p className="text-sm font-semibold text-slate-100 truncate">{getAssetTitle(item)}</p>
                  </div>
                  <div className="md:col-span-2 md:text-right min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400">Toplam Değer</p>
                    <div className="text-sm font-bold text-slate-100">
                      {showSkeleton ? (
                        <div className="animate-pulse h-4 bg-white/10 rounded w-24 md:ml-auto" />
                      ) : (
                        renderCurrencyWithMutedSymbol(itemTotalValue)
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-1 flex md:justify-end">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/20 transition-transform ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                      <ChevronDown className="h-4 w-4 text-slate-300" />
                    </span>
                  </div>
                </div>
              </button>

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
                    <div className="border-t border-white/10 px-4 py-4 md:px-5 md:py-5 space-y-4 bg-black/10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2.5">
                          <p className="text-[11px] text-slate-500">Miktar</p>
                          <p className="text-sm font-semibold text-slate-200">{renderQuantity(item.amount)} {unitTypeToLabel(item.unitType || item.unit_type)}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2.5">
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
                        <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2.5">
                          <p className="text-[11px] text-slate-500">Ortalama Maliyet</p>
                          <p className="text-sm font-semibold text-slate-200">{renderCurrencyWithMutedSymbol(item.avgPrice)}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2.5" title={inflationScore.tooltip}>
                          <p className="text-[11px] text-slate-500">Enflasyon Karnesi</p>
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
                        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                          <p className="text-[11px] text-slate-500">Kâr / Zarar</p>
                          <p className={`text-sm font-semibold ${itemProfit >= 0 ? 'text-emerald-400' : 'text-[#FF3B6B]'}`}>
                            {itemProfit > 0 ? '+' : ''}{renderCurrencyWithMutedSymbol(itemProfit)}
                          </p>
                          <p className={`text-[11px] ${itemProfit >= 0 ? 'text-emerald-300' : 'text-[#FF3B6B]'}`}>
                            {isPrivacyActive ? maskValue(`${itemProfit > 0 ? '+' : ''}${itemProfitPercent}%`) : `${itemProfit > 0 ? '+' : ''}${itemProfitPercent}%`}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                          <p className="text-[11px] text-slate-500">Portföy Payı</p>
                          <p className="text-sm font-semibold text-blue-300">{isPrivacyActive ? maskValue(`%${itemWeightPercent}`) : `%${itemWeightPercent}`}</p>
                          {isCashAsset ? (
                            <p className="text-[11px] text-cyan-200 mt-1">{getHesapDetayi(item)}</p>
                          ) : null}
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
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
                          title="Al"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Al</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openSellModal(item, activePrice)}
                          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500 px-3 py-1.5 text-xs font-semibold text-rose-50 transform-gpu transition-transform duration-200 hover:scale-105 active:scale-95 hover:shadow-[0_0_24px_rgba(244,63,94,0.45)]"
                          title="Sat"
                        >
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>Sat</span>
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
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#161b22] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
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
                  className="w-full rounded-lg border border-white/10 bg-black/25 p-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
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
                  className="w-full rounded-lg border border-white/10 bg-black/25 p-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
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
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
                  disabled={sellSubmitting}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="rounded-lg border border-emerald-300/35 bg-emerald-500 px-3 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-400 disabled:opacity-60"
                  disabled={sellSubmitting}
                >
                  {sellSubmitting ? 'Satılıyor...' : 'Satışı Onayla'}
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
  onSelectCategory: null,
  onClearFilter: null,
  onExportPdfReport: null,
  onExportExcelReport: null,
  onQuickBuyAsset: null,
  onQuickAddPortfolio: null,
  handleSellAsset: null,
};