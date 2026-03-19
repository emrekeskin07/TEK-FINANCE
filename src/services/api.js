const isLocalDevHost = typeof window !== 'undefined'
  && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const DEFAULT_API_BASE_URL = isLocalDevHost ? 'http://localhost:5000' : '';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 8000;
export const OUNCE_TO_GRAM = 31.1035;
export const METAL_TICKERS = ['GC=F', 'SI=F', 'PL=F', 'PA=F'];

class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.body = options.body;
  }
}

const normalizeCurrency = (value) => String(value || '').trim().toUpperCase();

export const convertOuncePriceToGram = (ouncePrice) => {
  const numeric = Number(ouncePrice);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return numeric / OUNCE_TO_GRAM;
};

export const convertMetalQuoteToTryByUnit = ({ quote, usdTryPrice, unitType = 'ons' }) => {
  const rawPrice = Number(quote?.price);
  if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
    return null;
  }

  const normalizedCurrency = normalizeCurrency(quote?.currency);
  const usdTry = Number(usdTryPrice);

  let tryPerOunce = null;
  if (normalizedCurrency === 'TRY') {
    tryPerOunce = rawPrice;
  } else if (normalizedCurrency === 'USD') {
    if (!Number.isFinite(usdTry) || usdTry <= 0) {
      return null;
    }

    tryPerOunce = rawPrice * usdTry;
  } else if (Number.isFinite(usdTry) && usdTry > 0) {
    tryPerOunce = rawPrice * usdTry;
  } else {
    tryPerOunce = rawPrice;
  }

  if (!Number.isFinite(tryPerOunce) || tryPerOunce <= 0) {
    return null;
  }

  if (String(unitType || '').trim().toLowerCase() === 'gram') {
    return convertOuncePriceToGram(tryPerOunce);
  }

  return tryPerOunce;
};

function extractQuote(payload, symbol) {
  if (typeof payload?.price === 'number') {
    return {
      symbol,
      price: payload.price,
      currency: payload?.currency || null,
      changePercent: typeof payload?.changePercent === 'number' ? payload.changePercent : null,
    };
  }

  if (typeof payload?.data?.regularMarketPrice === 'number') {
    return {
      symbol: payload.data.symbol || symbol,
      price: payload.data.regularMarketPrice,
      currency: payload.data.currency || null,
      changePercent: typeof payload.data.regularMarketChangePercent === 'number'
        ? payload.data.regularMarketChangePercent
        : (typeof payload.data.marketChangePercent === 'number' ? payload.data.marketChangePercent : null),
      exchange: payload.data.exchange || null,
      marketState: payload.data.marketState || null,
    };
  }

  if (Array.isArray(payload?.data)) {
    const quote = payload.data.find((item) => item?.symbol === symbol);
    if (quote && typeof quote.regularMarketPrice === 'number') {
      return {
        symbol: quote.symbol || symbol,
        price: quote.regularMarketPrice,
        currency: quote.currency || null,
        changePercent: typeof quote.regularMarketChangePercent === 'number'
          ? quote.regularMarketChangePercent
          : (typeof quote.marketChangePercent === 'number' ? quote.marketChangePercent : null),
        exchange: quote.exchange || null,
        marketState: quote.marketState || null,
      };
    }
  }

  return null;
}

export const fetchYahooData = async (symbol) => {
  if (!symbol || typeof symbol !== 'string') {
    console.error('Geçersiz sembol parametresi:', symbol);
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const endpoint = `${API_BASE_URL}/api/finance?symbol=${encodeURIComponent(symbol.trim())}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      throw new ApiError('Sunucudan JSON parse edilemedi.', {
        status: response.status,
        code: 'INVALID_JSON'
      });
    }

    if (!response.ok || payload?.ok === false) {
      throw new ApiError(payload?.error || `Backend hatası: ${response.status}`, {
        status: response.status,
        body: payload
      });
    }

    const quote = extractQuote(payload, symbol.trim());
    if (!quote || typeof quote.price !== 'number' || Number.isNaN(quote.price)) {
      throw new ApiError('Beklenmeyen yanıt formatı: fiyat bulunamadı.', {
        status: response.status,
        body: payload,
        code: 'PRICE_NOT_FOUND'
      });
    }

    return quote;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`Fiyat isteği zaman aşımına uğradı (${symbol}).`);
      return null;
    }

    if (error instanceof ApiError) {
      console.error(`API hatası (${symbol}):`, {
        message: error.message,
        status: error.status,
        code: error.code,
        body: error.body
      });
      return null;
    }

    console.error(`Beklenmeyen istek hatası (${symbol}):`, error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const fetchSymbolSuggestions = async (query) => {
  const normalizedQuery = typeof query === 'string' ? query.trim() : '';
  if (normalizedQuery.length < 2) {
    return [];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const endpoint = `${API_BASE_URL}/api/search?q=${encodeURIComponent(normalizedQuery)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      return [];
    }

    if (!response.ok || payload?.ok === false) {
      return [];
    }

    const list = Array.isArray(payload?.data) ? payload.data : [];
    return list
      .filter((item) => typeof item?.symbol === 'string' && item.symbol.trim())
      .map((item) => ({
        symbol: item.symbol.trim(),
        name: typeof item?.name === 'string' && item.name.trim() ? item.name.trim() : item.symbol.trim(),
        assetType: typeof item?.assetType === 'string' ? item.assetType : null,
        source: typeof item?.source === 'string' ? item.source : null,
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
};
