const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const DISCLAIMER_TEXT = "Bu analiz bir yatirim tavsiyesi degildir, sadece finansal simulasyon ve strateji bilgilendirmesidir.";

function normalizeDistribution(distribution = []) {
  if (!Array.isArray(distribution)) {
    return [];
  }

  return distribution
    .map((item) => ({
      category: String(item?.category || "Diger").trim() || "Diger",
      percent: Number(item?.percent || 0),
      value: Number(item?.value || 0),
    }))
    .filter((item) => Number.isFinite(item.percent) && item.percent >= 0)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 12);
}

function fallbackStrategy({ monthlyIncome, monthlyExpense, investableAmount, distribution }) {
  const savingsRate = monthlyIncome > 0
    ? Math.max(0, ((investableAmount / monthlyIncome) * 100))
    : 0;

  const topCategory = distribution[0]?.category || "Dagilim verisi yok";

  const intro = [
    DISCLAIMER_TEXT,
    `Aylik geliriniz ${monthlyIncome.toLocaleString("tr-TR")} TL, gideriniz ${monthlyExpense.toLocaleString("tr-TR")} TL ve yatirilabilir tutariniz ${investableAmount.toLocaleString("tr-TR")} TL olarak hesaplandi.`,
    `Mevcut portfoyde en buyuk pay: ${topCategory}.`,
  ].join(" ");

  const strategies = [
    "Yatirilabilir tutarinizi kural bazli yonetin: once acil durum fonu, sonra hedef odakli dagilim.",
    "Tek bir varlik sinifinda yogunlasma varsa asamali dengeleme planlayin.",
    `Tasarruf oraninizi (%${savingsRate.toFixed(1)}) sabit tutmak icin aylik otomatik alim tarihi belirleyin.`,
  ];

  const risks = [
    "Piyasa oynakligi nedeniyle kisa vadede gecici deger kayiplari yasanabilir.",
    "Tek varlik sinifina asiri bagimlilik, portfoy riskini artirir.",
    "Likidite ihtiyaci dogarsa uzun vadeli pozisyonlar zararli zamanda bozulabilir.",
  ];

  return {
    disclaimer: DISCLAIMER_TEXT,
    summary: intro,
    strategies,
    risks,
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

async function callGeminiStrategy(payloadData) {
  if (!GEMINI_API_KEY) {
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const systemPrompt = [
    "Sen bir finansal simulasyon asistanisin.",
    "Asla yatirim tavsiyesi vermezsin, bilgilendirici ve senaryo bazli konusursun.",
    "Sadece gecerli JSON dondur.",
    "JSON alani: summary (string), strategies (string[]), risks (string[]).",
    "strategies ve risks en az 3 madde olsun.",
    `summary metninin basina su uyariyi birebir ekle: ${DISCLAIMER_TEXT}`,
  ].join(" ");

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${systemPrompt}\n\nKullanici verisi:\n${JSON.stringify(payloadData, null, 2)}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.25,
      responseMimeType: "application/json",
    },
  };

  const response = await axios.post(url, requestBody, {
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

  const jsonText = extractJson(modelText);
  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText);

    const summary = String(parsed?.summary || "").trim();
    const strategies = Array.isArray(parsed?.strategies)
      ? parsed.strategies.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    const risks = Array.isArray(parsed?.risks)
      ? parsed.risks.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    if (!summary || strategies.length < 1 || risks.length < 1) {
      return null;
    }

    return {
      disclaimer: DISCLAIMER_TEXT,
      summary,
      strategies,
      risks,
      source: "gemini",
    };
  } catch {
    return null;
  }
}

async function generateFinancialStrategy(payload = {}) {
  const monthlyIncome = Number(payload?.monthlyIncome || 0);
  const monthlyExpense = Number(payload?.monthlyExpense || 0);
  const investableAmount = Number(payload?.investableAmount || 0);
  const distribution = normalizeDistribution(payload?.portfolioDistribution);

  const safePayload = {
    monthlyIncome: Number.isFinite(monthlyIncome) ? monthlyIncome : 0,
    monthlyExpense: Number.isFinite(monthlyExpense) ? monthlyExpense : 0,
    investableAmount: Number.isFinite(investableAmount) ? investableAmount : 0,
    portfolioDistribution: distribution,
  };

  const aiResult = await callGeminiStrategy(safePayload);
  if (aiResult) {
    return aiResult;
  }

  return fallbackStrategy({
    monthlyIncome: safePayload.monthlyIncome,
    monthlyExpense: safePayload.monthlyExpense,
    investableAmount: safePayload.investableAmount,
    distribution,
  });
}

module.exports = {
  DISCLAIMER_TEXT,
  generateFinancialStrategy,
};
