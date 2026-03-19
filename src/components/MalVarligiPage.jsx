import React, { useEffect, useMemo, useState } from 'react';
import { Trash2, Landmark } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';

const MANUEL_VARLIK_TURLERI = ['Gayrimenkul', 'Araç', 'Diğer'];
const ARAC_TURU_OPTIONS = ['Araba', 'Motosiklet', 'Diğer'];
const ARAC_MARKA_OPTIONS = ['Honda', 'Toyota', 'Volkswagen', 'Ford', 'BMW', 'Mercedes-Benz', 'Renault', 'Hyundai', 'Diğer'];

const createDefaultAracDetay = () => ({
  tur: 'Araba',
  marka: '',
  customMarka: '',
  model: '',
  yil: '',
  satinAlmaTarihi: '',
});

function formatTl(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export default function MalVarligiPage({
  portfolioCashTotal = 0,
  manualAssets = [],
  manualAssetsLoading = false,
  onManualAssetsChange,
  userId,
}) {
  const [varlikTuru, setVarlikTuru] = useState('Gayrimenkul');
  const [toplamDeger, setToplamDeger] = useState('');
  const [aracDetay, setAracDetay] = useState(createDefaultAracDetay);
  const [kayitlar, setKayitlar] = useState(() => manualAssets);

  const manuelToplam = useMemo(
    () => kayitlar.reduce((acc, item) => acc + item.value, 0),
    [kayitlar]
  );

  const toplamMalVarligi = useMemo(
    () => manuelToplam + portfolioCashTotal,
    [manuelToplam, portfolioCashTotal]
  );

  useEffect(() => {
    setKayitlar(manualAssets);
  }, [manualAssets]);

  const handleTypeChange = (nextType) => {
    setVarlikTuru(nextType);
    if (nextType !== 'Araç') {
      setAracDetay(createDefaultAracDetay());
    }
  };

  const getRecordPresentation = (item) => {
    if (item.type === 'Araç') {
      const detay = item?.details || {};
      const yil = detay.year ? String(detay.year) : '';
      const marka = detay.brand || '';
      const model = detay.model || '';
      const aracTuru = detay.vehicleType || 'Araç';
      const title = [yil, marka, model].filter(Boolean).join(' ').trim() || 'Araç';

      return {
        title,
        subtitle: `Araç • ${aracTuru}`,
      };
    }

    return {
      title: item.type,
      subtitle: null,
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (varlikTuru === 'Nakit') {
      return;
    }

    const numericValue = Number(toplamDeger);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return;
    }

    if (varlikTuru === 'Araç') {
      const yearValue = Number(aracDetay.yil);
      const resolvedBrand = (aracDetay.marka === 'Diğer' ? aracDetay.customMarka : aracDetay.marka).trim();
      const isYearValid = Number.isInteger(yearValue) && yearValue >= 1900 && yearValue <= new Date().getFullYear() + 1;
      if (!resolvedBrand || !aracDetay.model.trim() || !isYearValid) {
        return;
      }
    }

    if (!supabase || !userId) {
      toast.error('Supabase baglantisi hazir degil. .env degerlerini kontrol edin.');
      return;
    }

    const payload = {
      user_id: userId,
      type: varlikTuru,
      value: numericValue,
      details: varlikTuru === 'Araç'
        ? {
            vehicleType: aracDetay.tur,
            brand: (aracDetay.marka === 'Diğer' ? aracDetay.customMarka : aracDetay.marka).trim(),
            model: aracDetay.model.trim(),
            year: Number(aracDetay.yil),
            purchaseDate: aracDetay.satinAlmaTarihi || null,
          }
        : null,
    };

    const { data, error } = await supabase
      .from('manual_assets')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('Supabase manual_assets insert hatasi:', error);
      toast.error('Manuel mal varligi kaydi eklenemedi.');
      return;
    }

    setKayitlar((prev) => {
      const next = [
        ...prev,
        {
          ...data,
          value: Number(data?.value) || payload.value,
        },
      ];
      onManualAssetsChange?.(next);
      return next;
    });

    setToplamDeger('');
    if (varlikTuru === 'Araç') {
      setAracDetay(createDefaultAracDetay());
    }

    toast.success('Manuel mal varligi kaydi eklendi.');
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
      toast.error('Manuel mal varligi kaydi silinemedi.');
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
    <section className="space-y-6">
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-[0_20px_80px_rgba(15,23,42,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Toplam Mal Varlığı</p>
            <h2 className="text-3xl font-bold text-emerald-300 mt-1">{formatTl(toplamMalVarligi)}</h2>
            <p className="text-xs text-slate-500 mt-2">Bankadaki Toplam Nakit: {formatTl(portfolioCashTotal)}</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
            <Landmark className="w-6 h-6 text-emerald-300" />
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-5 md:p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">Mal Varlığı Ekle</h3>
        <p className="text-xs text-slate-500 mb-4">Nakit/Banka varlıkları bu sayfadan eklenmez. Dashboard &gt; Varlık Ekle butonunu kullanın.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={varlikTuru}
              onChange={(event) => handleTypeChange(event.target.value)}
              className="bg-white/5 border border-white/10 text-slate-100 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500/60"
            >
              {MANUEL_VARLIK_TURLERI.map((tur) => (
                <option key={tur} value={tur} className="bg-slate-900">
                  {tur}
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
              placeholder="Toplam Değer (TL)"
              className="bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-400 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500/60"
              required
            />
          </div>

          {varlikTuru === 'Araç' && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <select
                value={aracDetay.tur}
                onChange={(event) => setAracDetay((prev) => ({ ...prev, tur: event.target.value }))}
                className="bg-white/5 border border-white/10 text-slate-100 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500/60"
              >
                {ARAC_TURU_OPTIONS.map((option) => (
                  <option key={option} value={option} className="bg-slate-900">
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={aracDetay.marka}
                onChange={(event) => {
                  const nextBrand = event.target.value;
                  setAracDetay((prev) => ({
                    ...prev,
                    marka: nextBrand,
                    customMarka: nextBrand === 'Diğer' ? prev.customMarka : '',
                  }));
                }}
                className="bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-400 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500/60"
                required
              >
                <option value="" className="bg-slate-900">Marka Seç</option>
                {ARAC_MARKA_OPTIONS.map((option) => (
                  <option key={option} value={option} className="bg-slate-900">{option}</option>
                ))}
              </select>

              {aracDetay.marka === 'Diğer' ? (
                <input
                  type="text"
                  value={aracDetay.customMarka}
                  onChange={(event) => setAracDetay((prev) => ({ ...prev, customMarka: event.target.value }))}
                  placeholder="Marka yaz (Örn: Togg)"
                  className="bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-400 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500/60"
                  required
                />
              ) : null}

              <input
                type="text"
                value={aracDetay.model}
                onChange={(event) => setAracDetay((prev) => ({ ...prev, model: event.target.value }))}
                placeholder="Model (Örn: Africa Twin)"
                className="bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-400 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500/60"
                required
              />

              <input
                type="number"
                inputMode="numeric"
                min="1900"
                max={String(new Date().getFullYear() + 1)}
                step="1"
                value={aracDetay.yil}
                onChange={(event) => setAracDetay((prev) => ({ ...prev, yil: event.target.value }))}
                placeholder="Yıl"
                className="bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-400 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500/60"
                required
              />

              <input
                type="date"
                value={aracDetay.satinAlmaTarihi}
                onChange={(event) => setAracDetay((prev) => ({ ...prev, satinAlmaTarihi: event.target.value }))}
                className="bg-white/5 border border-white/10 text-slate-100 rounded-lg px-3 py-2.5 outline-none focus:border-blue-500/60"
                aria-label="Satın alma tarihi"
              />
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg bg-blue-600/25 hover:bg-blue-600/40 border border-blue-500/35 text-blue-300 font-medium transition-colors"
            >
              Ekle
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-200">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Varlık Türü</th>
                <th className="text-left px-4 py-3 font-semibold">Toplam Değer</th>
                <th className="text-right px-4 py-3 font-semibold">İşlem</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-cyan-500/20 bg-cyan-500/5">
                <td className="px-4 py-3">
                  <div>Bankadaki Toplam Nakit</div>
                  <div className="text-xs text-slate-500 mt-1">Dashboard Nakit/Banka hesaplarından otomatik hesaplanır</div>
                </td>
                <td className="px-4 py-3 text-cyan-300 font-semibold">{formatTl(portfolioCashTotal)}</td>
                <td className="px-4 py-3 text-right text-slate-500">-</td>
              </tr>
              {manualAssetsLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                    Kayitlar yukleniyor...
                  </td>
                </tr>
              ) : kayitlar.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                    Henüz manuel mal varlığı kaydı eklenmedi.
                  </td>
                </tr>
              ) : (
                kayitlar.map((item) => {
                  const presentation = getRecordPresentation(item);
                  return (
                  <tr key={item.id} className="border-t border-white/10">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{presentation.title}</div>
                      {presentation.subtitle ? (
                        <div className="text-xs text-slate-500 mt-1">{presentation.subtitle}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-emerald-300 font-medium">{formatTl(item.value)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Sil
                      </button>
                    </td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
