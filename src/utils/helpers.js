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
