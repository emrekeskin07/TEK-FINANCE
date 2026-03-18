import { METAL_TICKERS } from '../services/api';

const UNIT_ALIASES = {
  g: 'gram',
  gr: 'gram',
  gram: 'gram',
  oz: 'ons',
  ons: 'ons',
  ozt: 'ons',
  lot: 'lot',
  adet: 'adet',
  piece: 'adet',
};

const UNIT_LABELS = {
  gram: 'gr',
  ons: 'ons',
  lot: 'lot',
  adet: 'Adet',
};

const METAL_SYMBOL_SET = new Set([...METAL_TICKERS, 'GRAM_ALTIN']);

const toSafeUpper = (value) => String(value || '').trim().toUpperCase();

export const isMetalSymbol = (symbol) => METAL_SYMBOL_SET.has(toSafeUpper(symbol));

export const normalizeUnitType = (unitType, fallback = 'adet') => {
  const normalized = String(unitType || '').trim().toLowerCase();
  if (normalized && UNIT_ALIASES[normalized]) {
    return UNIT_ALIASES[normalized];
  }

  const normalizedFallback = String(fallback || '').trim().toLowerCase();
  if (normalizedFallback && UNIT_ALIASES[normalizedFallback]) {
    return UNIT_ALIASES[normalizedFallback];
  }

  return 'adet';
};

export const unitTypeToLabel = (unitType) => {
  const normalized = normalizeUnitType(unitType);
  return UNIT_LABELS[normalized] || 'Adet';
};

export const getAllowedUnitTypes = ({ category, symbol }) => {
  const normalizedCategory = String(category || '').trim();
  const normalizedSymbol = toSafeUpper(symbol);

  if (normalizedCategory === 'Değerli Madenler' || normalizedCategory === 'Emtia/Altın' || normalizedCategory === 'Emtia') {
    if (normalizedSymbol === 'CEYREK_ALTIN') {
      return ['adet'];
    }

    if (isMetalSymbol(normalizedSymbol)) {
      return ['gram', 'ons'];
    }

    return ['adet'];
  }

  if (normalizedCategory === 'Hisse Senedi' || normalizedCategory === 'Yatırım Fonu') {
    return ['lot'];
  }

  return ['adet'];
};

export const inferDefaultUnitType = ({ category, symbol }) => {
  const unitOptions = getAllowedUnitTypes({ category, symbol });
  return unitOptions[0] || 'adet';
};

export const getMarketPriceKey = ({ symbol, unitType }) => {
  const normalizedSymbol = toSafeUpper(symbol);
  const baseSymbol = normalizedSymbol === 'GRAM_ALTIN' ? 'GC=F' : normalizedSymbol;

  if (!isMetalSymbol(baseSymbol)) {
    return normalizedSymbol;
  }

  const normalizedUnit = normalizeUnitType(
    unitType,
    normalizedSymbol === 'GRAM_ALTIN' ? 'gram' : 'ons'
  );
  const suffix = normalizedUnit === 'gram' ? 'GRAM' : 'ONS';

  return `${baseSymbol}__${suffix}`;
};

export const resolveAssetLivePrice = (asset, marketData) => {
  if (!asset || !marketData) {
    return null;
  }

  const symbol = toSafeUpper(asset.symbol);
  const unitType = asset.unitType || asset.unit_type;
  const unitKey = getMarketPriceKey({ symbol, unitType });

  const priceByUnit = Number(marketData?.[unitKey]);
  if (Number.isFinite(priceByUnit) && priceByUnit > 0) {
    return priceByUnit;
  }

  const priceBySymbol = Number(marketData?.[symbol]);
  if (Number.isFinite(priceBySymbol) && priceBySymbol > 0) {
    return priceBySymbol;
  }

  return null;
};

export const resolveAssetActivePrice = (asset, marketData) => {
  const livePrice = resolveAssetLivePrice(asset, marketData);
  if (Number.isFinite(livePrice)) {
    return livePrice;
  }

  const avgPrice = Number(asset?.avgPrice);
  return Number.isFinite(avgPrice) ? avgPrice : 0;
};
