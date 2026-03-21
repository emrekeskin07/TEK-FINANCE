const ACTION_ADD_KEYWORDS = [
  'ekle',
  'al',
  'alim',
  'satın al',
  'portfoye ekle',
  'portfoyume ekle',
  'yatir',
  'yatır',
];

const ACTION_QUERY_KEYWORDS = [
  'ne durumda',
  'durumu',
  'goster',
  'göster',
  'kac',
  'kaç',
  'nedir',
  'analiz',
  'sorgu',
  '?',
];

const ACTION_UPDATE_KEYWORDS = [
  'guncelle',
  'güncelle',
  'duzelt',
  'düzelt',
  'degistir',
  'değiştir',
  'revize',
];

const CURRENCY_UNITS = ['tl', 'try', 'usd', 'eur'];
const QUANTITY_UNITS = ['gram', 'gr', 'adet', 'lot'];

const ASSET_TYPE_RULES = [
  { type: 'gold', tokens: ['altin', 'altın', 'gram altin', 'gram altın', 'ons altin', 'ons altın'] },
  { type: 'silver', tokens: ['gumus', 'gümüş', 'gram gumus', 'gram gümüş'] },
  { type: 'fund', tokens: ['fon', 'yatirim fonu', 'yatırım fonu', 'tefas'] },
  { type: 'cash', tokens: ['nakit', 'cash', 'vadesiz', 'mevduat'] },
  { type: 'stock', tokens: ['hisse', 'hissesi', 'stock', 'pay'] },
];

const STOP_WORDS = [
  ...ACTION_ADD_KEYWORDS,
  ...ACTION_QUERY_KEYWORDS,
  ...ACTION_UPDATE_KEYWORDS,
  ...CURRENCY_UNITS,
  ...QUANTITY_UNITS,
  'portfoyum',
  'portföyüm',
  'portfoy',
  'portföy',
  'eklemek',
  'ekler misin',
  'istiyorum',
  'adet',
  'hisse',
  'hissesi',
  'gram',
  'gr',
  'alir misin',
  'alır mısın',
  'icin',
  'için',
];

function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function toFiniteNumber(value) {
  const numeric = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(numeric) ? numeric : null;
}

function detectIntent(normalized) {
  if (!normalized) {
    return 'unknown';
  }

  if (ACTION_QUERY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'query';
  }

  if (ACTION_UPDATE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'update';
  }

  if (ACTION_ADD_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'add';
  }

  return 'unknown';
}

function detectAssetType(normalized) {
  const match = ASSET_TYPE_RULES.find((rule) => rule.tokens.some((token) => normalized.includes(token)));
  return match ? match.type : 'stock';
}

function extractQuantityAndUnit(rawInput) {
  const raw = String(rawInput || '');
  const withUnitMatch = raw.match(/(\d+(?:[\.,]\d+)?)\s*(gram|gr|adet|lot|tl|try|usd|eur)\b/i);

  if (withUnitMatch) {
    const quantity = toFiniteNumber(withUnitMatch[1]);
    const unit = normalizeText(withUnitMatch[2]);

    return {
      quantity,
      unit,
      amount: unit === 'tl' || unit === 'try' || unit === 'usd' || unit === 'eur' ? quantity : null,
      currency: unit === 'tl' ? 'TRY' : unit.toUpperCase(),
    };
  }

  const plainNumberMatch = raw.match(/(\d+(?:[\.,]\d+)?)/);
  if (plainNumberMatch) {
    return {
      quantity: toFiniteNumber(plainNumberMatch[1]),
      unit: null,
      amount: null,
      currency: null,
    };
  }

  return {
    quantity: null,
    unit: null,
    amount: null,
    currency: null,
  };
}

function extractAssetName(rawInput) {
  const raw = String(rawInput || '').trim();
  if (!raw) {
    return '';
  }

  const collapsed = raw
    .replace(/\d+(?:[\.,]\d+)?\s*(gram|gr|adet|lot|tl|try|usd|eur)?/gi, ' ')
    .replace(/[?.,!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = collapsed
    .split(' ')
    .filter(Boolean)
    .filter((token) => !STOP_WORDS.includes(normalizeText(token)));

  const candidate = tokens.join(' ').trim();
  if (!candidate) {
    return '';
  }

  return candidate
    .split(' ')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}

function buildKind(intent, normalized) {
  if (intent === 'query') {
    if (normalized.includes('portfoyum') || normalized.includes('portföyüm')) {
      return 'portfolio_status';
    }

    if (normalized.includes('hedefime')) {
      return 'goal_status';
    }

    if (normalized.includes('altin fiyati') || normalized.includes('altın fiyatı') || normalized.includes('gram altin') || normalized.includes('gram altın')) {
      return 'gold_price';
    }

    return 'market_query';
  }

  if (intent === 'add') {
    return 'add_asset';
  }

  if (intent === 'update') {
    return 'update_asset';
  }

  return 'unknown';
}

function buildSuggestion(parsed) {
  const quantityText = parsed.quantity ? String(parsed.quantity).replace('.', ',') : '';
  const unitText = parsed.unit || (parsed.asset_type === 'gold' || parsed.asset_type === 'silver' ? 'gram' : 'adet');
  const assetText = parsed.asset_name || (parsed.asset_type === 'gold' ? 'altın' : (parsed.asset_type === 'silver' ? 'gümüş' : 'varlık'));

  if (!quantityText && !assetText) {
    return 'Did you mean: "70 gram gümüş eklemek"?';
  }

  return `Did you mean: "${quantityText ? `${quantityText} ${unitText}` : ''} ${assetText} eklemek"?`.replace(/\s+/g, ' ').trim();
}

export function parseNaturalInvestmentCommand(inputText) {
  const raw = String(inputText || '').trim();
  const normalized = normalizeText(raw);
  const intent = detectIntent(normalized);

  const quantityData = extractQuantityAndUnit(raw);
  const asset_type = detectAssetType(normalized);
  const asset_name = extractAssetName(raw);
  const kind = buildKind(intent, normalized);

  const hasMeaningfulAddFields = kind === 'add_asset'
    ? Boolean(quantityData.quantity) && (asset_type !== 'stock' || Boolean(asset_name))
    : true;

  const isUnknown = kind === 'unknown' || !hasMeaningfulAddFields;

  const parsed = {
    raw,
    normalized,
    kind: isUnknown ? 'unknown' : kind,
    intent: isUnknown ? 'unknown' : intent,
    asset_type,
    asset_name,
    quantity: quantityData.quantity,
    unit: quantityData.unit,
    amount: quantityData.amount,
    currency: quantityData.currency,
    confidence: isUnknown ? 0.35 : 0.86,
    suggestion: isUnknown ? buildSuggestion({ asset_type, asset_name, ...quantityData }) : '',
  };

  if (parsed.asset_type === 'gold') {
    parsed.assetType = 'altin';
  } else if (parsed.asset_type === 'silver') {
    parsed.assetType = 'gumus';
  } else if (parsed.asset_type === 'cash') {
    parsed.assetType = 'nakit';
  } else if (parsed.asset_type === 'stock') {
    parsed.assetType = 'stock';
  } else if (parsed.asset_type === 'fund') {
    parsed.assetType = 'fund';
  } else {
    parsed.assetType = 'nakit';
  }

  if (parsed.assetType === 'stock' && parsed.currency === 'USD') {
    parsed.assetType = 'usd';
  }

  return parsed;
}
