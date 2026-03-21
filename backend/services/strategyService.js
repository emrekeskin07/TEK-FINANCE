const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const DISCLAIMER_TEXT = "Bu analiz bir yatirim tavsiyesi degildir, sadece finansal simulasyon ve strateji bilgilendirmesidir.";
const REQUIRED_WARNING_TEXT = "Bu bir yatırım tavsiyesi değildir";
const SMART_SUGGESTIONS_SYSTEM_PROMPT = "Sen profesyonel bir matematiksel modelleme asistanısın. Görevin kullanıcıya finansal verileri analiz etmektir. KESİNLİKLE yatırım tavsiyesi verme. Asla 'şu hisseyi al' veya 'bunu sat' gibi emir cümleleri kurma. Bunun yerine 'X varlık sınıfındaki artış potansiyeli matematiksel olarak incelenebilir' veya 'Portföy çeşitlendirmesi için Y kategorisi bir seçenek olabilir' şeklinde genel ve stratejik bir dil kullan. Cevabın en başında mutlaka 'Bu bir yatırım tavsiyesi değildir' uyarısını göster.";
const RISK_PROFILE_PROMPT = "Görevin, kullanıcının seçtiği {risk_profil} profiline göre matematiksel modelleme yapmaktır. Eğer profil Muhafazakar ise: Analizlerinde düşük oynaklıklı (low volatility) varlık sınıflarına ve sermaye koruma stratejilerine odaklan. Eğer profil Dengeli ise: Analizlerinde çeşitlendirilmiş (diversified) ve orta vadeli büyüme stratejilerini ön plana çıkar. Eğer profil Atılgan ise: Analizlerinde yüksek büyüme potansiyeli olan ancak oynaklığı yüksek (high volatility) varlık sınıfları ve dinamik stratejiler üzerine yoğunlaş.";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;

function getSupabaseAdminClient() {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY backend .env icinde zorunludur.");
  }

  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAdmin;
}

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

function normalizeRiskProfile(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "muhafazakar" || normalized === "safe") {
    return "Muhafazakar";
  }

  if (normalized === "atilgan" || normalized === "aggressive") {
    return "Atılgan";
  }

  return "Dengeli";
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

function fallbackSmartSuggestions({ portfolioDistribution, dashboardTotalValue, userPrompt, riskProfile }) {
  const topCategory = portfolioDistribution[0]?.category || "Dagilim verisi yok";
  const diversified = portfolioDistribution.length >= 3;

  const baseComment = diversified
    ? `Portfoy dagilimi birden fazla varlik sinifina yayilmis gorunuyor. Toplam buyukluk ${Number(dashboardTotalValue || 0).toLocaleString("tr-TR")} TL civarinda ve en buyuk kategori ${topCategory}.`
    : `Portfoy daha dar bir dagilimda. Toplam buyukluk ${Number(dashboardTotalValue || 0).toLocaleString("tr-TR")} TL civarinda ve ${topCategory} agirligi yuksek.`;

  const userContext = String(userPrompt || "").trim();
  const profileContext = `Secilen risk profili: ${riskProfile}.`;
  const marketComment = userContext
    ? `${REQUIRED_WARNING_TEXT}. ${profileContext} Sorunuz: "${userContext}". ${baseComment}`
    : `${REQUIRED_WARNING_TEXT}. ${profileContext} ${baseComment}`;

  const riskStrategiesByProfile = {
    Muhafazakar: [
      "Düşük oynaklıklı varlık sınıfları ve sermaye koruma yaklaşımıyla dağılımı dengeleme matematiksel olarak incelenebilir.",
      "Likidite tamponu ve mevduat/altın ağırlığının dönemsel yeniden dengelemesi düşünülebilir.",
      "Toplam dalgalanmayı sınırlamak için korelasyonu düşük varlıklarla kademeli dağıtım uygulanabilir.",
    ],
    Dengeli: [
      "Çeşitlendirilmiş (diversified) dağılımla orta vadeli büyüme ve risk dengesi optimize edilebilir.",
      "Hisse ve değerli maden karışımının dönemsel volatiliteye göre yeniden ağırlıklandırılması değerlendirilebilir.",
      "Portföy beta seviyesini makul aralıkta tutacak şekilde çoklu varlık sınıfı yaklaşımı sürdürülebilir.",
    ],
    "Atılgan": [
      "Yüksek büyüme potansiyeli olan ancak oynaklığı yüksek sınıflar için pozisyon boyutu kontrolü uygulanabilir.",
      "Dinamik stratejilerde geri çekilme senaryoları ve maksimum düşüş toleransı matematiksel olarak takip edilmelidir.",
      "Büyüme odaklı varlıklarda yoğunlaşma riskini sınırlamak için eşik bazlı dengeleme planı düşünülebilir.",
    ],
  };

  return {
    disclaimer: DISCLAIMER_TEXT,
    marketComment,
    strategyNotes: riskStrategiesByProfile[riskProfile] || riskStrategiesByProfile.Dengeli,
    riskProfile,
    source: "fallback",
  };
}

async function generateSmartSuggestions(payload = {}) {
  const portfolioDistribution = normalizeDistribution(payload?.portfolioDistribution);
  const dashboardTotalValue = Number(payload?.dashboardTotalValue || 0);
  const userPrompt = String(payload?.userPrompt || "").trim();
  const riskProfile = normalizeRiskProfile(payload?.riskProfile);

  const aiPayload = {
    dashboardTotalValue: Number.isFinite(dashboardTotalValue) ? dashboardTotalValue : 0,
    portfolioDistribution,
    userPrompt,
    riskProfile,
  };

  if (GEMINI_API_KEY) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const systemPrompt = [
      SMART_SUGGESTIONS_SYSTEM_PROMPT,
      RISK_PROFILE_PROMPT.replace("{risk_profil}", riskProfile),
      "Sadece JSON dondur.",
      "Alanlar: marketComment (string), strategyNotes (string[]).",
      "strategyNotes en az 3 madde olsun.",
      `marketComment metni mutlaka '${REQUIRED_WARNING_TEXT}' ifadesiyle baslasin.`,
      "Hangi profil secilirse secilsin 'Yatırım Tavsiyesi Değildir' kisitlamasina ve genel strateji diline sadik kal.",
    ].join(" ");

    const response = await axios.post(url, {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\n\nKullanici sorusu:\n${userPrompt || "Portfoy dagilimini genel olarak analiz et."}\n\nVeri:\n${JSON.stringify(aiPayload, null, 2)}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    }, {
      timeout: 15000,
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
    });

    if (response.status >= 200 && response.status < 300) {
      const modelText = response?.data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || "")
        .join("\n")
        .trim();
      const jsonText = extractJson(modelText);

      if (jsonText) {
        try {
          const parsed = JSON.parse(jsonText);
          const marketComment = String(parsed?.marketComment || "").trim();
          const strategyNotes = Array.isArray(parsed?.strategyNotes)
            ? parsed.strategyNotes.map((item) => String(item || "").trim()).filter(Boolean)
            : [];
          const marketCommentWithWarning = marketComment.startsWith(REQUIRED_WARNING_TEXT)
            ? marketComment
            : `${REQUIRED_WARNING_TEXT}. ${marketComment}`;

          if (marketComment && strategyNotes.length) {
            return {
              disclaimer: DISCLAIMER_TEXT,
              marketComment: marketCommentWithWarning,
              strategyNotes,
              riskProfile,
              source: "gemini",
            };
          }
        } catch {
          // fallback below
        }
      }
    }
  }

  return fallbackSmartSuggestions({
    portfolioDistribution,
    dashboardTotalValue,
    userPrompt,
    riskProfile,
  });
}

async function increaseAssetPosition({ userId, assetId, addedAmount, buyPrice }) {
  const supabase = getSupabaseAdminClient();

  const safeAssetId = Number(assetId);
  const safeAddedAmount = Number(addedAmount);
  const safeBuyPrice = Number(buyPrice);

  if (!Number.isFinite(safeAssetId) || safeAssetId <= 0) {
    throw new Error("Gecerli assetId zorunludur.");
  }

  if (!Number.isFinite(safeAddedAmount) || safeAddedAmount <= 0) {
    throw new Error("Yeni alinan miktar sifirdan buyuk olmalidir.");
  }

  if (!Number.isFinite(safeBuyPrice) || safeBuyPrice <= 0) {
    throw new Error("Alis fiyati sifirdan buyuk olmalidir.");
  }

  const { data: currentAsset, error: currentError } = await supabase
    .from("assets")
    .select("*")
    .eq("id", safeAssetId)
    .eq("user_id", userId)
    .maybeSingle();

  if (currentError || !currentAsset) {
    throw new Error("Artirilacak varlik bulunamadi.");
  }

  const currentAmount = Number(currentAsset.amount || 0);
  const currentCost = Number(currentAsset.cost || 0);
  const nextAmount = currentAmount + safeAddedAmount;
  const weightedCost = nextAmount > 0
    ? (((currentAmount * currentCost) + (safeAddedAmount * safeBuyPrice)) / nextAmount)
    : safeBuyPrice;

  const { data: updatedAsset, error: updateError } = await supabase
    .from("assets")
    .update({
      amount: Number(nextAmount.toFixed(8)),
      cost: Number(weightedCost.toFixed(8)),
    })
    .eq("id", safeAssetId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(`Miktar artirimi kaydedilemedi: ${updateError.message}`);
  }

  return updatedAsset;
}

module.exports = {
  DISCLAIMER_TEXT,
  generateFinancialStrategy,
  generateSmartSuggestions,
  increaseAssetPosition,
};
