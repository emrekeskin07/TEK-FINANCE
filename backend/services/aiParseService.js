const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
const { getQuoteData } = require("./priceService");

const OUNCE_TO_GRAM = 31.1035;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;

const INSTITUTION_KEYWORDS = [
  { key: "ziraat", value: "Ziraat Bankası" },
  { key: "vakif", value: "Vakıfbank" },
  { key: "vakıf", value: "Vakıfbank" },
  { key: "is bank", value: "İş Bankası" },
  { key: "iş bank", value: "İş Bankası" },
  { key: "garanti", value: "Garanti BBVA" },
  { key: "akbank", value: "Akbank" },
  { key: "yapi kredi", value: "Yapı Kredi" },
  { key: "yapı kredi", value: "Yapı Kredi" },
  { key: "halkbank", value: "Halkbank" },
  { key: "enpara", value: "Enpara" },
  { key: "qnb", value: "QNB Finansbank" },
  { key: "teb", value: "TEB" },
  { key: "kuveyt turk", value: "Kuveyt Türk" },
  { key: "kuveyt türk", value: "Kuveyt Türk" },
  { key: "denizbank", value: "Denizbank" },
  { key: "ing", value: "ING" },
  { key: "hsbc", value: "HSBC" },
  { key: "midas", value: "Midas" },
];

function getSupabaseAdminClient() {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY backend .env içinde zorunludur.");
  }

  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAdmin;
}

function parseTrNumber(rawValue) {
  if (typeof rawValue === "number") {
    return Number.isFinite(rawValue) ? rawValue : null;
  }

  if (typeof rawValue !== "string") {
    return null;
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed
    .replace(/\s+/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function detectInstitutionFromText(text) {
  const normalized = String(text || "").toLocaleLowerCase("tr-TR");
  const matched = INSTITUTION_KEYWORDS.find((item) => normalized.includes(item.key));
  return matched ? matched.value : "Banka Belirtilmedi";
}

function detectCurrencyFromText(text) {
  const normalized = String(text || "").toLocaleLowerCase("tr-TR");

  if (normalized.includes("usd") || normalized.includes("dolar") || normalized.includes("$")) {
    return "USD";
  }

  if (normalized.includes("eur") || normalized.includes("euro") || normalized.includes("€")) {
    return "EUR";
  }

  if (normalized.includes("gbp") || normalized.includes("sterlin") || normalized.includes("£")) {
    return "GBP";
  }

  return "TRY";
}

function detectAssetCategory(text) {
  const normalized = String(text || "").toLocaleLowerCase("tr-TR");

  if (normalized.includes("altın") || normalized.includes("altin") || normalized.includes("gram") || normalized.includes("ons")) {
    return "Değerli Madenler";
  }

  if (
    normalized.includes("döviz")
    || normalized.includes("doviz")
    || normalized.includes("usd")
    || normalized.includes("eur")
    || normalized.includes("gbp")
    || normalized.includes("dolar")
    || normalized.includes("euro")
    || normalized.includes("sterlin")
  ) {
    return "Döviz";
  }

  return "Nakit/Banka";
}

function detectUnitFromText(text, category) {
  const normalized = String(text || "").toLocaleLowerCase("tr-TR");

  if (category === "Değerli Madenler") {
    if (normalized.includes("ons")) {
      return "ons";
    }

    return "gram";
  }

  return "adet";
}

function detectAmountFromText(text) {
  const source = String(text || "");
  const numberLikeMatches = source.match(/\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?/g);

  if (!Array.isArray(numberLikeMatches) || numberLikeMatches.length === 0) {
    return null;
  }

  for (const raw of numberLikeMatches) {
    const parsed = parseTrNumber(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function extractJsonBlock(text) {
  const raw = String(text || "").trim();
  if (!raw) {
    return null;
  }

  const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectMatch = raw.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    return objectMatch[0].trim();
  }

  return null;
}

function normalizeAssetType(value) {
  const normalized = String(value || "").toLocaleLowerCase("tr-TR");

  if (normalized.includes("maden") || normalized.includes("altın") || normalized.includes("altin") || normalized.includes("gold")) {
    return "Değerli Madenler";
  }

  if (normalized.includes("döviz") || normalized.includes("doviz") || normalized.includes("fx") || normalized.includes("currency")) {
    return "Döviz";
  }

  return "Nakit/Banka";
}

function normalizeCurrency(value) {
  const normalized = String(value || "").trim().toUpperCase();

  if (["USD", "EUR", "GBP", "TRY"].includes(normalized)) {
    return normalized;
  }

  if (normalized === "TL") {
    return "TRY";
  }

  return "TRY";
}

function normalizeUnit(value, category, text) {
  const normalized = String(value || "").trim().toLowerCase();

  if (category === "Değerli Madenler") {
    if (normalized === "ons" || normalized === "ounce") {
      return "ons";
    }

    if (normalized === "gram" || normalized === "gr") {
      return "gram";
    }

    return detectUnitFromText(text, category);
  }

  return "adet";
}

async function callGemini(text) {
  if (!GEMINI_API_KEY) {
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const systemPrompt = [
    "Aşağıdaki Türkçe finans cümlesinden sadece JSON üret.",
    "Alanlar: institution, assetType, amount, currency, unit.",
    "assetType değerleri: Nakit/Banka, Döviz, Değerli Madenler.",
    "currency: TRY, USD, EUR, GBP.",
    "unit: adet, gram, ons.",
    "Sadece geçerli bir JSON nesnesi döndür. Açıklama yazma.",
  ].join(" ");

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${systemPrompt}\n\nMetin: ${text}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };

  const response = await axios.post(url, payload, {
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
    },
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    return null;
  }

  const modelText = response?.data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || "")
    .join("\n")
    .trim();

  const jsonBlock = extractJsonBlock(modelText);
  if (!jsonBlock) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonBlock);
    return {
      institution: String(parsed?.institution || "").trim(),
      assetType: normalizeAssetType(parsed?.assetType),
      amount: parseTrNumber(parsed?.amount),
      currency: normalizeCurrency(parsed?.currency),
      unit: parsed?.unit,
      source: "gemini",
    };
  } catch {
    return null;
  }
}

function parseWithHeuristics(text) {
  const assetType = detectAssetCategory(text);

  return {
    institution: detectInstitutionFromText(text),
    assetType,
    amount: detectAmountFromText(text),
    currency: detectCurrencyFromText(text),
    unit: detectUnitFromText(text, assetType),
    source: "heuristic",
  };
}

async function parseAssetCommand(text) {
  const geminiResult = await callGemini(text);
  const parsed = geminiResult || parseWithHeuristics(text);

  const institution = parsed?.institution || detectInstitutionFromText(text);
  const assetType = normalizeAssetType(parsed?.assetType);
  const amount = Number(parsed?.amount);
  const currency = normalizeCurrency(parsed?.currency);
  const unit = normalizeUnit(parsed?.unit, assetType, text);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Metinden geçerli miktar çıkarılamadı. Örn: 'Ziraat bankasına 50.000 TL ekle'.");
  }

  return {
    institution,
    assetType,
    amount,
    currency,
    unit,
    source: parsed?.source || "heuristic",
  };
}

async function resolveQuotePrice(symbol, fallback = 1) {
  try {
    const result = await getQuoteData(symbol);
    const price = Number(result?.data?.regularMarketPrice);

    if (Number.isFinite(price) && price > 0) {
      return price;
    }
  } catch {
    // Fallback below.
  }

  return fallback;
}

async function resolveGoldGramTryPrice() {
  try {
    const ounceResult = await getQuoteData("GC=F");
    const usdTryResult = await getQuoteData("TRY=X");

    const ounceUsd = Number(ounceResult?.data?.regularMarketPrice);
    const usdTry = Number(usdTryResult?.data?.regularMarketPrice);

    if (Number.isFinite(ounceUsd) && ounceUsd > 0 && Number.isFinite(usdTry) && usdTry > 0) {
      return (ounceUsd * usdTry) / OUNCE_TO_GRAM;
    }
  } catch {
    // Fallback below.
  }

  return 1;
}

async function buildAssetPayload({ parsed, userId }) {
  const bankName = parsed.institution || "Banka Belirtilmedi";

  if (parsed.assetType === "Değerli Madenler") {
    const isOunce = parsed.unit === "ons";

    return {
      user_id: userId,
      symbol: isOunce ? "GC=F" : "GRAM_ALTIN",
      name: isOunce ? "Ons Altın" : "Gram Altın",
      category: "Değerli Madenler",
      amount: parsed.amount,
      cost: isOunce
        ? await resolveQuotePrice("GC=F", 1)
        : await resolveGoldGramTryPrice(),
      bank_name: bankName,
      hesap_turu: "Vadesiz",
      unit_type: isOunce ? "ons" : "gram",
    };
  }

  if (parsed.assetType === "Döviz") {
    const pairByCurrency = {
      USD: "USDTRY=X",
      EUR: "EURTRY=X",
      GBP: "GBPTRY=X",
    };

    const currency = pairByCurrency[parsed.currency] ? parsed.currency : "USD";
    const symbol = pairByCurrency[currency];

    return {
      user_id: userId,
      symbol,
      name: `${currency} Döviz`,
      category: "Döviz",
      amount: parsed.amount,
      cost: await resolveQuotePrice(symbol, 1),
      bank_name: bankName,
      hesap_turu: "Vadesiz",
      unit_type: "adet",
    };
  }

  return {
    user_id: userId,
    symbol: "CASH_TRY",
    name: `${bankName} Nakit`,
    category: "Nakit/Banka",
    amount: parsed.amount,
    cost: 1,
    bank_name: bankName,
    hesap_turu: "Vadesiz",
    unit_type: "adet",
  };
}

async function autoAddParsedAsset({ parsed, userId }) {
  const supabase = getSupabaseAdminClient();
  const payload = await buildAssetPayload({ parsed, userId });

  const { data, error } = await supabase
    .from("assets")
    .insert([payload])
    .select("id,symbol,name,category,amount,cost,bank_name,hesap_turu,unit_type")
    .single();

  if (error) {
    throw new Error(`Varlık kaydedilemedi: ${error.message}`);
  }

  return {
    insertedAsset: data,
    payload,
  };
}

module.exports = {
  parseAssetCommand,
  autoAddParsedAsset,
};
