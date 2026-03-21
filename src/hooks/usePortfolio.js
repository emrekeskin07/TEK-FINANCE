import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import { inferDefaultUnitType, normalizeUnitType } from '../utils/assetPricing';
import { resolveAssetName } from '../utils/helpers';
import {
  toFiniteNumber,
  roundToEight,
  calculateWeightedAverageCost,
  calculateMergedAmount,
  calculateSellSummary,
} from '../utils/financeUtils';
import { increaseAssetAmount } from '../services/api';

const CATEGORY_BY_TYPE = {
  stock: 'Hisse Senedi',
  currency: 'Döviz',
  gold: 'Değerli Madenler',
  crypto: 'Kripto',
  cash: 'Nakit/Banka',
  fund: 'Yatırım Fonu',
};
const DB_SELECT_COLUMNS_WITH_UNIT = 'id,symbol,name,category,amount,cost,bank_name,hesap_turu,unit_type';
const DB_SELECT_COLUMNS_LEGACY = 'id,symbol,name,category,amount,cost,bank_name,hesap_turu';
const CASH_SYMBOL = 'CASH_TRY';
const CASH_CATEGORY = 'Nakit/Banka';
const CASH_ACCOUNT_TYPE = 'Vadesiz';

const isUnitTypeSchemaError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const hint = String(error?.hint || '').toLowerCase();

  return message.includes('unit_type') || details.includes('unit_type') || hint.includes('unit_type');
};

const normalizeCategoryLabel = (category) => {
  if (category === 'Emtia/Altın' || category === 'Emtia') {
    return 'Değerli Madenler';
  }

  return category;
};

const sortAssetsClientSide = (rows = []) => rows.slice().sort((left, right) => {
  const leftCreatedAt = Date.parse(left?.created_at || '');
  const rightCreatedAt = Date.parse(right?.created_at || '');

  if (Number.isFinite(leftCreatedAt) && Number.isFinite(rightCreatedAt) && leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt - rightCreatedAt;
  }

  const leftId = Number(left?.id);
  const rightId = Number(right?.id);

  if (Number.isFinite(leftId) && Number.isFinite(rightId) && leftId !== rightId) {
    return leftId - rightId;
  }

  return 0;
});

const inferCategory = (asset = {}) => {
  if (asset.category) {
    return normalizeCategoryLabel(asset.category);
  }

  if (asset.type && CATEGORY_BY_TYPE[asset.type]) {
    return CATEGORY_BY_TYPE[asset.type];
  }

  const symbol = (asset.symbol || '').toUpperCase();
  if (symbol === 'TRY=X' || symbol === 'EURTRY=X' || symbol.endsWith('=X')) {
    return 'Döviz';
  }
  if (symbol === 'GRAM_ALTIN' || symbol === 'GC=F') {
    return 'Değerli Madenler';
  }
  if (symbol === 'SI=F' || symbol === 'PL=F' || symbol === 'PA=F') {
    return 'Değerli Madenler';
  }
  if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('USDT')) {
    return 'Kripto';
  }
  if (/^[A-Z]{3}$/.test(symbol)) {
    return 'Yatırım Fonu';
  }

  return 'Hisse Senedi';
};

export const usePortfolio = (userId, onPortfolioChange) => {
  const [portfolio, setPortfolio] = useState([]);
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(false);
  const [isPortfolioMutating, setIsPortfolioMutating] = useState(false);
  const onPortfolioChangeRef = useRef(onPortfolioChange);
  const supportsUnitTypeRef = useRef(true);

  useEffect(() => {
    onPortfolioChangeRef.current = onPortfolioChange;
  }, [onPortfolioChange]);

  const normalizeAsset = useCallback((asset = {}) => {
    const symbol = (asset.symbol || '').toUpperCase();
    const category = inferCategory(asset);
    const amount = toFiniteNumber(asset.amount);
    const avgPrice = toFiniteNumber(asset.cost);
    const bankName = asset.bank_name || asset.bank || 'Banka Belirtilmedi';
    const hesapTuru = asset.hesap_turu || asset.hesapTuru || null;
    const portfolioName = asset.portfolio_name || asset.portfolioName || 'Genel Portföy';
    const unitType = normalizeUnitType(
      asset.unit_type || asset.unitType,
      inferDefaultUnitType({ category, symbol })
    );

    return {
      id: asset.id,
      symbol,
      name: resolveAssetName({ symbol, name: asset.name }),
      category,
      amount,
      avgPrice,
      bank: bankName,
      hesapTuru,
      portfolioName,
      unitType,
      createdAt: asset.created_at || asset.createdAt || null,
      type: category === 'Yatırım Fonu' ? 'fund' : 'custom',
      // Supabase schema key aliases kept for update/inspect compatibility.
      cost: avgPrice,
      bank_name: bankName,
      hesap_turu: hesapTuru,
      portfolio_name: portfolioName,
      unit_type: unitType,
    };
  }, []);

  const fetchPortfolio = useCallback(async () => {
    if (!supabase || !userId) {
      setPortfolio([]);
      onPortfolioChangeRef.current?.([]);
      return;
    }

    setIsPortfolioLoading(true);

    let { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase assets select hatasi:', error);
      toast.error('Portfoy Supabase uzerinden yuklenemedi.');
      setIsPortfolioLoading(false);
      return;
    }

    const normalized = sortAssetsClientSide(data || []).map(normalizeAsset);

    setPortfolio(normalized);
    onPortfolioChangeRef.current?.(normalized);
    setIsPortfolioLoading(false);
  }, [normalizeAsset, userId]);

  const buildDbPayload = useCallback((formData, resolvedBank, normalizedCategory, isCashAsset) => {
    const symbol = (formData.symbol || '').toUpperCase();
    const amount = toFiniteNumber(formData.amount);
    const cost = toFiniteNumber(formData.avgPrice);
    const hesapTuru = formData.hesapTuru || (isCashAsset ? 'Vadesiz' : null);
    const unitType = normalizeUnitType(
      formData.unitType,
      inferDefaultUnitType({ category: normalizedCategory, symbol })
    );

    const payload = {
      user_id: userId,
      symbol,
      name: resolveAssetName({ symbol, name: formData.name }),
      category: normalizedCategory,
      amount,
      cost,
      bank_name: resolvedBank,
      hesap_turu: hesapTuru,
    };

    if (supportsUnitTypeRef.current) {
      payload.unit_type = unitType;
    }

    return payload;
  }, [userId]);

  const logTransaction = useCallback(async (entry = {}) => {
    if (!supabase || !userId) {
      return;
    }

    const payload = {
      user_id: userId,
      asset_id: Number.isFinite(Number(entry.assetId)) ? Number(entry.assetId) : null,
      action: String(entry.action || 'update').trim().toLowerCase(),
      symbol: String(entry.symbol || '').trim() || null,
      name: String(entry.name || '').trim() || null,
      category: String(entry.category || '').trim() || null,
      bank_name: String(entry.bankName || '').trim() || null,
      quantity: Number.isFinite(Number(entry.quantity)) ? Number(entry.quantity) : null,
      unit_price: Number.isFinite(Number(entry.unitPrice)) ? Number(entry.unitPrice) : null,
      total_value: Number.isFinite(Number(entry.totalValue)) ? Number(entry.totalValue) : null,
      details: entry.details && typeof entry.details === 'object' ? entry.details : {},
    };

    const { error } = await supabase
      .from('transaction_log')
      .insert([payload]);

    if (error) {
      console.warn('transaction_log insert skipped:', error?.message || error);
    }
  }, [userId]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const addAsset = async (formData) => {
    if (!supabase || !userId) {
      toast.error('Supabase baglantisi hazir degil. .env degerlerini kontrol edin.');
      return false;
    }

    setIsPortfolioMutating(true);

    const newBank = formData.bank || 'Banka Belirtilmedi';
    const normalizedCategory = formData.category || inferCategory(formData);
    const isCashAsset = normalizedCategory === 'Nakit' || normalizedCategory === 'Nakit/Banka';
    const isCommodityAsset = normalizedCategory === 'Değerli Madenler' || normalizedCategory === 'Emtia/Altın' || normalizedCategory === 'Emtia';
    const saklamaTuru = isCommodityAsset ? (formData.saklamaTuru || 'Banka') : null;
    const resolvedBank = isCommodityAsset && saklamaTuru === 'Fiziksel/Evde' ? 'Fiziksel/Evde' : newBank;

    const symbol = (formData.symbol || '').toUpperCase();
    const dbPayload = buildDbPayload(
      formData,
      resolvedBank,
      normalizedCategory,
      isCashAsset
    );

    const existingAssetQuery = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .eq('bank_name', resolvedBank)
      .eq('symbol', symbol);

    if (existingAssetQuery.error) {
      console.error('Supabase assets existing kontrol hatasi:', existingAssetQuery.error);
      toast.error('Varlik kontrolu yapilamadi.');
      setIsPortfolioMutating(false);
      return false;
    }

    const existingAssetRow = sortAssetsClientSide(existingAssetQuery.data || [])[0] || null;

    if (existingAssetRow) {
      const existingAmount = toFiniteNumber(existingAssetRow.amount);
      const newAmount = toFiniteNumber(dbPayload.amount);
      const mergedAmount = calculateMergedAmount({
        existingAmount,
        incomingAmount: newAmount,
      });
      const mergedCost = calculateWeightedAverageCost({
        existingAmount,
        existingCost: existingAssetRow.cost,
        newAmount,
        newCost: dbPayload.cost,
      });

      const mergedPayload = {
        ...dbPayload,
        amount: mergedAmount,
        cost: mergedCost,
      };

      let { data, error } = await supabase
        .from('assets')
        .update(mergedPayload)
        .eq('id', existingAssetRow.id)
        .eq('user_id', userId)
        .select(supportsUnitTypeRef.current ? DB_SELECT_COLUMNS_WITH_UNIT : DB_SELECT_COLUMNS_LEGACY)
        .single();

      if (error && supportsUnitTypeRef.current && isUnitTypeSchemaError(error)) {
        supportsUnitTypeRef.current = false;

        const legacyPayload = { ...mergedPayload };
        delete legacyPayload.unit_type;

        const fallbackResult = await supabase
          .from('assets')
          .update(legacyPayload)
          .eq('id', existingAssetRow.id)
          .eq('user_id', userId)
          .select(DB_SELECT_COLUMNS_LEGACY)
          .single();

        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) {
        console.error('Supabase assets merge update hatasi:', error);
        toast.error('Mevcut varlik guncellenemedi.');
        setIsPortfolioMutating(false);
        return false;
      }

      const normalizedAsset = normalizeAsset({
        ...(data || { ...existingAssetRow, ...mergedPayload, id: existingAssetRow.id }),
        portfolioName: formData.portfolioName,
      });

      setPortfolio((prev) => {
        const index = prev.findIndex((item) => item.id === existingAssetRow.id);
        const updated = index >= 0
          ? prev.map((item) => (item.id === existingAssetRow.id ? normalizedAsset : item))
          : [...prev, normalizedAsset];
        onPortfolioChangeRef.current?.(updated);
        return updated;
      });

      await logTransaction({
        action: 'buy',
        assetId: existingAssetRow.id,
        symbol,
        name: dbPayload.name,
        category: normalizedCategory,
        bankName: resolvedBank,
        quantity: toFiniteNumber(dbPayload.amount),
        unitPrice: toFiniteNumber(dbPayload.cost),
        totalValue: toFiniteNumber(dbPayload.amount) * toFiniteNumber(dbPayload.cost),
        details: {
          mode: 'merge-existing',
          resultingAmount: mergedAmount,
          resultingAverageCost: mergedCost,
        },
      });

      toast.success(`✅ ${resolveAssetName({ symbol, name: dbPayload.name })} varlığı başarıyla portföyüne eklendi.`, {
        style: { background: '#052e16', color: '#dcfce7', border: '1px solid #166534' },
      });
      setIsPortfolioMutating(false);
      return true;
    }

    let { data, error } = await supabase
      .from('assets')
      .insert([dbPayload])
      .select(supportsUnitTypeRef.current ? DB_SELECT_COLUMNS_WITH_UNIT : DB_SELECT_COLUMNS_LEGACY)
      .single();

    if (error && supportsUnitTypeRef.current && isUnitTypeSchemaError(error)) {
      supportsUnitTypeRef.current = false;

      const legacyPayload = { ...dbPayload };
      delete legacyPayload.unit_type;

      const fallbackResult = await supabase
        .from('assets')
        .insert([legacyPayload])
        .select(DB_SELECT_COLUMNS_LEGACY)
        .single();

      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      console.error('Supabase assets insert hatasi:', error);
      toast.error('Varlik eklenemedi.');
      setIsPortfolioMutating(false);
      return false;
    }

    const normalizedAsset = normalizeAsset({ ...(data || dbPayload), portfolioName: formData.portfolioName });

    setPortfolio((prev) => {
      const updated = [...prev, normalizedAsset];
      onPortfolioChangeRef.current?.(updated);
      return updated;
    });

    await logTransaction({
      action: 'buy',
      assetId: normalizedAsset.id,
      symbol,
      name: dbPayload.name,
      category: normalizedCategory,
      bankName: resolvedBank,
      quantity: toFiniteNumber(dbPayload.amount),
      unitPrice: toFiniteNumber(dbPayload.cost),
      totalValue: toFiniteNumber(dbPayload.amount) * toFiniteNumber(dbPayload.cost),
      details: {
        mode: 'new-position',
      },
    });

    toast.success(`✅ ${resolveAssetName({ symbol, name: dbPayload.name })} varlığı başarıyla portföyüne eklendi.`, {
      style: { background: '#052e16', color: '#dcfce7', border: '1px solid #166534' },
    });
    setIsPortfolioMutating(false);
    return true;
  };

  const updateAsset = async (id, formData) => {
    if (!supabase || !userId) {
      toast.error('Supabase baglantisi hazir degil. .env degerlerini kontrol edin.');
      return false;
    }

    setIsPortfolioMutating(true);

    const newBank = formData.bank || 'Banka Belirtilmedi';
    const normalizedCategory = formData.category || inferCategory(formData);
    const isCashAsset = normalizedCategory === 'Nakit' || normalizedCategory === 'Nakit/Banka';
    const isCommodityAsset = normalizedCategory === 'Değerli Madenler' || normalizedCategory === 'Emtia/Altın' || normalizedCategory === 'Emtia';
    const saklamaTuru = isCommodityAsset ? (formData.saklamaTuru || 'Banka') : null;
    const resolvedBank = isCommodityAsset && saklamaTuru === 'Fiziksel/Evde' ? 'Fiziksel/Evde' : newBank;

    const symbol = (formData.symbol || '').toUpperCase();
    const dbPayload = buildDbPayload(
      formData,
      resolvedBank,
      normalizedCategory,
      isCashAsset
    );

    let { data, error } = await supabase
      .from('assets')
      .update(dbPayload)
      .eq('id', id)
      .eq('user_id', userId)
      .select(supportsUnitTypeRef.current ? DB_SELECT_COLUMNS_WITH_UNIT : DB_SELECT_COLUMNS_LEGACY)
      .single();

    if (error && supportsUnitTypeRef.current && isUnitTypeSchemaError(error)) {
      supportsUnitTypeRef.current = false;

      const legacyPayload = { ...dbPayload };
      delete legacyPayload.unit_type;

      const fallbackResult = await supabase
        .from('assets')
        .update(legacyPayload)
        .eq('id', id)
        .eq('user_id', userId)
        .select(DB_SELECT_COLUMNS_LEGACY)
        .single();

      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      console.error('Supabase assets update hatasi:', error);
      toast.error('Varlik guncellenemedi.');
      setIsPortfolioMutating(false);
      return false;
    }

    const normalizedAsset = normalizeAsset({ ...(data || { ...dbPayload, id }), portfolioName: formData.portfolioName });

    setPortfolio((prev) => {
      const updated = prev.map((item) => (item.id === id ? normalizedAsset : item));
      onPortfolioChangeRef.current?.(updated);
      return updated;
    });

    await logTransaction({
      action: 'update',
      assetId: id,
      symbol,
      name: dbPayload.name,
      category: normalizedCategory,
      bankName: resolvedBank,
      quantity: toFiniteNumber(dbPayload.amount),
      unitPrice: toFiniteNumber(dbPayload.cost),
      totalValue: toFiniteNumber(dbPayload.amount) * toFiniteNumber(dbPayload.cost),
      details: {
        mode: 'manual-edit',
      },
    });

    toast.success(`${resolvedBank} - ${symbol} basariyla guncellendi!`);
    setIsPortfolioMutating(false);
    return true;
  };

  const removeAsset = async (id) => {
    if (!supabase || !userId) {
      toast.error('Supabase baglantisi hazir degil. .env degerlerini kontrol edin.');
      return false;
    }

    setIsPortfolioMutating(true);

    const assetToDelete = portfolio.find((item) => item.id === id);

    const { error } = await supabase
      .from('assets')
      .delete()
      .match({ id, user_id: userId });

    if (error) {
      console.error('Supabase assets delete hatasi:', error);
      toast.error('Varlik silinemedi.');
      setIsPortfolioMutating(false);
      return false;
    }

    setPortfolio((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      onPortfolioChangeRef.current?.(updated);
      return updated;
    });

    if (assetToDelete) {
      await logTransaction({
        action: 'delete',
        assetId: id,
        symbol: assetToDelete.symbol,
        name: assetToDelete.name,
        category: assetToDelete.category,
        bankName: assetToDelete.bank,
        quantity: toFiniteNumber(assetToDelete.amount),
        unitPrice: toFiniteNumber(assetToDelete.avgPrice),
        totalValue: toFiniteNumber(assetToDelete.amount) * toFiniteNumber(assetToDelete.avgPrice),
        details: {
          mode: 'position-removed',
        },
      });
    }

    if (assetToDelete) {
      toast.success(`✅ ${resolveAssetName(assetToDelete)} varlığı portföyünden kaldırıldı.`, {
        style: { background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' },
      });
    }

    setIsPortfolioMutating(false);
    return true;
  };

  const sellAsset = useCallback(async ({ assetId, sellAmount, sellPrice }) => {
    if (!supabase || !userId) {
      toast.error('Supabase baglantisi hazir degil. .env degerlerini kontrol edin.');
      return false;
    }

    setIsPortfolioMutating(true);

    const safeSellAmount = toFiniteNumber(sellAmount);
    const safeSellPrice = toFiniteNumber(sellPrice);

    if (safeSellAmount <= 0 || safeSellPrice <= 0) {
      toast.error('Satis miktari ve satis fiyati sifirdan buyuk olmali.');
      setIsPortfolioMutating(false);
      return false;
    }

    const { data: sourceAsset, error: sourceAssetError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .eq('user_id', userId)
      .maybeSingle();

    if (sourceAssetError || !sourceAsset) {
      console.error('Supabase assets satis kaynak kaydi okunamadi:', sourceAssetError);
      toast.error('Satilacak varlik bulunamadi.');
      setIsPortfolioMutating(false);
      return false;
    }

    const sourceAmount = toFiniteNumber(sourceAsset.amount);
    if (safeSellAmount > sourceAmount) {
      toast.error('Satilacak lot miktari mevcut miktardan buyuk olamaz.');
      setIsPortfolioMutating(false);
      return false;
    }

    const { proceeds, remainingAmount } = calculateSellSummary({
      sourceAmount,
      sellAmount: safeSellAmount,
      sellPrice: safeSellPrice,
    });

    if (remainingAmount <= 0) {
      const { error: deleteError } = await supabase
        .from('assets')
        .delete()
        .match({ id: sourceAsset.id, user_id: userId });

      if (deleteError) {
        console.error('Supabase assets satis sonrasi silme hatasi:', deleteError);
        toast.error('Satis tamamlanamadi.');
        setIsPortfolioMutating(false);
        return false;
      }
    } else {
      const { error: amountUpdateError } = await supabase
        .from('assets')
        .update({ amount: remainingAmount })
        .eq('id', sourceAsset.id)
        .eq('user_id', userId);

      if (amountUpdateError) {
        console.error('Supabase assets satis miktar guncelleme hatasi:', amountUpdateError);
        toast.error('Satis miktari guncellenemedi.');
        setIsPortfolioMutating(false);
        return false;
      }
    }

    const bankName = sourceAsset.bank_name || 'Banka Belirtilmedi';
    const { data: cashRows, error: cashSelectError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId)
      .eq('bank_name', bankName)
      .in('category', ['Nakit/Banka', 'Nakit']);

    if (cashSelectError) {
      console.error('Supabase assets nakit hesap arama hatasi:', cashSelectError);
      toast.error('Nakit hesaba aktarim yapilamadi.');
      await fetchPortfolio();
      setIsPortfolioMutating(false);
      return false;
    }

    const targetCashRow = sortAssetsClientSide(cashRows || [])[0] || null;

    if (targetCashRow) {
      const existingCashAmount = toFiniteNumber(targetCashRow.amount);
      const mergedCashAmount = calculateMergedAmount({
        existingAmount: existingCashAmount,
        incomingAmount: proceeds,
      });
      const mergedCashCost = calculateWeightedAverageCost({
        existingAmount: existingCashAmount,
        existingCost: targetCashRow.cost,
        newAmount: proceeds,
        newCost: 1,
      });

      const { error: cashUpdateError } = await supabase
        .from('assets')
        .update({
          amount: mergedCashAmount,
          cost: mergedCashCost,
          hesap_turu: targetCashRow.hesap_turu || CASH_ACCOUNT_TYPE,
        })
        .eq('id', targetCashRow.id)
        .eq('user_id', userId);

      if (cashUpdateError) {
        console.error('Supabase assets nakit hesap update hatasi:', cashUpdateError);
        toast.error('Satis gerceklesti ancak nakit hesaba aktarim yapilamadi.');
        await fetchPortfolio();
        setIsPortfolioMutating(false);
        return false;
      }
    } else {
      const cashPayload = {
        user_id: userId,
        symbol: CASH_SYMBOL,
        name: 'Vadesiz Nakit',
        category: CASH_CATEGORY,
        amount: proceeds,
        cost: 1,
        bank_name: bankName,
        hesap_turu: CASH_ACCOUNT_TYPE,
        unit_type: 'adet',
      };

      let { error: cashInsertError } = await supabase
        .from('assets')
        .insert([
          supportsUnitTypeRef.current
            ? cashPayload
            : (() => {
                const legacyPayload = { ...cashPayload };
                delete legacyPayload.unit_type;
                return legacyPayload;
              })()
        ]);

      if (cashInsertError && supportsUnitTypeRef.current && isUnitTypeSchemaError(cashInsertError)) {
        supportsUnitTypeRef.current = false;
        const legacyCashPayload = { ...cashPayload };
        delete legacyCashPayload.unit_type;

        const fallbackInsert = await supabase
          .from('assets')
          .insert([legacyCashPayload]);

        cashInsertError = fallbackInsert.error;
      }

      if (cashInsertError) {
        console.error('Supabase assets nakit hesap insert hatasi:', cashInsertError);
        toast.error('Satis gerceklesti ancak nakit hesap olusturulamadi.');
        await fetchPortfolio();
        setIsPortfolioMutating(false);
        return false;
      }
    }

    await fetchPortfolio();

    await logTransaction({
      action: 'sell',
      assetId: sourceAsset.id,
      symbol: sourceAsset.symbol,
      name: sourceAsset.name,
      category: sourceAsset.category,
      bankName,
      quantity: safeSellAmount,
      unitPrice: safeSellPrice,
      totalValue: proceeds,
      details: {
        remainingAmount,
        transferredToCash: true,
      },
    });

    toast.success(`✅ ${resolveAssetName(sourceAsset)} satışı tamamlandı. Gelir ${bankName} nakit hesabına aktarıldı.`, {
      style: { background: '#052e16', color: '#dcfce7', border: '1px solid #166534' },
    });
    setIsPortfolioMutating(false);
    return true;
  }, [fetchPortfolio, userId, logTransaction]);

  const increaseAssetHolding = useCallback(async ({ assetId, addedAmount, buyPrice }) => {
    if (!userId) {
      toast.error('Kullanici oturumu bulunamadi.');
      return false;
    }

    setIsPortfolioMutating(true);

    try {
      await increaseAssetAmount({
        userId,
        assetId,
        addedAmount,
        buyPrice,
      });

      await fetchPortfolio();

      const sourceAsset = (Array.isArray(portfolio) ? portfolio : []).find((item) => Number(item?.id) === Number(assetId));

      await logTransaction({
        action: 'buy',
        assetId,
        symbol: sourceAsset?.symbol,
        name: sourceAsset?.name,
        category: sourceAsset?.category,
        bankName: sourceAsset?.bank,
        quantity: toFiniteNumber(addedAmount),
        unitPrice: toFiniteNumber(buyPrice),
        totalValue: toFiniteNumber(addedAmount) * toFiniteNumber(buyPrice),
        details: {
          mode: 'increase-position',
        },
      });

      toast.success('Miktar artırıldı, ortalama maliyet güncellendi.');
      setIsPortfolioMutating(false);
      return true;
    } catch (error) {
      toast.error(error?.message || 'Miktar artırma işlemi başarısız.');
      setIsPortfolioMutating(false);
      return false;
    }
  }, [fetchPortfolio, userId, portfolio, logTransaction]);

  return {
    portfolio,
    isPortfolioLoading,
    isPortfolioMutating,
    addAsset,
    updateAsset,
    removeAsset,
    sellAsset,
    increaseAssetHolding,
    refreshPortfolio: fetchPortfolio,
  };
};
