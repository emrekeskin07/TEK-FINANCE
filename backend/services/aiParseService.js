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

  if (normalized.includes("gümüş") || normalized.includes("gumus") || normalized.includes("silver")) {
    return "Gümüş";
  }

  if (normalized.includes("altın") || normalized.includes("altin") || normalized.includes("gram") || normalized.includes("ons")) {
    return "Altın";
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

  return "Nakit";
}

function detectUnitFromText(text, category) {
  const normalized = String(text || "").toLocaleLowerCase("tr-TR");

  if (category === "Değerli Madenler" || category === "Altın" || category === "Gümüş") {
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

function detectQuantityFromUnitText(text) {
  const source = String(text || "");
  const quantityMatch = source.match(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(gram|gr|lot|adet|ons)\b/i);

  if (!quantityMatch?.[1]) {
    return null;
  }

  const parsed = parseTrNumber(quantityMatch[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

  if (normalized.includes("gümüş") || normalized.includes("gumus") || normalized.includes("silver")) {
    return "Gümüş";
  }

  if (normalized.includes("maden") || normalized.includes("altın") || normalized.includes("altin") || normalized.includes("gold")) {
    return "Altın";
  }

  if (normalized.includes("döviz") || normalized.includes("doviz") || normalized.includes("fx") || normalized.includes("currency")) {
    return "Döviz";
  }

  return "Nakit";
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

  if (category === "Altın" || category === "Gümüş") {
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
    "Bu Türkçe metindeki finansal varlık girişini JSON olarak parçala:",
    "Kurum (institution), Tür (assetType), Miktar (quantity), Tutar (amount), Para Birimi (currency), Birim (unit).",
    "Eğer kullanıcı gram veya lot belirtiyorsa, bu sayıyı miktar (quantity) alanına ata.",
    "Eğer sadece TL/Dolar tutarı belirtiyorsa tutar (amount) alanına ata.",
    "assetType değerleri: Nakit, Altın, Gümüş, Döviz.",
    "currency: TRY, USD, EUR, GBP.",
    "unit: adet, gram, ons.",
    "Sadece geçerli bir JSON nesnesi döndür. Açıklama ekleme.",
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
      quantity: parseTrNumber(parsed?.quantity),
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
  const quantity = detectQuantityFromUnitText(text);

  return {
    institution: detectInstitutionFromText(text),
    assetType,
    quantity,
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
  const unit = normalizeUnit(parsed?.unit, assetType, text);
  const quantityFromText = detectQuantityFromUnitText(text);
  const parsedQuantity = Number(parsed?.quantity);
  const parsedAmount = Number(parsed?.amount);

  // gram/lot/ons/adet belirtilmişse miktar alanını önceliklendir.
  const resolvedAmount = Number.isFinite(parsedQuantity) && parsedQuantity > 0
    ? parsedQuantity
    : (Number.isFinite(quantityFromText) && quantityFromText > 0
      ? quantityFromText
      : parsedAmount);

  const currency = normalizeCurrency(parsed?.currency);
  const amount = Number(resolvedAmount);

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

function normalizeParsedInput(parsedInput = {}) {
  const institution = String(parsedInput?.institution || "").trim() || "Banka Belirtilmedi";
  const assetType = normalizeAssetType(parsedInput?.assetType);
  const amount = parseTrNumber(parsedInput?.quantity) || parseTrNumber(parsedInput?.amount);
  const currency = normalizeCurrency(parsedInput?.currency);
  const unit = normalizeUnit(parsedInput?.unit, assetType, "");

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Onaylanan AI verisindeki tutar gecersiz.");
  }

  return {
    institution,
    assetType,
    amount,
    currency,
    unit,
    source: "confirmed",
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

async function resolveSilverGramTryPrice() {
  try {
    const ounceResult = await getQuoteData("SI=F");
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

  if (parsed.assetType === "Altın" || parsed.assetType === "Gümüş" || parsed.assetType === "Değerli Madenler") {
    const isSilver = parsed.assetType === "Gümüş";
    const isOunce = parsed.unit === "ons";
    const symbol = isSilver ? "SI=F" : (isOunce ? "GC=F" : "GRAM_ALTIN");
    const name = isSilver
      ? (isOunce ? "Ons Gümüş" : "Gram Gümüş")
      : (isOunce ? "Ons Altın" : "Gram Altın");
    const cost = isSilver
      ? (isOunce ? await resolveQuotePrice("SI=F", 1) : await resolveSilverGramTryPrice())
      : (isOunce ? await resolveQuotePrice("GC=F", 1) : await resolveGoldGramTryPrice());

    return {
      user_id: userId,
      symbol,
      name,
      category: "Değerli Madenler",
      amount: parsed.amount,
      cost,
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
  normalizeParsedInput,
  autoAddParsedAsset,
};
