require("dotenv").config();

const express = require("express");
const cors = require("cors");
const {
  parseSymbols,
  searchSymbols,
  getQuoteData,
  getQuotesData,
  fetchTefasFundPrice,
} = require("./services/priceService");
const {
  parseAssetCommand,
  normalizeParsedInput,
  autoAddParsedAsset,
} = require("./services/aiParseService");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(express.json());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

app.use(
  cors({
    origin: allowedOrigins,
  })
);

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

  if (query.length < 2) {
    return res.status(400).json({
      ok: false,
      error: "Query param required: q (min 2 chars)",
    });
  }

  try {
    const data = await searchSymbols(query);

    return res.json({
      ok: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Hata Detay�:", error.message);

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
    console.error("Hata Detay�:", error.message);

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
    const data = await getQuotesData(symbols);

    return res.json({
      ok: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Hata Detay�:", error.message);

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
      error: "Fon kodu zorunludur. �rnek: /api/fon-fiyati/MAC",
    });
  }

  if (!/^[a-zA-Z0-9]+$/.test(fundCode)) {
    return res.status(400).json({
      ok: false,
      error: "Ge�ersiz fon kodu format�.",
    });
  }

  try {
    const data = await fetchTefasFundPrice(fundCode);
    return res.json({ ok: true, data });
  } catch (error) {
    console.error("Hata Detay�:", error.message);

    const status = error.status || 502;
    return res.status(status).json({
      ok: false,
      error: error.message || "TEFAS fon fiyat� al�namad�.",
      ...(status === 502 ? { errorMessage: error.message } : {}),
    });
  }
});

// Example: POST /api/ai-add-asset { text: "Garanti'ye 20 bin ekle" }
app.post("/api/ai-add-asset", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";

  if (!text || text.length < 4) {
    return res.status(400).json({
      ok: false,
      error: "Body param required: text (min 4 chars)",
    });
  }

  try {
    const parsed = await parseAssetCommand(text);

    return res.json({
      ok: true,
      message: "AI komutu çözümlendi.",
      data: { parsed },
    });
  } catch (error) {
    console.error("AI parse hata detayi:", error.message);

    return res.status(422).json({
      ok: false,
      error: error.message || "Metin cozumlenemedi.",
    });
  }
});

// Example: POST /api/ai-add-asset/confirm { userId: "...", parsed: { ... } }
app.post("/api/ai-add-asset/confirm", async (req, res) => {
  const userId = typeof req.body?.userId === "string" ? req.body.userId.trim() : "";
  const parsedInput = req.body?.parsed;

  if (!userId) {
    return res.status(400).json({
      ok: false,
      error: "Body param required: userId",
    });
  }

  try {
    const parsed = normalizeParsedInput(parsedInput);
    const result = await autoAddParsedAsset({ parsed, userId });

    return res.json({
      ok: true,
      message: "Başarıyla eklendi!",
      data: {
        parsed,
        insertedAsset: result.insertedAsset,
      },
    });
  } catch (error) {
    console.error("AI confirm/add hata detayi:", error.message);

    return res.status(422).json({
      ok: false,
      error: error.message || "AI sonucu kaydedilemedi.",
    });
  }
});

// Legacy compatibility endpoint
app.post("/api/ai-parse", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  const userId = typeof req.body?.userId === "string" ? req.body.userId.trim() : "";

  if (!text || text.length < 4) {
    return res.status(400).json({ ok: false, error: "Body param required: text (min 4 chars)" });
  }

  if (!userId) {
    return res.status(400).json({ ok: false, error: "Body param required: userId" });
  }

  try {
    const parsed = await parseAssetCommand(text);
    const result = await autoAddParsedAsset({ parsed, userId });

    return res.json({
      ok: true,
      message: "Başarıyla eklendi!",
      data: {
        parsed,
        insertedAsset: result.insertedAsset,
      },
    });
  } catch (error) {
    return res.status(422).json({
      ok: false,
      error: error.message || "Metin cozumlenemedi.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
