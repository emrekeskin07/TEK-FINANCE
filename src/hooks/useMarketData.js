import { useState, useCallback, useEffect, useRef } from 'react';
import { convertMetalQuoteToTryByUnit, fetchYahooData, METAL_TICKERS } from '../services/api';

const PRICE_CACHE_KEY_PREFIX = 'son_basarili_fiyat_';
const PRICE_CACHE_TIME_KEY_PREFIX = 'son_basarili_fiyat_zamani_';

const METAL_CHANGE_KEYS = {
  'GC=F': ['GC=F', 'GC=F__ONS', 'GC=F__GRAM', 'GRAM_ALTIN'],
  'SI=F': ['SI=F', 'SI=F__ONS', 'SI=F__GRAM'],
  'PL=F': ['PL=F', 'PL=F__ONS', 'PL=F__GRAM'],
  'PA=F': ['PA=F', 'PA=F__ONS', 'PA=F__GRAM'],
};

const assignMetalDerivedPrices = (symbol, quote, usdTryPrice, targetData, targetChanges) => {
  const rawOuncePrice = Number(quote?.price);
  if (Number.isFinite(rawOuncePrice) && rawOuncePrice > 0) {
    targetData[`${symbol}__USD_OUNCE`] = rawOuncePrice;
  }

  const tryPerOunce = convertMetalQuoteToTryByUnit({
    quote,
    usdTryPrice,
    unitType: 'ons',
  });
  const tryPerGram = convertMetalQuoteToTryByUnit({
    quote,
    usdTryPrice,
    unitType: 'gram',
  });

  if (Number.isFinite(tryPerOunce) && tryPerOunce > 0) {
    targetData[symbol] = tryPerOunce;
    targetData[`${symbol}__ONS`] = tryPerOunce;
  }

  if (Number.isFinite(tryPerGram) && tryPerGram > 0) {
    targetData[`${symbol}__GRAM`] = tryPerGram;
    if (symbol === 'GC=F') {
      targetData.GRAM_ALTIN = tryPerGram;
    }
  }

  if (typeof quote?.changePercent === 'number' && !Number.isNaN(quote.changePercent)) {
    const changeKeys = METAL_CHANGE_KEYS[symbol] || [symbol];
    changeKeys.forEach((key) => {
      targetChanges[key] = quote.changePercent;
    });
  }
};

const getPriceCacheKey = (symbol) => `${PRICE_CACHE_KEY_PREFIX}${String(symbol || '').trim().toUpperCase()}`;
const getPriceCacheTimeKey = (symbol) => `${PRICE_CACHE_TIME_KEY_PREFIX}${String(symbol || '').trim().toUpperCase()}`;

const readCachedPrice = (symbol) => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawPrice = window.localStorage.getItem(getPriceCacheKey(symbol));
  if (rawPrice === null) {
    return null;
  }

  const parsedPrice = Number(rawPrice);
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return null;
  }

  const rawTimestamp = window.localStorage.getItem(getPriceCacheTimeKey(symbol));
  const parsedTimestamp = Number(rawTimestamp);

  return {
    price: parsedPrice,
    cachedAt: Number.isFinite(parsedTimestamp) && parsedTimestamp > 0 ? parsedTimestamp : null,
  };
};

const writeCachedPrice = (symbol, price) => {
  if (typeof window === 'undefined') {
    return;
  }

  const parsedPrice = Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return;
  }

  window.localStorage.setItem(getPriceCacheKey(symbol), String(parsedPrice));
  window.localStorage.setItem(getPriceCacheTimeKey(symbol), String(Date.now()));
};

const getSymbolRelatedKeys = (symbol) => {
  const normalized = String(symbol || '').trim().toUpperCase();
  if (!normalized) {
    return [];
  }

  const keys = [normalized];
  if (METAL_TICKERS.includes(normalized)) {
    keys.push(`${normalized}__ONS`, `${normalized}__GRAM`);
    if (normalized === 'GC=F') {
      keys.push('GRAM_ALTIN');
    }
  }

  return keys;
};

export const useMarketData = (portfolio) => {
  const [marketData, setMarketData] = useState({});
  const [marketChanges, setMarketChanges] = useState({});
  const [marketMeta, setMarketMeta] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [lastFetchFailed, setLastFetchFailed] = useState(false);
  const [rates, setRates] = useState({ USD: 1, EUR: 1 });
  const ratesRef = useRef({ USD: 1, EUR: 1 });

  useEffect(() => {
    ratesRef.current = rates;
  }, [rates]);

  const updatePrices = useCallback(async (currentPortfolio = portfolio) => {
    setLoading(true);
    try {
      const baseSymbols = ['TRY=X', 'EURTRY=X', 'GC=F'];
      const portfolioSymbols = currentPortfolio.map(p => p.symbol).filter(s => s !== 'GRAM_ALTIN');
      const allSymbols = [...new Set([...baseSymbols, ...portfolioSymbols])];

      const fetchPromises = allSymbols.map(sym => fetchYahooData(sym).then(quote => ({ symbol: sym, quote })));
      const results = await Promise.all(fetchPromises);

      const newMarketData = {};
      const newMarketChanges = {};
      const newMarketMeta = {};
      const quotesBySymbol = {};
      results.forEach(item => {
        if (item.quote && typeof item.quote.price === 'number') {
          newMarketData[item.symbol] = item.quote.price;
          newMarketMeta[item.symbol] = { source: 'live', cachedAt: null };
          if (typeof item.quote.changePercent === 'number' && !Number.isNaN(item.quote.changePercent)) {
            newMarketChanges[item.symbol] = item.quote.changePercent;
          }
          quotesBySymbol[item.symbol] = item.quote;
        }
      });

      const failedSymbols = results.filter((item) => {
        return !(item.quote && typeof item.quote.price === 'number' && !Number.isNaN(item.quote.price));
      });

      const usdTryPrice = newMarketData['TRY=X'] || ratesRef.current.USD;
      METAL_TICKERS.forEach((symbol) => {
        const metalQuote = quotesBySymbol[symbol];
        if (!metalQuote) {
          return;
        }

        assignMetalDerivedPrices(symbol, metalQuote, usdTryPrice, newMarketData, newMarketChanges);
      });

      Object.keys(newMarketData).forEach((key) => {
        if (!newMarketMeta[key]) {
          newMarketMeta[key] = { source: 'live', cachedAt: null };
        }

        writeCachedPrice(key, newMarketData[key]);
      });

      const unresolvedSymbols = [];
      failedSymbols.forEach(({ symbol }) => {
        const relatedKeys = getSymbolRelatedKeys(symbol);
        let hasAnyFallback = false;

        relatedKeys.forEach((key) => {
          const cached = readCachedPrice(key);
          if (!cached) {
            return;
          }

          newMarketData[key] = cached.price;
          newMarketMeta[key] = { source: 'cache', cachedAt: cached.cachedAt };
          hasAnyFallback = true;
        });

        if (!hasAnyFallback) {
          unresolvedSymbols.push(symbol);
        }
      });

      const hasMarketData = Object.keys(newMarketData).length > 0;
      const hasFailure = unresolvedSymbols.length > 0 || !hasMarketData;

      setMarketData(prev => ({...prev, ...newMarketData}));
      setMarketChanges(prev => ({ ...prev, ...newMarketChanges }));
      setMarketMeta(prev => ({ ...prev, ...newMarketMeta }));
      
      setRates(prevRates => ({
        USD: newMarketData['TRY=X'] || prevRates.USD,
        EUR: newMarketData['EURTRY=X'] || prevRates.EUR
      }));

      if (hasMarketData) {
        setLastUpdated(new Date());
      }

      setLastFetchFailed(hasFailure);
      return !hasFailure;
    } catch (error) {
      console.error("Güncelleme hatası:", error);
      setLastFetchFailed(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, [portfolio]);

  return { marketData, marketChanges, marketMeta, loading, lastUpdated, lastFetchFailed, rates, updatePrices };
};