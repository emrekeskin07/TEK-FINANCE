import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CarFront,
  Coins,
  Gem,
  Globe,
  Landmark,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

const NET_WORTH_TYPE_OPTIONS = [
  'Gayrimenkul',
  'Araç',
  'Altın (Gram)',
  'Gümüş (Gram)',
  'Döviz (USD/EUR)',
  'Diğer',
];

const VEHICLE_TYPE_OPTIONS = ['Araba', 'SUV', 'Motosiklet', 'Diğer'];
const VEHICLE_BRAND_OPTIONS = ['Honda', 'Toyota', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'Ford', 'Renault', 'Hyundai', 'Diğer'];
const PROPERTY_TYPE_OPTIONS = ['Konut', 'Arsa', 'Dükkan', 'Ofis', 'Yazlık', 'Diğer'];
const FX_CURRENCY_OPTIONS = ['USD', 'EUR'];

const createDefaultVehicle = () => ({
  vehicleType: 'Araba',
  brand: '',
  customBrand: '',
  model: '',
  year: '',
  purchaseYear: '',
});

const createDefaultRealEstate = () => ({
  propertyType: 'Konut',
  location: '',
  year: '',
});

const createDefaultMetal = () => ({
  gramAmount: '',
  manualUnitPriceTry: '',
});

const createDefaultFx = () => ({
  currency: 'USD',
  foreignAmount: '',
  manualRate: '',
});

const CATEGORY_META = {
  vehicle: {
    title: 'Araçlar',
    subtitle: 'Marka, model ve yıl bazında tüm taşıtların',
    icon: CarFront,
    gradient: 'from-violet-500/20 to-fuchsia-500/20',
  },
  realEstate: {
    title: 'Gayrimenkuller',
    subtitle: 'Konut, arsa ve ticari mülklerin',
    icon: Building2,
    gradient: 'from-sky-500/20 to-cyan-500/20',
  },
  gold: {
    title: 'Altın (Gram)',
    subtitle: 'Gram bazlı altın varlıklarının',
    icon: Gem,
    gradient: 'from-amber-500/24 to-yellow-500/20',
  },
  silver: {
    title: 'Gümüş (Gram)',
    subtitle: 'Gram bazlı gümüş varlıklarının',
    icon: Coins,
    gradient: 'from-slate-400/28 to-zinc-400/20',
  },
  fx: {
    title: 'Döviz (USD/EUR)',
    subtitle: 'Döviz bakiyelerinin güncel TRY karşılığı',
    icon: Globe,
    gradient: 'from-emerald-500/20 to-teal-500/20',
  },
};

const BENTO_LAYOUT = [
  { key: 'vehicle', className: 'xl:col-span-6' },
  { key: 'realEstate', className: 'xl:col-span-6' },
  { key: 'gold', className: 'xl:col-span-4' },
  { key: 'silver', className: 'xl:col-span-4' },
  { key: 'fx', className: 'xl:col-span-4' },
];

const formatTl = (value) => new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number.isFinite(Number(value)) ? Number(value) : 0);

const formatCompact = (value, fractionDigits = 2) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '-';
  }

  return numeric.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
};

const normalizeCategory = (type) => {
  const normalized = String(type || '').toLowerCase();

  if (normalized.includes('araç') || normalized.includes('arac') || normalized.includes('araba')) {
    return 'vehicle';
  }

  if (normalized.includes('gayrimenkul')) {
    return 'realEstate';
  }

  if (normalized.includes('altın') || normalized.includes('altin')) {
    return 'gold';
  }

  if (normalized.includes('gümüş') || normalized.includes('gumus')) {
    return 'silver';
  }

  if (normalized.includes('döviz') || normalized.includes('doviz')) {
    return 'fx';
  }

  return 'other';
};

const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const getLiveFxRate = (currency, rates) => {
  const normalizedCurrency = String(currency || 'USD').toUpperCase();
  if (normalizedCurrency === 'EUR') {
    return toPositiveNumber(rates?.EUR);
  }

  return toPositiveNumber(rates?.USD);
};

const getAssetResolvedValue = (asset, marketData, rates) => {
  const category = normalizeCategory(asset?.type);
  const details = asset?.details || {};
  const fallbackValue = toPositiveNumber(asset?.value);

  if (category === 'gold') {
    const gramAmount = toPositiveNumber(details?.gramAmount || details?.gram || details?.quantity);
    const liveGramPrice = toPositiveNumber(marketData?.['GC=F__GRAM'] || marketData?.GRAM_ALTIN);
    const manualGramPrice = toPositiveNumber(details?.manualUnitPriceTry || details?.manualGramPriceTry);
    const unitPrice = liveGramPrice || manualGramPrice;
    const liveValue = gramAmount > 0 && unitPrice > 0 ? gramAmount * unitPrice : fallbackValue;

    return {
      category,
      liveValue,
      gramAmount,
      unitPrice,
      source: liveGramPrice > 0 ? 'live' : (manualGramPrice > 0 ? 'manual' : 'fallback'),
    };
  }

  if (category === 'silver') {
    const gramAmount = toPositiveNumber(details?.gramAmount || details?.gram || details?.quantity);
    const liveGramPrice = toPositiveNumber(marketData?.['SI=F__GRAM']);
    const manualGramPrice = toPositiveNumber(details?.manualUnitPriceTry || details?.manualGramPriceTry);
    const unitPrice = liveGramPrice || manualGramPrice;
    const liveValue = gramAmount > 0 && unitPrice > 0 ? gramAmount * unitPrice : fallbackValue;

    return {
      category,
      liveValue,
      gramAmount,
      unitPrice,
      source: liveGramPrice > 0 ? 'live' : (manualGramPrice > 0 ? 'manual' : 'fallback'),
    };
  }

  if (category === 'fx') {
    const currency = String(details?.currency || 'USD').toUpperCase();
    const foreignAmount = toPositiveNumber(details?.foreignAmount || details?.amount);
    const liveRate = getLiveFxRate(currency, rates);
    const manualRate = toPositiveNumber(details?.manualRate);
    const rate = liveRate || manualRate;
    const liveValue = foreignAmount > 0 && rate > 0 ? foreignAmount * rate : fallbackValue;

    return {
      category,
      liveValue,
      foreignAmount,
      currency,
      rate,
      source: liveRate > 0 ? 'live' : (manualRate > 0 ? 'manual' : 'fallback'),
    };
  }

  return {
    category,
    liveValue: fallbackValue,
    source: 'manual',
  };
};

const buildAssetPresentation = (asset, resolved) => {
  const details = asset?.details || {};

  if (resolved.category === 'vehicle') {
    const brand = String(details?.brand || '').trim();
    const model = String(details?.model || '').trim();
    const year = String(details?.year || '').trim();
    const vehicleType = String(details?.vehicleType || 'Araç').trim();
    const title = [brand, model].filter(Boolean).join(' ') || 'Araç Kaydı';
    const subtitle = [vehicleType, year && `${year} model`].filter(Boolean).join(' • ');

    return { title, subtitle };
  }

  if (resolved.category === 'realEstate') {
    const propertyType = String(details?.propertyType || 'Gayrimenkul').trim();
    const location = String(details?.location || '').trim();
    const year = String(details?.year || '').trim();
    const title = [propertyType, location].filter(Boolean).join(' • ') || 'Gayrimenkul';
    const subtitle = year ? `${year} yapımı` : 'Detay yılı girilmedi';

    return { title, subtitle };
  }

  if (resolved.category === 'gold' || resolved.category === 'silver') {
    const metalLabel = resolved.category === 'gold' ? 'Altın' : 'Gümüş';
    const title = `${formatCompact(resolved.gramAmount, 3)} gram ${metalLabel}`;
    const subtitle = resolved.unitPrice > 0
      ? `1 gr = ${formatTl(resolved.unitPrice)} (${resolved.source === 'live' ? 'canlı' : 'manuel'})`
      : 'Birim fiyat manuel değerden hesaplanıyor';

    return { title, subtitle };
  }

  if (resolved.category === 'fx') {
    const title = `${formatCompact(resolved.foreignAmount, 2)} ${resolved.currency}`;
    const subtitle = resolved.rate > 0
      ? `Kur: ${formatCompact(resolved.rate, 4)} TRY (${resolved.source === 'live' ? 'canlı' : 'manuel'})`
      : 'Kur bilgisi manuel toplama döndü';

    return { title, subtitle };
  }

  return {
    title: String(asset?.type || 'Diğer').trim() || 'Diğer',
    subtitle: 'Manuel varlık kaydı',
  };
};

export default function MalVarligiPage({
  portfolioCashTotal = 0,
  manualAssets = [],
  manualAssetsLoading = false,
  onManualAssetsChange,
  userId,
  marketData = {},
  rates = {},
}) {
  const [varlikTuru, setVarlikTuru] = useState('Gayrimenkul');
  const [toplamDeger, setToplamDeger] = useState('');
  const [aracDetay, setAracDetay] = useState(createDefaultVehicle);
  const [gayrimenkulDetay, setGayrimenkulDetay] = useState(createDefaultRealEstate);
  const [metalDetay, setMetalDetay] = useState(createDefaultMetal);
  const [dovizDetay, setDovizDetay] = useState(createDefaultFx);
  const [kayitlar, setKayitlar] = useState(() => manualAssets);

  useEffect(() => {
    setKayitlar(manualAssets);
  }, [manualAssets]);

  const estimatedFormValue = useMemo(() => {
    if (varlikTuru === 'Altın (Gram)') {
      const gramAmount = toPositiveNumber(metalDetay.gramAmount);
      const liveGramPrice = toPositiveNumber(marketData?.['GC=F__GRAM'] || marketData?.GRAM_ALTIN);
      const manualGramPrice = toPositiveNumber(metalDetay.manualUnitPriceTry);
      const unitPrice = liveGramPrice || manualGramPrice;
      return gramAmount > 0 && unitPrice > 0 ? gramAmount * unitPrice : 0;
    }

    if (varlikTuru === 'Gümüş (Gram)') {
      const gramAmount = toPositiveNumber(metalDetay.gramAmount);
      const liveGramPrice = toPositiveNumber(marketData?.['SI=F__GRAM']);
      const manualGramPrice = toPositiveNumber(metalDetay.manualUnitPriceTry);
      const unitPrice = liveGramPrice || manualGramPrice;
      return gramAmount > 0 && unitPrice > 0 ? gramAmount * unitPrice : 0;
    }

    if (varlikTuru === 'Döviz (USD/EUR)') {
      const currency = String(dovizDetay.currency || 'USD').toUpperCase();
      const foreignAmount = toPositiveNumber(dovizDetay.foreignAmount);
      const liveRate = getLiveFxRate(currency, rates);
      const manualRate = toPositiveNumber(dovizDetay.manualRate);
      const rate = liveRate || manualRate;
      return foreignAmount > 0 && rate > 0 ? foreignAmount * rate : 0;
    }

    return 0;
  }, [varlikTuru, dovizDetay, marketData, metalDetay, rates]);

  const resolvedRecords = useMemo(() => {
    return kayitlar.map((asset) => {
      const resolved = getAssetResolvedValue(asset, marketData, rates);
      return {
        ...asset,
        resolvedValue: resolved.liveValue,
        resolvedMeta: resolved,
      };
    });
  }, [kayitlar, marketData, rates]);

  const manualAssetsTotal = useMemo(
    () => resolvedRecords.reduce((sum, asset) => sum + toPositiveNumber(asset.resolvedValue), 0),
    [resolvedRecords]
  );

  const totalNetWorth = useMemo(
    () => manualAssetsTotal + toPositiveNumber(portfolioCashTotal),
    [manualAssetsTotal, portfolioCashTotal]
  );

  const groupedCategoryData = useMemo(() => {
    const seed = {
      vehicle: [],
      realEstate: [],
      gold: [],
      silver: [],
      fx: [],
    };

    resolvedRecords.forEach((asset) => {
      const key = asset?.resolvedMeta?.category;
      if (seed[key]) {
        seed[key].push(asset);
      }
    });

    return seed;
  }, [resolvedRecords]);

  const resetTypeSpecificFields = (nextType) => {
    if (nextType !== 'Araç') {
      setAracDetay(createDefaultVehicle());
    }
    if (nextType !== 'Gayrimenkul') {
      setGayrimenkulDetay(createDefaultRealEstate());
    }
    if (nextType !== 'Altın (Gram)' && nextType !== 'Gümüş (Gram)') {
      setMetalDetay(createDefaultMetal());
    }
    if (nextType !== 'Döviz (USD/EUR)') {
      setDovizDetay(createDefaultFx());
    }
  };

  const handleTypeChange = (nextType) => {
    setVarlikTuru(nextType);
    setToplamDeger('');
    resetTypeSpecificFields(nextType);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!supabase || !userId) {
      toast.error('Supabase baglantisi hazir degil. .env degerlerini kontrol edin.');
      return;
    }

    const fallbackValue = toPositiveNumber(toplamDeger);
    const valueToStore = estimatedFormValue > 0 ? estimatedFormValue : fallbackValue;

    if (!Number.isFinite(valueToStore) || valueToStore <= 0) {
      toast.error('Lutfen gecerli bir tutar girin.');
      return;
    }

    let detailsPayload = null;

    if (varlikTuru === 'Araç') {
      const resolvedBrand = String(aracDetay.brand === 'Diğer' ? aracDetay.customBrand : aracDetay.brand).trim();
      const resolvedModel = String(aracDetay.model || '').trim();
      const vehicleYear = Number(aracDetay.year);
      const purchaseYear = Number(aracDetay.purchaseYear);
      const currentYear = new Date().getFullYear() + 1;
      const yearValid = Number.isInteger(vehicleYear) && vehicleYear >= 1900 && vehicleYear <= currentYear;
      const purchaseYearValid = !aracDetay.purchaseYear || (Number.isInteger(purchaseYear) && purchaseYear >= 1900 && purchaseYear <= currentYear);

      if (!resolvedBrand || !resolvedModel || !yearValid || !purchaseYearValid) {
        toast.error('Arac icin marka, model ve gecerli yil bilgisi gerekli.');
        return;
      }

      detailsPayload = {
        vehicleType: aracDetay.vehicleType,
        brand: resolvedBrand,
        model: resolvedModel,
        year: vehicleYear,
        purchaseYear: purchaseYearValid ? purchaseYear : null,
      };
    }

    if (varlikTuru === 'Gayrimenkul') {
      const propertyType = String(gayrimenkulDetay.propertyType || 'Gayrimenkul').trim();
      const location = String(gayrimenkulDetay.location || '').trim();
      const builtYear = Number(gayrimenkulDetay.year);
      const currentYear = new Date().getFullYear() + 1;
      const yearValid = !gayrimenkulDetay.year || (Number.isInteger(builtYear) && builtYear >= 1900 && builtYear <= currentYear);

      if (!yearValid) {
        toast.error('Gayrimenkul yili gecersiz.');
        return;
      }

      detailsPayload = {
        propertyType,
        location,
        year: gayrimenkulDetay.year ? builtYear : null,
      };
    }

    if (varlikTuru === 'Altın (Gram)' || varlikTuru === 'Gümüş (Gram)') {
      const gramAmount = toPositiveNumber(metalDetay.gramAmount);
      const manualUnitPriceTry = toPositiveNumber(metalDetay.manualUnitPriceTry);
      if (gramAmount <= 0) {
        toast.error('Gram miktari girmelisiniz.');
        return;
      }

      detailsPayload = {
        gramAmount,
        manualUnitPriceTry: manualUnitPriceTry || null,
      };
    }

    if (varlikTuru === 'Döviz (USD/EUR)') {
      const currency = String(dovizDetay.currency || 'USD').toUpperCase();
      const foreignAmount = toPositiveNumber(dovizDetay.foreignAmount);
      const manualRate = toPositiveNumber(dovizDetay.manualRate);

      if (!FX_CURRENCY_OPTIONS.includes(currency) || foreignAmount <= 0) {
        toast.error('Doviz cinsi ve miktari gecerli olmali.');
        return;
      }

      detailsPayload = {
        currency,
        foreignAmount,
        manualRate: manualRate || null,
      };
    }

    const payload = {
      user_id: userId,
      type: varlikTuru,
      value: valueToStore,
      details: detailsPayload,
    };

    const { data, error } = await supabase
      .from('manual_assets')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('Supabase manual_assets insert hatasi:', error);
      toast.error('Net servet kaydi eklenemedi.');
      return;
    }

    setKayitlar((prev) => {
      const next = [
        ...prev,
        {
          ...data,
          value: toPositiveNumber(data?.value) || valueToStore,
        },
      ];
      onManualAssetsChange?.(next);
      return next;
    });

    setToplamDeger('');
    setAracDetay(createDefaultVehicle());
    setGayrimenkulDetay(createDefaultRealEstate());
    setMetalDetay(createDefaultMetal());
    setDovizDetay(createDefaultFx());

    toast.success('Net servet kalemi eklendi.');
  };

  const handleDelete = async (id) => {
    if (!supabase || !userId) {
      toast.error('Supabase baglantisi hazir degil. .env degerlerini kontrol edin.');
      return;
    }

    const { error } = await supabase
      .from('manual_assets')
      .delete()
      .match({ id, user_id: userId });

    if (error) {
      console.error('Supabase manual_assets delete hatasi:', error);
      toast.error('Kayit silinemedi.');
      return;
    }

    setKayitlar((prev) => {
      const next = prev.filter((item) => item.id !== id);
      onManualAssetsChange?.(next);
      return next;
    });

    toast.success('Kayit silindi.');
  };

  return (
    <section className="space-y-8">
      <div className="surface-card relative overflow-hidden rounded-3xl p-8 md:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-20 h-52 w-52 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-50">Net Servetim</h1>
            <p className="mt-2 text-sm text-slate-400">Tüm varlık kategorileri tek ekranda, tam kontrol sende.</p>
          </div>

          <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-500/15">
              <Landmark className="h-5 w-5 text-emerald-300" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-tight text-slate-400">Toplam Net Servet</p>
              <p className="text-2xl font-black text-emerald-300">{formatTl(totalNetWorth)}</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
            <p className="text-xs uppercase tracking-tight text-slate-400">Banka + Portföy Tarafı</p>
            <p className="mt-1 text-lg font-bold text-cyan-300">{formatTl(portfolioCashTotal)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
            <p className="text-xs uppercase tracking-tight text-slate-400">Manuel Net Servet Kalemleri</p>
            <p className="mt-1 text-lg font-bold text-violet-300">{formatTl(manualAssetsTotal)}</p>
          </div>
        </div>
      </div>

      <div className="surface-card rounded-3xl p-6 md:p-8">
        <div className="mb-4">
          <h2 className="text-xl font-black text-slate-50">Net Servet Kalemi Ekle</h2>
          <p className="mt-1 text-xs text-slate-400">Yıl ve tutar alanları mobil sayısal klavye için optimize edildi.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select
              value={varlikTuru}
              onChange={(event) => handleTypeChange(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-100 outline-none transition-colors focus:border-violet-400/60"
            >
              {NET_WORTH_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option} className="bg-slate-900">
                  {option}
                </option>
              ))}
            </select>

            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={toplamDeger}
              onChange={(event) => setToplamDeger(event.target.value)}
              placeholder={estimatedFormValue > 0 ? 'Gerekirse manuel toplam değer (opsiyonel)' : 'Toplam Değer (TRY)'}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60"
            />
          </div>

          {varlikTuru === 'Araç' ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <select
                value={aracDetay.vehicleType}
                onChange={(event) => setAracDetay((prev) => ({ ...prev, vehicleType: event.target.value }))}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-100 outline-none transition-colors focus:border-violet-400/60"
              >
                {VEHICLE_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option} className="bg-slate-900">
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={aracDetay.brand}
                onChange={(event) => {
                  const nextBrand = event.target.value;
                  setAracDetay((prev) => ({
                    ...prev,
                    brand: nextBrand,
                    customBrand: nextBrand === 'Diğer' ? prev.customBrand : '',
                  }));
                }}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-100 outline-none transition-colors focus:border-violet-400/60"
                required
              >
                <option value="" className="bg-slate-900">Marka Seç</option>
                {VEHICLE_BRAND_OPTIONS.map((option) => (
                  <option key={option} value={option} className="bg-slate-900">
                    {option}
                  </option>
                ))}
              </select>

              {aracDetay.brand === 'Diğer' ? (
                <input
                  type="text"
                  value={aracDetay.customBrand}
                  onChange={(event) => setAracDetay((prev) => ({ ...prev, customBrand: event.target.value }))}
                  placeholder="Marka yaz"
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60"
                  required
                />
              ) : null}

              <input
                type="text"
                value={aracDetay.model}
                onChange={(event) => setAracDetay((prev) => ({ ...prev, model: event.target.value }))}
                placeholder="Model"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60"
                required
              />

              <input
                type="number"
                inputMode="numeric"
                min="1900"
                max={String(new Date().getFullYear() + 1)}
                step="1"
                value={aracDetay.year}
                onChange={(event) => setAracDetay((prev) => ({ ...prev, year: event.target.value }))}
                placeholder="Model Yılı"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60"
                required
              />

              <input
                type="number"
                inputMode="numeric"
                min="1900"
                max={String(new Date().getFullYear() + 1)}
                step="1"
                value={aracDetay.purchaseYear}
                onChange={(event) => setAracDetay((prev) => ({ ...prev, purchaseYear: event.target.value }))}
                placeholder="Satın Alma Yılı"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60"
              />
            </div>
          ) : null}

          {varlikTuru === 'Gayrimenkul' ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <select
                value={gayrimenkulDetay.propertyType}
                onChange={(event) => setGayrimenkulDetay((prev) => ({ ...prev, propertyType: event.target.value }))}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-100 outline-none transition-colors focus:border-violet-400/60"
              >
                {PROPERTY_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option} className="bg-slate-900">
                    {option}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={gayrimenkulDetay.location}
                onChange={(event) => setGayrimenkulDetay((prev) => ({ ...prev, location: event.target.value }))}
                placeholder="Konum / Şehir"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60"
              />

              <input
                type="number"
                inputMode="numeric"
                min="1900"
                max={String(new Date().getFullYear() + 1)}
                step="1"
                value={gayrimenkulDetay.year}
                onChange={(event) => setGayrimenkulDetay((prev) => ({ ...prev, year: event.target.value }))}
                placeholder="Yapım Yılı"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60"
              />
            </div>
          ) : null}

          {varlikTuru === 'Altın (Gram)' || varlikTuru === 'Gümüş (Gram)' ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.001"
                value={metalDetay.gramAmount}
                onChange={(event) => setMetalDetay((prev) => ({ ...prev, gramAmount: event.target.value }))}
                placeholder="Gram Miktarı"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60"
                required
              />

              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={metalDetay.manualUnitPriceTry}
                onChange={(event) => setMetalDetay((prev) => ({ ...prev, manualUnitPriceTry: event.target.value }))}
                placeholder="Canlı fiyat yoksa 1gr TRY (opsiyonel)"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60"
              />

              <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-xs text-slate-400">
                Tahmini canlı değer: <span className="font-semibold text-slate-100">{estimatedFormValue > 0 ? formatTl(estimatedFormValue) : '-'}</span>
              </div>
            </div>
          ) : null}

          {varlikTuru === 'Döviz (USD/EUR)' ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <select
                value={dovizDetay.currency}
                onChange={(event) => setDovizDetay((prev) => ({ ...prev, currency: event.target.value }))}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-100 outline-none transition-colors focus:border-violet-400/60"
              >
                {FX_CURRENCY_OPTIONS.map((option) => (
                  <option key={option} value={option} className="bg-slate-900">
                    {option}
                  </option>
                ))}
              </select>

              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={dovizDetay.foreignAmount}
                onChange={(event) => setDovizDetay((prev) => ({ ...prev, foreignAmount: event.target.value }))}
                placeholder="Döviz Miktarı"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60"
                required
              />

              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.0001"
                value={dovizDetay.manualRate}
                onChange={(event) => setDovizDetay((prev) => ({ ...prev, manualRate: event.target.value }))}
                placeholder="Canlı kur yoksa manuel kur (opsiyonel)"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-violet-400/60"
              />

              <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-xs text-slate-400">
                Tahmini canlı değer: <span className="font-semibold text-slate-100">{estimatedFormValue > 0 ? formatTl(estimatedFormValue) : '-'}</span>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-fuchsia-300/35 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25 px-5 py-2.5 text-sm font-semibold text-slate-50 transition-all duration-200 hover:from-violet-500/35 hover:to-fuchsia-500/35"
            >
              Kalemi Ekle
            </button>
          </div>
        </form>
      </div>

      {manualAssetsLoading ? (
        <div className="surface-card rounded-3xl p-8 text-slate-400">Net servet kayıtları yükleniyor...</div>
      ) : (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
          {BENTO_LAYOUT.map((layout) => {
            const meta = CATEGORY_META[layout.key];
            const Icon = meta.icon;
            const records = groupedCategoryData[layout.key] || [];
            const categoryTotal = records.reduce((sum, item) => sum + toPositiveNumber(item.resolvedValue), 0);

            return (
              <article
                key={layout.key}
                className={`surface-card relative overflow-hidden rounded-3xl p-7 ${layout.className}`}
              >
                <div className={`pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${meta.gradient} blur-3xl`} />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-tight text-slate-400">{meta.subtitle}</p>
                      <h3 className="mt-1 text-2xl font-black text-slate-50">{meta.title}</h3>
                    </div>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-950/60 text-slate-200">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>

                  <p className="mt-5 text-3xl font-black text-emerald-300">{formatTl(categoryTotal)}</p>

                  {records.length === 0 ? (
                    <p className="mt-5 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4 text-sm text-slate-500">
                      Henüz bu kategoride kayıt yok.
                    </p>
                  ) : (
                    <ul className="mt-5 space-y-3">
                      {records.map((asset) => {
                        const presentation = buildAssetPresentation(asset, asset.resolvedMeta);

                        return (
                          <li
                            key={asset.id}
                            className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-100">{presentation.title}</p>
                                <p className="mt-1 text-xs text-slate-400">{presentation.subtitle}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-100">{formatTl(asset.resolvedValue)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(asset.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-300/30 bg-rose-500/10 text-rose-300 transition-colors hover:bg-rose-500/20"
                                  title="Kaydı sil"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
