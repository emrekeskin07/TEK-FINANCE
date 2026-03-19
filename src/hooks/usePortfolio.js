import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import { inferDefaultUnitType, normalizeUnitType } from '../utils/assetPricing';

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

const toFiniteNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const calculateWeightedAverageCost = ({ existingAmount, existingCost, newAmount, newCost }) => {
  const safeExistingAmount = toFiniteNumber(existingAmount);
  const safeExistingCost = toFiniteNumber(existingCost);
  const safeNewAmount = toFiniteNumber(newAmount);
  const safeNewCost = toFiniteNumber(newCost);
  const totalAmount = safeExistingAmount + safeNewAmount;

  if (totalAmount <= 0) {
    return safeNewCost;
  }

  const weightedCost = ((safeExistingAmount * safeExistingCost) + (safeNewAmount * safeNewCost)) / totalAmount;
  return Number(weightedCost.toFixed(8));
};

const roundToEight = (value) => Number(toFiniteNumber(value).toFixed(8));

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
    const unitType = normalizeUnitType(
      asset.unit_type || asset.unitType,
      inferDefaultUnitType({ category, symbol })
    );

    return {
      id: asset.id,
      symbol,
      name: asset.name || symbol,
      category,
      amount,
      avgPrice,
      bank: bankName,
      hesapTuru,
      unitType,
      type: category === 'Yatırım Fonu' ? 'fund' : 'custom',
      // Supabase schema key aliases kept for update/inspect compatibility.
      cost: avgPrice,
      bank_name: bankName,
      hesap_turu: hesapTuru,
      unit_type: unitType,
    };
  }, []);

  const fetchPortfolio = useCallback(async () => {
    if (!supabase || !userId) {
      setPortfolio([]);
      onPortfolioChangeRef.current?.([]);
      return;
    }

    let { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase assets select hatasi:', error);
      toast.error('Portfoy Supabase uzerinden yuklenemedi.');
      return;
    }

    const normalized = sortAssetsClientSide(data || []).map(normalizeAsset);

    setPortfolio(normalized);
    onPortfolioChangeRef.current?.(normalized);
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
      name: formData.name || symbol,
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

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const addAsset = async (formData) => {
    if (!supabase || !userId) {
      toast.error('Supabase baglantisi hazir degil. .env degerlerini kontrol edin.');
      return;
    }

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
      return;
    }

    const existingAssetRow = sortAssetsClientSide(existingAssetQuery.data || [])[0] || null;

    if (existingAssetRow) {
      const existingAmount = toFiniteNumber(existingAssetRow.amount);
      const newAmount = toFiniteNumber(dbPayload.amount);
      const mergedAmount = existingAmount + newAmount;
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
        return;
      }

      const normalizedAsset = normalizeAsset(data || { ...existingAssetRow, ...mergedPayload, id: existingAssetRow.id });

      setPortfolio((prev) => {
        const index = prev.findIndex((item) => item.id === existingAssetRow.id);
        const updated = index >= 0
          ? prev.map((item) => (item.id === existingAssetRow.id ? normalizedAsset : item))
          : [...prev, normalizedAsset];
        onPortfolioChangeRef.current?.(updated);
        return updated;
      });

      toast.success(`${resolvedBank} - ${symbol} mevcut kayitla birlestirildi.`);
      return;
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
      return;
    }

    const normalizedAsset = normalizeAsset(data || dbPayload);

    setPortfolio((prev) => {
      const updated = [...prev, normalizedAsset];
      onPortfolioChangeRef.current?.(updated);
      return updated;
    });

    toast.success(`${resolvedBank} - ${symbol} basariyla eklendi!`);
  };

  const updateAsset = async (id, formData) => {
    if (!supabase || !userId) {
      toast.error('Supabase baglantisi hazir degil. .env degerlerini kontrol edin.');
      return;
    }

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
      return;
    }

    const normalizedAsset = normalizeAsset(data || { ...dbPayload, id });

    setPortfolio((prev) => {
      const updated = prev.map((item) => (item.id === id ? normalizedAsset : item));
      onPortfolioChangeRef.current?.(updated);
      return updated;
    });

    toast.success(`${resolvedBank} - ${symbol} basariyla guncellendi!`);
  };

  const removeAsset = async (id) => {
    if (!supabase || !userId) {
      toast.error('Supabase baglantisi hazir degil. .env degerlerini kontrol edin.');
      return;
    }

    const assetToDelete = portfolio.find((item) => item.id === id);

    const { error } = await supabase
      .from('assets')
      .delete()
      .match({ id, user_id: userId });

    if (error) {
      console.error('Supabase assets delete hatasi:', error);
      toast.error('Varlik silinemedi.');
      return;
    }

    setPortfolio((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      onPortfolioChangeRef.current?.(updated);
      return updated;
    });

    if (assetToDelete) {
      toast.success(`${assetToDelete.bank} - ${assetToDelete.symbol} silindi.`, {
        icon: '🗑️',
        style: { background: '#450a0a', color: '#fecdd3', border: '1px solid #9f1239' },
      });
    }
  };

  const sellAsset = useCallback(async ({ assetId, sellAmount, sellPrice }) => {
    if (!supabase || !userId) {
      toast.error('Supabase baglantisi hazir degil. .env degerlerini kontrol edin.');
      return false;
    }

    const safeSellAmount = toFiniteNumber(sellAmount);
    const safeSellPrice = toFiniteNumber(sellPrice);

    if (safeSellAmount <= 0 || safeSellPrice <= 0) {
      toast.error('Satis miktari ve satis fiyati sifirdan buyuk olmali.');
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
      return false;
    }

    const sourceAmount = toFiniteNumber(sourceAsset.amount);
    if (safeSellAmount > sourceAmount) {
      toast.error('Satilacak lot miktari mevcut miktardan buyuk olamaz.');
      return false;
    }

    const proceeds = roundToEight(safeSellAmount * safeSellPrice);
    const remainingAmount = roundToEight(sourceAmount - safeSellAmount);

    if (remainingAmount <= 0) {
      const { error: deleteError } = await supabase
        .from('assets')
        .delete()
        .match({ id: sourceAsset.id, user_id: userId });

      if (deleteError) {
        console.error('Supabase assets satis sonrasi silme hatasi:', deleteError);
        toast.error('Satis tamamlanamadi.');
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
      return false;
    }

    const targetCashRow = sortAssetsClientSide(cashRows || [])[0] || null;

    if (targetCashRow) {
      const existingCashAmount = toFiniteNumber(targetCashRow.amount);
      const mergedCashAmount = roundToEight(existingCashAmount + proceeds);
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
        return false;
      }
    }

    await fetchPortfolio();
    toast.success(`${sourceAsset.symbol} satildi. Gelir ${bankName} nakit hesabina aktarildi.`);
    return true;
  }, [fetchPortfolio, userId]);

  return { portfolio, addAsset, updateAsset, removeAsset, sellAsset, refreshPortfolio: fetchPortfolio };
};
