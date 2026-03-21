import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Flame, TrendingUp, TrendingDown, Edit2, Trash2, ChevronDown, House, CarFront, BriefcaseBusiness, Plus } from 'lucide-react';
import { getCategoryBadgeStyle } from '../../utils/categoryStyles';
import { getMarketPriceKey, unitTypeToLabel } from '../../utils/assetPricing';
import { formatTickerName } from '../../utils/helpers';
import { calculateRealReturnPercent, getLatestAnnualInflationRate } from '../../utils/financeMath';
import InfoTooltip from '../common/InfoTooltip';

const getLatestAnnualEnagRate = () => {
  try {
    const result = getLatestAnnualInflationRate({ source: 'enag' });
    return Number(result?.inflationRatePercent || 0);
  } catch {
    return 0;
  }
};

const LATEST_ANNUAL_ENAG_RATE = getLatestAnnualEnagRate();

export const getInflationScore = (itemCost, itemProfit) => {
  const nominalReturnPercent = itemCost > 0 ? ((itemProfit / itemCost) * 100) : 0;
  const realReturnPercent = calculateRealReturnPercent(nominalReturnPercent, LATEST_ANNUAL_ENAG_RATE);
  const isProtected = realReturnPercent >= 0;
  const tooltip = `Bu varlık enflasyona karşı alım gücünü %${Math.abs(realReturnPercent).toFixed(2)} ${isProtected ? 'korudu' : 'kaybetti'}.`;

  return {
    isProtected,
    tooltip,
  };
};

export const resolveGoalFromCategory = (category) => {
  const normalized = String(category || '').trim();
  if (normalized === 'Değerli Madenler' || normalized === 'Nakit/Banka') {
    return { key: 'ev', label: 'Ev', Icon: House };
  }
  if (normalized === 'Döviz') {
    return { key: 'araba', label: 'Araba', Icon: CarFront };
  }

  return { key: 'emeklilik', label: 'Emeklilik', Icon: BriefcaseBusiness };
};

export const getHesapDetayi = (item) => {
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

export default function PortfolioTableRow({
  item,
  livePrice,
  activePrice,
  itemTotalValue,
  itemCost,
  itemProfit,
  selectedCategory,
  marketMeta,
  totalValue,
  marketChanges,
  expandedAssetId,
  isPrivacyActive,
  maskValue,
  onNavigateToGoalFromAsset,
  onAnalyzeAssetDrop,
  onSelectCategory,
  onBuy,
  onSell,
  onEdit,
  onDelete,
  onToggleAccordion,
  renderCurrencyWithMutedSymbol,
  renderQuantity,
  formatCurrencyPlain,
  getAssetTitle
}) {
  const renderMaskedText = (text) => (isPrivacyActive ? maskValue(text) : text);

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
  const relation = resolveGoalFromCategory(categoryName);
  const dailyDropPercent = Number(marketChanges?.[item.symbol]);
  const shouldShowAiAnalyze = Number.isFinite(dailyDropPercent) && dailyDropPercent <= -5;

  return (
    <motion.article
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

        <div className="col-span-2 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-ui-body font-semibold text-slate-700 dark:text-slate-200 truncate group-hover/asset:text-slate-900 dark:group-hover/asset:text-slate-100">
              {getAssetTitle(item)}
            </span>
            <button
              type="button"
              onClick={() => onNavigateToGoalFromAsset?.(relation.key)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              title={`${relation.label} hedefine git`}
            >
              <relation.Icon className="h-3 w-3" />
              {relation.label}
            </button>
          </div>
          {shouldShowAiAnalyze ? (
            <button
              type="button"
              onClick={() => onAnalyzeAssetDrop?.({ asset: item, changePercent: dailyDropPercent })}
              className="mt-1 inline-flex items-center rounded-full border border-amber-300/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg"
            >
              AI Analyze (%{Math.abs(dailyDropPercent).toFixed(1)} düşüş)
            </button>
          ) : null}
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
            onClick={() => onBuy?.(item, activePrice)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-500/15 text-emerald-100 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-emerald-500/25"
            title="Hızlı Ekle"
            aria-label="Hızlı Ekle"
          >
            <Plus className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onEdit?.(item)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue-300/30 bg-blue-500/10 text-blue-100 opacity-0 transition-all duration-200 group-hover/asset:opacity-100 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-blue-500/20"
            title="Düzenle"
            aria-label="Düzenle"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete?.(item.id)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-300/30 bg-rose-500/10 text-rose-100 opacity-0 transition-all duration-200 group-hover/asset:opacity-100 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-rose-500/20"
            title="Sil"
            aria-label="Sil"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onToggleAccordion?.(item.id)}
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
                  onClick={() => onSell?.(item, activePrice)}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500 px-3 py-1.5 text-xs font-semibold text-rose-50 transform-gpu transition-transform duration-200 hover:scale-105 active:scale-95 hover:shadow-[0_0_24px_rgba(244,63,94,0.45)]"
                  title="Satış Kaydet"
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Satış Kaydet</span>
                </button>
                <button
                  type="button"
                  onClick={() => onEdit?.(item)}
                  className="p-2 rounded-lg text-slate-300 hover:text-blue-300 hover:bg-blue-400/10 transition-colors"
                  title="Düzenle"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete?.(item.id)}
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
}
