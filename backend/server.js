require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const YahooFinance = require("yahoo-finance2").default;

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const CACHE_TTL_MS = 60 * 1000;
const TEFAS_HISTORY_URL = "https://www.tefas.gov.tr/api/DB/BindHistoryInfo";
const yahooFinance = new YahooFinance();

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
      .map((symbol) => symbol.trim())
      .filter(Boolean)
  );

  return [...uniqueSymbols];
}

function getCachedQuote(symbol) {
  const cached = quoteCache.get(symbol);
  if (!cached) {
    return null;
  }

  if (Date.now() > cached.expiresAt) {
    quoteCache.delete(symbol);
    return null;
  }

  return cached.data;
}

function setCachedQuote(symbol, data) {
  quoteCache.set(symbol, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
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
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
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
  const cached = getCachedQuote(symbol);
  if (cached) {
    return { data: { ...cached, cached: true } };
  }

  const quote = await yahooFinance.quote(symbol);
  const cleaned = cleanQuote(quote);
  setCachedQuote(symbol, cleaned);

  return { data: { ...cleaned, cached: false } };
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

    const result = await yahooFinance.search(query, {
      quotesCount: 20,
      newsCount: 0,
      enableFuzzyQuery: true,
    });

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
    return res.status(502).json({
      ok: false,
      error: error.message || "Failed to search symbols",
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
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: error.message || "Failed to fetch quote",
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
          return result.data;
        } catch (error) {
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
    return res.status(error.status || 502).json({
      ok: false,
      error: error.message || "TEFAS fon fiyatı alınamadı.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
