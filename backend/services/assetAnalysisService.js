const axios = require("axios");
const { getQuoteData, getHistoryData } = require("./priceService");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_API_URL = "https://newsapi.org/v2/everything";

const ANALYSIS_SYSTEM_PROMPT = "Sen uzman bir finansal analistsin. Sana gelen ham finansal verileri, haber akışlarını ve piyasa duyarlılığını analiz ederek; kısa, net ve aksiyon alınabilir (YTD uyarısıyla) bir özet üret.";

function toSafeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeRiskProfile(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "aggressive" || normalized === "atilgan" || normalized === "atılgan") {
    return "Atılgan";
  }

  if (normalized === "conservative" || normalized === "muhafazakar" || normalized === "muhafazakâr") {
    return "Muhafazakar";
  }

  return "Dengeli";
}

function computeStdDev(values = []) {
  const list = (Array.isArray(values) ? values : []).filter((item) => Number.isFinite(Number(item)));
  if (list.length < 2) {
    return 0;
  }

  const mean = list.reduce((sum, value) => sum + Number(value), 0) / list.length;
  const variance = list.reduce((sum, value) => {
    const delta = Number(value) - mean;
    return sum + (delta * delta);
  }, 0) / (list.length - 1);

  return Math.sqrt(Math.max(variance, 0));
}

function buildMockHeadlines(assetName, symbol) {
  return [
    `${assetName || symbol} için işlem hacminde son 24 saatte artış gözlendi.`,
    `${assetName || symbol} fiyatı haber akışı sonrası teknik destek bölgesine yaklaştı.`,
    `${assetName || symbol} için yatırımcı tarafında kısa vadeli temkinli beklenti öne çıkıyor.`,
  ];
}

async function fetchNewsHeadlines({ assetName, symbol }) {
  if (!NEWS_API_KEY) {
    return buildMockHeadlines(assetName, symbol);
  }

  const query = [assetName, symbol].filter(Boolean).join(" OR ");
  if (!query) {
    return buildMockHeadlines(assetName, symbol);
  }

  try {
    const response = await axios.get(NEWS_API_URL, {
      params: {
        q: query,
        sortBy: "publishedAt",
        language: "en",
        pageSize: 5,
      },
      headers: {
        "X-Api-Key": NEWS_API_KEY,
      },
      timeout: 12000,
      validateStatus: () => true,
    });

    if (response.status < 200 || response.status >= 300) {
      return buildMockHeadlines(assetName, symbol);
    }

    const articles = Array.isArray(response.data?.articles) ? response.data.articles : [];
    const titles = articles
      .map((article) => String(article?.title || "").trim())
      .filter(Boolean)
      .slice(0, 5);

    return titles.length ? titles : buildMockHeadlines(assetName, symbol);
  } catch {
    return buildMockHeadlines(assetName, symbol);
  }
}

function scoreSentiment(headlines = [], dayChangePercent = 0) {
  const positiveWords = ["gain", "growth", "surge", "up", "strong", "beat", "record", "positive"];
  const negativeWords = ["drop", "fall", "risk", "weak", "lawsuit", "decline", "cut", "negative"];

  let score = 0;

  (Array.isArray(headlines) ? headlines : []).forEach((headline) => {
    const normalized = String(headline || "").toLowerCase();
    positiveWords.forEach((word) => {
      if (normalized.includes(word)) {
        score += 1;
      }
    });
    negativeWords.forEach((word) => {
      if (normalized.includes(word)) {
        score -= 1;
      }
    });
  });

  score += Math.sign(toSafeNumber(dayChangePercent, 0));

  if (score >= 2) {
    return { label: "Pozitif", indicator: "🟢", score };
  }

  if (score <= -2) {
    return { label: "Negatif", indicator: "🔴", score };
  }

  return { label: "Nötr", indicator: "🟡", score };
}

function toVolatilityLabel(volatilityPercent) {
  if (volatilityPercent >= 4.5) {
    return "Yüksek";
  }

  if (volatilityPercent >= 2) {
    return "Orta";
  }

  return "Düşük";
}

function fallbackDynamicInsight(input) {
  const {
    assetName,
    price,
    dayChangePercent,
    volatilityPercent,
    sentiment,
    headlines,
    riskProfile,
  } = input;

  const volatilityLabel = toVolatilityLabel(volatilityPercent);
  const suggestion = riskProfile === "Atılgan"
    ? (volatilityPercent >= 4.5 ? "Bekle" : "Kademeli Ekle")
    : (riskProfile === "Muhafazakar"
      ? (volatilityPercent >= 2 ? "Bekle" : "Sınırlı Ekle")
      : (sentiment.label === "Negatif" ? "Bekle" : "Kademeli Ekle"));

  return {
    summary: {
      title: "Neler Oluyor?",
      content: `${assetName} fiyatı ${price.toFixed(2)} seviyesinde ve günlük değişim %${dayChangePercent.toFixed(2)}. Haber akışında öne çıkan tema kısa vadeli belirsizlik ve hacim dalgalanması.`,
    },
    riskOpportunity: {
      title: "Risk/Fırsat Analizi",
      content: `Volatilite: %${volatilityPercent.toFixed(2)} (${volatilityLabel}). Sentiment ${sentiment.label} ${sentiment.indicator}. Yüksek oynaklık kısa vadede risk üretirken doğru zamanlamada fırsat da yaratabilir.`,
    },
    strategy: {
      title: "Strateji Önerisi",
      content: `${riskProfile} profil için öneri: ${suggestion}. YTD uyarısı: Bu değerlendirme kısa vadeli akışı yansıtır, yıl sonu performansı için tek başına karar kriteri değildir.`,
      action: suggestion,
    },
    raw: {
      headlines: Array.isArray(headlines) ? headlines.slice(0, 5) : [],
    },
    source: "fallback",
  };
}

function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    return null;
  }

  const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectMatch = raw.match(/\{[\s\S]*\}/);
  return objectMatch?.[0] || null;
}

async function callGeminiDynamicAnalysis(payload) {
  if (!GEMINI_API_KEY) {
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const instructions = [
    ANALYSIS_SYSTEM_PROMPT,
    "Sadece JSON döndür.",
    "Alanlar: summary { title, content }, riskOpportunity { title, content }, strategy { title, content, action }.",
    "title değerleri sırasıyla: Neler Oluyor?, Risk/Fırsat Analizi, Strateji Önerisi.",
    "action değeri sadece: Ekle, Bekle, Kademeli Ekle veya Sınırlı Ekle.",
    "content alanlarında Türkçe ve net bir üslup kullan.",
  ].join(" ");

  const response = await axios.post(url, {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${instructions}\n\nVeri:\n${JSON.stringify(payload, null, 2)}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.25,
      responseMimeType: "application/json",
    },
  }, {
    timeout: 15000,
    headers: { "Content-Type": "application/json" },
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    return null;
  }

  const modelText = response?.data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || "")
    .join("\n")
    .trim();

  const jsonText = extractJson(modelText);
  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText);
    const summaryContent = String(parsed?.summary?.content || "").trim();
    const riskContent = String(parsed?.riskOpportunity?.content || "").trim();
    const strategyContent = String(parsed?.strategy?.content || "").trim();

    if (!summaryContent || !riskContent || !strategyContent) {
      return null;
    }

    return {
      summary: {
        title: "Neler Oluyor?",
        content: summaryContent,
      },
      riskOpportunity: {
        title: "Risk/Fırsat Analizi",
        content: riskContent,
      },
      strategy: {
        title: "Strateji Önerisi",
        content: strategyContent,
        action: String(parsed?.strategy?.action || "Bekle").trim() || "Bekle",
      },
      source: "gemini",
    };
  } catch {
    return null;
  }
}

async function fetchAssetContext({ symbol, assetName }) {
  const quoteResult = await getQuoteData(symbol);
  const quote = quoteResult?.data || {};
  const price = toSafeNumber(quote.regularMarketPrice, 0);
  const dayChangePercent = toSafeNumber(quote.regularMarketChangePercent, 0);

  const historySeries = await getHistoryData([symbol], { range: "3mo", interval: "1d" });
  const points = Array.isArray(historySeries?.[0]?.points) ? historySeries[0].points : [];

  const returns = [];
  for (let i = 1; i < points.length; i += 1) {
    const prev = toSafeNumber(points[i - 1]?.close, 0);
    const current = toSafeNumber(points[i]?.close, 0);
    if (prev > 0 && current > 0) {
      returns.push(((current - prev) / prev) * 100);
    }
  }

  const volatilityPercent = computeStdDev(returns);
  const headlines = await fetchNewsHeadlines({ assetName, symbol });
  const sentiment = scoreSentiment(headlines, dayChangePercent);

  return {
    symbol,
    assetName,
    price,
    dayChangePercent,
    volatilityPercent,
    volatilityLabel: toVolatilityLabel(volatilityPercent),
    sentiment,
    headlines,
  };
}

async function analyzeAsset({ symbol, assetName, riskProfile }) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  if (!normalizedSymbol) {
    throw new Error("Symbol gereklidir.");
  }

  const resolvedRiskProfile = normalizeRiskProfile(riskProfile);
  const context = await fetchAssetContext({
    symbol: normalizedSymbol,
    assetName: String(assetName || normalizedSymbol).trim(),
  });

  const llmPayload = {
    systemPrompt: ANALYSIS_SYSTEM_PROMPT,
    riskProfile: resolvedRiskProfile,
    ...context,
  };

  const llmResult = await callGeminiDynamicAnalysis(llmPayload);
  const fallback = fallbackDynamicInsight({
    ...context,
    riskProfile: resolvedRiskProfile,
  });

  return {
    symbol: context.symbol,
    assetName: context.assetName,
    riskProfile: resolvedRiskProfile,
    metrics: {
      price: context.price,
      dayChangePercent: context.dayChangePercent,
      volatilityPercent: context.volatilityPercent,
      volatilityLabel: context.volatilityLabel,
      sentiment: context.sentiment,
    },
    headlines: context.headlines,
    insight: llmResult || fallback,
    source: llmResult ? "gemini" : "fallback",
    warning: "Bu bir yatırım tavsiyesi değildir. YTD.",
  };
}

module.exports = {
  ANALYSIS_SYSTEM_PROMPT,
  analyzeAsset,
};
