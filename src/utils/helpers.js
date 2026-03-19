export const convertCurrency = (value, baseCurrency, rates) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  const normalizedCurrency = String(baseCurrency || 'TRY').toUpperCase();
  if (normalizedCurrency === 'TRY') {
    return numericValue;
  }

  const exchangeRate = Number(rates?.[normalizedCurrency]);
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    return numericValue;
  }

  return numericValue / exchangeRate;
};

const formatterCache = new Map();
const ASSET_SYMBOL_NAME_MAP = {
  'SI=F': 'Gümüş',
  'GC=F': 'Altın',
  GRAM_ALTIN: 'Gram Altın',
  'PL=F': 'Platin',
  'PA=F': 'Paladyum',
  'TUPRS.IS': 'Tüpraş',
};

const getCurrencyFormatter = (baseCurrency) => {
  const normalizedCurrency = String(baseCurrency || 'TRY').toUpperCase();
  if (!formatterCache.has(normalizedCurrency)) {
    formatterCache.set(normalizedCurrency, new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: normalizedCurrency,
    }));
  }

  return formatterCache.get(normalizedCurrency);
};

export const formatCurrency = (value, baseCurrency, rates) => {
  const converted = convertCurrency(value, baseCurrency, rates);
  return getCurrencyFormatter(baseCurrency).format(converted);
};

export const formatCurrencyParts = (value, baseCurrency, rates) => {
  const safeValue = value === null || value === undefined ? 0 : value;
  const converted = convertCurrency(safeValue, baseCurrency, rates);
  return getCurrencyFormatter(baseCurrency).formatToParts(converted);
};

export const formatMaskedCurrency = (baseCurrency) => {
  const parts = getCurrencyFormatter(baseCurrency).formatToParts(0);
  const currencyPart = parts.find((part) => part.type === 'currency');
  const currency = currencyPart?.value || '₺';
  return `${currency} ••••,••`;
};

export const formatMaskedPercent = () => '•••%';

export const getMappedAssetName = (symbol) => {
  const normalizedSymbol = String(symbol || '').trim().toUpperCase();
  return ASSET_SYMBOL_NAME_MAP[normalizedSymbol] || '';
};

export const formatTickerName = (symbol) => {
  const normalizedSymbol = String(symbol || '').trim().toUpperCase();
  if (!normalizedSymbol) {
    return '';
  }

  const exactMappedName = getMappedAssetName(normalizedSymbol);
  if (exactMappedName) {
    return exactMappedName;
  }

  const cleanedSymbol = normalizedSymbol.replace(/(\.IS|=F)$/g, '').replace(/_/g, ' ').trim();
  const cleanedMappedName = getMappedAssetName(cleanedSymbol);
  if (cleanedMappedName) {
    return cleanedMappedName;
  }

  return cleanedSymbol || normalizedSymbol;
};

export const resolveAssetName = ({ symbol, name }) => {
  const resolvedName = String(name || '').trim();
  if (resolvedName) {
    return resolvedName;
  }

  return formatTickerName(symbol);
};

export const groupAssetsByPortfolio = (assets = []) => {
  const groups = new Map();

  assets.forEach((assetEntry) => {
    const sourceAsset = assetEntry?.item || assetEntry;
    const rawPortfolioName = sourceAsset?.portfolioName || sourceAsset?.portfolio_name || 'Genel Portföy';
    const portfolioName = String(rawPortfolioName || '').trim() || 'Genel Portföy';

    if (!groups.has(portfolioName)) {
      groups.set(portfolioName, {
        portfolioName,
        items: [],
        totalValue: 0,
        totalCost: 0,
        totalProfit: 0,
      });
    }

    const group = groups.get(portfolioName);
    const amount = Number(sourceAsset?.amount || 0);
    const avgPrice = Number(sourceAsset?.avgPrice || sourceAsset?.cost || 0);
    const itemTotalValue = Number(assetEntry?.itemTotalValue || (amount * avgPrice));
    const itemCost = Number(assetEntry?.itemCost || (amount * avgPrice));
    const itemProfit = Number(assetEntry?.itemProfit || (itemTotalValue - itemCost));

    group.items.push(assetEntry);
    group.totalValue += Number.isFinite(itemTotalValue) ? itemTotalValue : 0;
    group.totalCost += Number.isFinite(itemCost) ? itemCost : 0;
    group.totalProfit += Number.isFinite(itemProfit) ? itemProfit : 0;
  });

  return Array.from(groups.values());
};
