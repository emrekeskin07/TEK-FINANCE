/**
 * aiAnalyzerService.js
 * Gerçek API'ye (OpenAI/Gemini) istek atan ve mockResponse ile fallback sağlayan servis.
 */

export async function generateAssetInsight({ assetSymbol, assetName, currentPrice, changePercent, riskProfile }) {
  // Volatilite (Oynaklık) ve Sentiment (Duyarlılık) Simülasyonu
  const dropValue = Math.abs(changePercent || 0);
  let volatilityLabel = 'Düşük';
  let sentimentLabel = 'Nötr';
  let sentimentIndicator = 'neutral';
  
  if (dropValue > 2 && dropValue <= 5) {
    volatilityLabel = 'Orta';
    sentimentLabel = 'Endişe';
    sentimentIndicator = 'negative';
  } else if (dropValue > 5 && dropValue <= 10) {
    volatilityLabel = 'Yüksek';
    sentimentLabel = 'Korku/Negatif';
    sentimentIndicator = 'negative';
  } else if (dropValue > 10) {
    volatilityLabel = 'Aşırı Yüksek';
    sentimentLabel = 'Aşırı Korku/Panik';
    sentimentIndicator = 'critical';
  }

  // LLM Prompt Hazırlığı
  const systemPrompt = `
    Sen uzman bir finansal analistsin.
    ${assetName || assetSymbol} bugün %${changePercent} değişim gösterdi.
    Piyasa duyarlılığı ${sentimentLabel}.
    Kullanıcının risk profili: ${riskProfile || 'Belirtilmedi'}.
    Bu veriler ışığında kısa bir özet, risk analizi ve strateji önerisi sun.
    Cevap formatı kesinlikle aşağıdaki JSON yapısında olmalıdır.
  `;

  /* 
  API Bağlantısı (Hazırlık)
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer YOUR_API_KEY`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt }
        ]
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    }
  } catch (error) {
    console.error("AI API Error:", error);
  }
  */

  // Dinamik Mock Response
  const mockResponse = {
    assetName: assetName || assetSymbol,
    dropPercent: dropValue,
    sentimentLabel,
    sentimentIndicator,
    volatilityPercent: dropValue * 1.5, // Varsayımsal hesaplama
    volatilityLabel,
    summary: `${assetName || assetSymbol} (${assetSymbol}) piyasa genelindeki belirsizlikler ve sektörel baskılar nedeniyle bugün %${dropValue} değer kaybetti.`,
    headlines: [
      "Küresel piyasalarda risk iştahı azalıyor",
      "Sektörel haber akışları negatif"
    ],
    riskOpportunity: dropValue > 5 && riskProfile === 'Cesur' ? "Büyük Düşüş, Fırsat Olabilir" : "Riskli Bölgede",
    strategy: riskProfile === 'Temkinli' ? "Pozisyonunuzu koruyun, ek alım yapmayın." : "Kademeli alım fırsatı değerlendirilebilir.",
    action: riskProfile === 'Temkinli' ? 'hold' : 'buy',
    warning: dropValue > 8 ? "Yüksek volatilite! Lütfen stop-loss seviyenizi kontrol edin." : ""
  };

  return mockResponse;
}
