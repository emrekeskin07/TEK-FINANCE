require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const YahooFinance = require("yahoo-finance2").default;

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const CACHE_TTL_MS = 60 * 1000;
const STALE_CACHE_MAX_AGE_MS = Number(process.env.YF_STALE_CACHE_MS) || 6 * 60 * 60 * 1000;
const TEFAS_HISTORY_URL = "https://www.tefas.gov.tr/api/DB/BindHistoryInfo";
const YAHOO_MIN_INTERVAL_MS = Number(process.env.YF_INTERVAL_MS) || 800;
const YAHOO_TIMEOUT_MS = Number(process.env.YF_TIMEOUT_MS) || 12000;
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";
const yahooFinance = new YahooFinance({
  queue: {
    concurrency: 1,
  },
  fetchOptions: {
    headers: {
      "User-Agent": BROWSER_USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
    },
  },
});
let lastYahooRequestAt = 0;

// symbol -> { data, expiresAt }
const quoteCache = new Map();

app.use(express.json());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

app.use(
  cors({
    origin: allowedOrigins,
  })
);

function parseSymbols(symbolsParam) {
  if (!symbolsParam || typeof symbolsParam !== "string") {
    return [];
  }

  const uniqueSymbols = new Set(
    symbolsParam
      .split(",")
      .map((symbol) => String(symbol || "").trim().toUpperCase())
      .filter(Boolean)
  );

  return [...uniqueSymbols];
}

function getCachedQuote(symbol) {
  const key = String(symbol || "").trim().toUpperCase();
  const cached = quoteCache.get(key);
  if (!cached) {
    return null;
  }

  if (Date.now() > cached.expiresAt) {
    return null;
  }

  return cached.data;
}

function getStaleCachedQuote(symbol) {
  const key = String(symbol || "").trim().toUpperCase();
  const cached = quoteCache.get(key);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.updatedAt > STALE_CACHE_MAX_AGE_MS) {
    quoteCache.delete(key);
    return null;
  }

  return cached.data;
}

function setCachedQuote(symbol, data) {
  const key = String(symbol || "").trim().toUpperCase();
  quoteCache.set(key, {
    data,
    updatedAt: Date.now(),
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

async function runYahooRequest(requestFn) {
  const now = Date.now();
  const elapsed = now - lastYahooRequestAt;
  if (elapsed < YAHOO_MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, YAHOO_MIN_INTERVAL_MS - elapsed));
  }

  const result = await requestFn();
  lastYahooRequestAt = Date.now();
  return result;
}

function toIsoDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cleanQuote(quote) {
  return {
    symbol: quote.symbol || null,
    shortName: quote.shortName || quote.longName || null,
    currency: quote.currency || null,
    exchange: quote.fullExchangeName || quote.exchange || null,
    marketState: quote.marketState || null,
    regularMarketPrice: quote.regularMarketPrice ?? null,
    regularMarketChange: quote.regularMarketChange ?? null,
    regularMarketChangePercent: quote.regularMarketChangePercent ?? null,
    regularMarketPreviousClose: quote.regularMarketPreviousClose ?? null,
    regularMarketOpen: quote.regularMarketOpen ?? null,
    regularMarketDayHigh: quote.regularMarketDayHigh ?? null,
    regularMarketDayLow: quote.regularMarketDayLow ?? null,
    regularMarketVolume: quote.regularMarketVolume ?? null,
    regularMarketTime: toIsoDate(quote.regularMarketTime),
    fetchedAt: new Date().toISOString(),
  };
}

function getLastFiniteNumber(values) {
  if (!Array.isArray(values)) {
    return null;
  }

  for (let i = values.length - 1; i >= 0; i -= 1) {
    const numericValue = Number(values[i]);
    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return null;
}

function toIsoDateFromEpochSeconds(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return new Date(numeric * 1000).toISOString();
}

function buildQuoteFromChart(symbol, payload) {
  const chartResult = payload?.chart?.result?.[0];
  const chartError = payload?.chart?.error;

  if (chartError) {
    const error = new Error(chartError.description || chartError.code || "Yahoo chart response error");
    error.status = 502;
    throw error;
  }

  if (!chartResult) {
    const error = new Error("Yahoo chart response is empty.");
    error.status = 502;
    throw error;
  }

  const meta = chartResult.meta || {};
  const indicators = chartResult.indicators || {};
  const quoteIndicator = Array.isArray(indicators.quote) ? indicators.quote[0] : null;

  const close = getLastFiniteNumber(quoteIndicator?.close);
  const open = getLastFiniteNumber(quoteIndicator?.open);
  const high = getLastFiniteNumber(quoteIndicator?.high);
  const low = getLastFiniteNumber(quoteIndicator?.low);
  const volume = getLastFiniteNumber(quoteIndicator?.volume);

  const regularMarketPrice = Number.isFinite(Number(meta.regularMarketPrice))
    ? Number(meta.regularMarketPrice)
    : close;

  if (!Number.isFinite(regularMarketPrice) || regularMarketPrice <= 0) {
    const error = new Error("Yahoo chart payload does not include a valid market price.");
    error.status = 502;
    throw error;
  }

  const previousClose = Number.isFinite(Number(meta.previousClose))
    ? Number(meta.previousClose)
    : (Number.isFinite(Number(meta.chartPreviousClose)) ? Number(meta.chartPreviousClose) : null);

  const regularMarketChange = Number.isFinite(Number(meta.regularMarketChange))
    ? Number(meta.regularMarketChange)
    : (Number.isFinite(previousClose) ? regularMarketPrice - previousClose : null);

  const regularMarketChangePercent = Number.isFinite(Number(meta.regularMarketChangePercent))
    ? Number(meta.regularMarketChangePercent)
    : (
      Number.isFinite(previousClose) && previousClose > 0
        ? ((regularMarketPrice - previousClose) / previousClose) * 100
        : null
    );

  return {
    symbol: meta.symbol || symbol,
    shortName: meta.shortName || meta.longName || symbol,
    currency: meta.currency || null,
    fullExchangeName: meta.exchangeName || null,
    marketState: meta.marketState || null,
    regularMarketPrice,
    regularMarketChange,
    regularMarketChangePercent,
    regularMarketPreviousClose: previousClose,
    regularMarketOpen: open,
    regularMarketDayHigh: high,
    regularMarketDayLow: low,
    regularMarketVolume: volume,
    regularMarketTime: toIsoDateFromEpochSeconds(meta.regularMarketTime),
  };
}

async function fetchYahooChartQuote(symbol) {
  const endpoint = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;

  const response = await axios.get(endpoint, {
    params: {
      interval: "1d",
      range: "1d",
      includePrePost: "false",
      events: "div,splits",
    },
    headers: {
      "User-Agent": BROWSER_USER_AGENT,
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: "https://finance.yahoo.com/",
      Origin: "https://finance.yahoo.com",
    },
    timeout: YAHOO_TIMEOUT_MS,
    validateStatus: () => true,
  });

  if (response.status === 429) {
    const error = new Error("Yahoo rate limit (429) nedeniyle fiyat alınamadı.");
    error.status = 429;
    throw error;
  }

  if (response.status < 200 || response.status >= 300) {
    const error = new Error(`Yahoo chart request failed. HTTP ${response.status}`);
    error.status = 502;
    throw error;
  }

  return buildQuoteFromChart(symbol, response.data);
}

function formatTefasDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function parseTefasDate(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (/^\d{10,13}$/.test(trimmed)) {
    const epochMs = Number(trimmed.length === 10 ? `${trimmed}000` : trimmed);
    const epochDate = new Date(epochMs);
    return Number.isNaN(epochDate.getTime()) ? null : epochDate;
  }

  const ddMmYyyy = /^([0-3]\d)\.([0-1]\d)\.(\d{4})$/;
  const match = trimmed.match(ddMmYyyy);
  if (match) {
    const [, day, month, year] = match;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function toTefasNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .replace(/\./g, "")
    .replace(/,/g, ".");

  if (!normalized) {
    return null;
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function extractTefasRows(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.Data)) {
    return payload.Data;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (payload.result && Array.isArray(payload.result.data)) {
    return payload.result.data;
  }

  return [];
}

function mapTefasRow(row) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const code =
    row.FONKODU ||
    row.FONKOD ||
    row.KOD ||
    row.CODE ||
    row.code ||
    null;

  const name =
    row.FONUNVAN ||
    row.FONADI ||
    row.UNVAN ||
    row.NAME ||
    row.name ||
    null;

  const price =
    toTefasNumber(row.FIYAT) ??
    toTefasNumber(row.FONFIYAT) ??
    toTefasNumber(row.Fiyat) ??
    toTefasNumber(row.PRICE) ??
    toTefasNumber(row.price);

  const date = parseTefasDate(row.TARIH || row.Tarih || row.DATE || row.date);

  if (!code || price === null) {
    return null;
  }

  return {
    code: String(code).toUpperCase(),
    name: name ? String(name).trim() : null,
    price,
    date,
    dateIso: date ? date.toISOString() : null,
  };
}

function tefasHeaders() {
  return {
    "User-Agent": BROWSER_USER_AGENT,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: "https://www.tefas.gov.tr/FonAnaliz.aspx?FonKod=",
    Origin: "https://www.tefas.gov.tr",
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  };
}

async function fetchTefasFundPrice(fundCode, options = {}) {
  const normalizedCode = String(fundCode || "").trim().toUpperCase();
  if (!normalizedCode) {
    throw new Error("Fon kodu zorunludur.");
  }

  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 15000;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const requestBody = new URLSearchParams({
    fontip: "YAT",
    fonkod: normalizedCode,
    bastarih: formatTefasDate(yesterday),
    bittarih: formatTefasDate(today),
  }).toString();

  const response = await axios.post(TEFAS_HISTORY_URL, requestBody, {
    headers: tefasHeaders(),
    timeout: timeoutMs,
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    const error = new Error(`TEFAS isteği başarısız oldu. HTTP ${response.status}`);
    error.status = 502;
    throw error;
  }

  if (typeof response.data === "string" && !response.data.trim()) {
    const error = new Error("TEFAS boş yanıt döndü. Lütfen daha sonra tekrar deneyin.");
    error.status = 502;
    throw error;
  }

  if (typeof response.data === "string" && response.data.toLowerCase().includes("support id")) {
    const error = new Error("TEFAS bot koruması nedeniyle veri alınamadı. Lütfen daha sonra tekrar deneyin.");
    error.status = 502;
    throw error;
  }

  const rows = extractTefasRows(response.data)
    .map(mapTefasRow)
    .filter(Boolean)
    .filter((item) => item.code === normalizedCode)
    .sort((a, b) => {
      const aTime = a.date ? a.date.getTime() : 0;
      const bTime = b.date ? b.date.getTime() : 0;
      return aTime - bTime;
    });

  if (!rows.length) {
    const error = new Error(`TEFAS'ta ${normalizedCode} için fiyat verisi bulunamadı.`);
    error.status = 404;
    throw error;
  }

  const latest = rows[rows.length - 1];
  const previous = rows.length > 1 ? rows[rows.length - 2] : null;

  const dailyChangePercent = previous && previous.price > 0
    ? Number((((latest.price - previous.price) / previous.price) * 100).toFixed(4))
    : null;

  return {
    code: latest.code,
    name: latest.name || normalizedCode,
    price: latest.price,
    currency: "TRY",
    dailyChangePercent,
    date: latest.dateIso,
    previousPrice: previous ? previous.price : null,
  };
}

function isLikelyFundCodeQuery(query) {
  return /^[A-Z]{3}$/.test(query);
}

function isBistSymbol(symbol) {
  return typeof symbol === "string" && symbol.trim().toUpperCase().endsWith(".IS");
}

async function fetchTefasFundSuggestion(query) {
  const fundData = await fetchTefasFundPrice(query, { timeoutMs: 6000 });

  return {
    symbol: fundData.code,
    name: fundData.name || fundData.code,
    assetType: "fund",
    source: "tefas",
  };
}

async function getQuoteData(symbol) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  const cached = getCachedQuote(normalizedSymbol);
  if (cached) {
    return { data: { ...cached, cached: true, source: "cache" } };
  }

  try {
    const quote = await runYahooRequest(() => fetchYahooChartQuote(normalizedSymbol));
    const cleaned = cleanQuote(quote);
    setCachedQuote(normalizedSymbol, cleaned);

    return { data: { ...cleaned, cached: false, source: "live" } };
  } catch (error) {
    const staleCached = getStaleCachedQuote(normalizedSymbol);
    if (staleCached) {
      return {
        data: {
          ...staleCached,
          cached: true,
          stale: true,
          source: "stale-cache",
        },
        warning: error.message || "Live data unavailable, stale cache used.",
      };
    }

    throw error;
  }
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "market-data-api",
    timestamp: new Date().toISOString(),
  });
});

// Example: /api/search?q=THY
app.get("/api/search", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const normalizedQuery = query.toUpperCase();

  if (query.length < 2) {
    return res.status(400).json({
      ok: false,
      error: "Query param required: q (min 2 chars)",
    });
  }

  try {
    const dedupe = new Set();
    const data = [];

    if (isLikelyFundCodeQuery(normalizedQuery)) {
      try {
        const tefasSuggestion = await fetchTefasFundSuggestion(normalizedQuery);
        if (tefasSuggestion?.symbol && !dedupe.has(tefasSuggestion.symbol)) {
          dedupe.add(tefasSuggestion.symbol);
          data.push(tefasSuggestion);
        }
      } catch {
        // TEFAS suggestion is best-effort for autocomplete.
      }
    }

    const result = await runYahooRequest(() =>
      yahooFinance.search(query, {
        quotesCount: 20,
        newsCount: 0,
        enableFuzzyQuery: true,
      })
    );

    const quotes = Array.isArray(result?.quotes) ? result.quotes : [];

    for (const quote of quotes) {
      const symbol = typeof quote?.symbol === "string" ? quote.symbol.trim() : "";
      if (!symbol || dedupe.has(symbol)) {
        continue;
      }

      dedupe.add(symbol);
      data.push({
        symbol,
        name:
          quote?.shortname ||
          quote?.longname ||
          quote?.displayName ||
          quote?.quoteType ||
          symbol,
        assetType: "market",
        source: "yahoo",
      });

      if (data.length >= 6) {
        break;
      }
    }

    data.sort((a, b) => {
      const aIsBist = isBistSymbol(a?.symbol);
      const bIsBist = isBistSymbol(b?.symbol);

      if (aIsBist === bIsBist) {
        return 0;
      }

      return aIsBist ? -1 : 1;
    });

    return res.json({
      ok: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Hata Detayı:", error.message);

    return res.status(502).json({
      ok: false,
      error: error.message || "Failed to search symbols",
      errorMessage: error.message,
    });
  }
});

// Example: /api/finance?symbol=THYAO.IS
app.get("/api/finance", async (req, res) => {
  const symbol = typeof req.query.symbol === "string" ? req.query.symbol.trim() : "";

  if (!symbol) {
    return res.status(400).json({
      ok: false,
      error: "Query param required: symbol=THYAO.IS",
    });
  }

  try {
    const result = await getQuoteData(symbol);

    return res.json({
      ok: true,
      data: result.data,
      ...(result.warning ? { warning: result.warning } : {}),
    });
  } catch (error) {
    console.error("Hata Detayı:", error.message);

    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 502;

    return res.status(status).json({
      ok: false,
      error: error.message || "Failed to fetch quote",
      errorMessage: error.message,
    });
  }
});

// Example: /api/quotes?symbols=THYAO.IS,TRY=X
app.get("/api/quotes", async (req, res) => {
  const symbols = parseSymbols(req.query.symbols);

  if (!symbols.length) {
    return res.status(400).json({
      ok: false,
      error: "Query param required: symbols=THYAO.IS,TRY=X",
    });
  }

  try {
    const data = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const result = await getQuoteData(symbol);
          return {
            ...result.data,
            ...(result.warning ? { warning: result.warning } : {}),
          };
        } catch (error) {
          console.error("Hata Detayı:", error.message);

          return {
            symbol,
            error: error.message || "Failed to fetch quote",
            fetchedAt: new Date().toISOString(),
          };
        }
      })
    );

    return res.json({
      ok: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Hata Detayı:", error.message);

    return res.status(500).json({
      ok: false,
      error: error.message || "Internal server error",
    });
  }
});

// Example: /api/fon-fiyati/MAC
app.get("/api/fon-fiyati/:kod", async (req, res) => {
  const fundCode = typeof req.params.kod === "string" ? req.params.kod.trim() : "";

  if (!fundCode) {
    return res.status(400).json({
      ok: false,
      error: "Fon kodu zorunludur. Örnek: /api/fon-fiyati/MAC",
    });
  }

  if (!/^[a-zA-Z0-9]+$/.test(fundCode)) {
    return res.status(400).json({
      ok: false,
      error: "Geçersiz fon kodu formatı.",
    });
  }

  try {
    const data = await fetchTefasFundPrice(fundCode);
    return res.json({ ok: true, data });
  } catch (error) {
    console.error("Hata Detayı:", error.message);

    const status = error.status || 502;
    return res.status(status).json({
      ok: false,
      error: error.message || "TEFAS fon fiyatı alınamadı.",
      ...(status === 502 ? { errorMessage: error.message } : {}),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
