import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { AnimatePresence, animate, motion } from 'framer-motion';
import Confetti from 'react-confetti';
import { CheckCircle2, Pencil, Sparkles, Wand2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmAiAddAsset, parseAiAssetInput } from '../services/api';

const ASSET_TYPE_OPTIONS = ['Nakit', 'Altın', 'Gümüş', 'Döviz'];
const CURRENCY_OPTIONS = ['TRY', 'USD', 'EUR', 'GBP'];

const buildPreviewSentence = (draft) => {
  const institution = String(draft?.institution || '').trim() || 'Kurum Belirtilmedi';
  const assetType = String(draft?.assetType || 'Nakit').trim();
  const amount = Number(draft?.amount || 0);
  const currency = String(draft?.currency || 'TRY').trim().toUpperCase();
  const formattedAmount = Number.isFinite(amount)
    ? amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })
    : '0';

  return `${institution} -> ${assetType} -> ${formattedAmount} ${currency}`;
};

const normalizeParsedDraft = (parsed) => {
  const institution = String(parsed?.institution || '').trim() || 'Kurum Belirtilmedi';
  const assetType = String(parsed?.assetType || 'Nakit').trim();
  const amount = Number(parsed?.amount || 0);
  const currency = String(parsed?.currency || 'TRY').trim().toUpperCase() || 'TRY';
  const unit = String(parsed?.unit || (assetType === 'Altın' || assetType === 'Gümüş' ? 'gram' : 'adet')).trim().toLowerCase();

  return {
    institution,
    assetType,
    amount: Number.isFinite(amount) ? amount : 0,
    currency,
    unit,
  };
};

function CountUpAmount({ value }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const safeValue = Number(value || 0);
    const controls = animate(0, Math.max(0, safeValue), {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplayValue(latest),
    });

    return () => controls.stop();
  }, [value]);

  return (
    <span className="font-black text-emerald-300">
      {displayValue.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
    </span>
  );
}

CountUpAmount.propTypes = {
  value: PropTypes.number.isRequired,
};

export default function MagicAiInput({ userId, onSuccess }) {
  const [text, setText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draft, setDraft] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncViewport = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  const previewSentence = useMemo(() => buildPreviewSentence(draft || {}), [draft]);

  const handleParse = async (event) => {
    event.preventDefault();

    const trimmed = String(text || '').trim();
    if (!trimmed || isParsing) {
      return;
    }

    try {
      setIsParsing(true);
      const response = await parseAiAssetInput({ text: trimmed });
      const parsedDraft = normalizeParsedDraft(response?.parsed || response);
      setDraft(parsedDraft);
      setShowModal(true);
      setIsEditMode(false);
    } catch (error) {
      toast.error(error?.message || 'AI komutu işlenemedi.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleCloseModal = () => {
    if (isConfirming) {
      return;
    }

    setShowModal(false);
    setIsEditMode(false);
  };

  const handleConfirm = async () => {
    if (!draft || isConfirming) {
      return;
    }

    try {
      setIsConfirming(true);
      await confirmAiAddAsset({ parsed: draft, userId });
      setShowCelebration(true);
      window.setTimeout(() => setShowCelebration(false), 2600);
      toast.success('Başarıyla eklendi!');
      setText('');
      setShowModal(false);
      setIsEditMode(false);
      await onSuccess?.();
    } catch (error) {
      toast.error(error?.message || 'AI sonucu kaydedilemedi.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <>
      {showCelebration ? (
        <Confetti
          width={viewportSize.width}
          height={viewportSize.height}
          recycle={false}
          numberOfPieces={120}
          gravity={0.14}
          colors={['#10b981', '#34d399', '#a855f7', '#d946ef']}
          style={{ pointerEvents: 'none', zIndex: 120 }}
        />
      ) : null}

      <motion.section
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="col-span-12 rounded-3xl border border-emerald-300/20 bg-slate-900/40 p-6 shadow-[0_0_0_1px_rgba(217,70,239,0.12),0_22px_70px_rgba(2,6,23,0.62),0_0_42px_rgba(16,185,129,0.14)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_0_1px_rgba(217,70,239,0.18),0_24px_72px_rgba(2,6,23,0.66),0_0_55px_rgba(168,85,247,0.2)] md:p-8"
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary/35 bg-primary/15">
            <Sparkles className="h-4 w-4 text-primary" />
          </span>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-tight text-slate-50">Hızlı Varlık Ekle</h3>
            <p className="text-xs text-slate-400">Yazıdan otomatik algılama + onay ekranı</p>
          </div>
        </div>

        <form onSubmit={handleParse} className="space-y-3">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Örn: Garanti'ye 20 bin ekle veya 50 gram altınım var yaz... (Yazıdan Otomatik Ekle)"
            className="min-h-[115px] w-full resize-y rounded-2xl border border-fuchsia-300/20 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition-all duration-300 placeholder:text-slate-500 focus:border-fuchsia-400/65 focus:shadow-[0_0_0_1px_rgba(217,70,239,0.35),0_0_24px_rgba(16,185,129,0.22)]"
            disabled={isParsing}
          />

          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={isParsing || !String(text || '').trim()}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-fuchsia-300/35 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25 px-4 py-2 text-sm font-semibold text-slate-50 transition-all duration-200 hover:shadow-[0_0_18px_rgba(217,70,239,0.36)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Wand2 className="h-4 w-4" />
              {isParsing ? 'AI Yorumluyor...' : 'AI ile Yorumla'}
            </motion.button>
          </div>
        </form>
      </motion.section>

      <AnimatePresence>
        {showModal && draft ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="fixed inset-0 z-[110] bg-black/55 backdrop-blur-[3px]"
              aria-label="AI onay modalini kapat"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-1/2 top-1/2 z-[120] w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-fuchsia-300/20 bg-slate-900/75 p-6 shadow-[0_26px_100px_rgba(2,6,23,0.72),0_0_40px_rgba(217,70,239,0.2)] backdrop-blur-xl"
            >
              <button
                type="button"
                onClick={handleCloseModal}
                className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-950/70 text-slate-300 transition-colors hover:bg-slate-900"
                aria-label="Modali kapat"
              >
                <X className="h-4 w-4" />
              </button>

              <p className="text-xs uppercase tracking-tight text-slate-400">AI Onay Ekranı</p>
              <h4 className="mt-1 text-lg font-black text-slate-50">
                Şunu anladım: {previewSentence}. Doğru mu?
              </h4>

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <p className="text-xs text-slate-400">Tutar (count-up)</p>
                <p className="mt-1 text-2xl font-black">
                  <CountUpAmount value={Number(draft.amount || 0)} />
                  <span className="ml-2 text-base font-semibold text-slate-200">{draft.currency}</span>
                </p>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={draft.institution}
                  onChange={(event) => setDraft((prev) => ({ ...prev, institution: event.target.value }))}
                  disabled={!isEditMode}
                  className={`rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors ${isEditMode ? 'border-fuchsia-300/30 bg-slate-950/65 text-slate-100 focus:border-fuchsia-400/60' : 'border-white/10 bg-slate-950/50 text-slate-300'}`}
                />

                <select
                  value={draft.assetType}
                  onChange={(event) => setDraft((prev) => ({ ...prev, assetType: event.target.value }))}
                  disabled={!isEditMode}
                  className={`rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors ${isEditMode ? 'border-fuchsia-300/30 bg-slate-950/65 text-slate-100 focus:border-fuchsia-400/60' : 'border-white/10 bg-slate-950/50 text-slate-300'}`}
                >
                  {ASSET_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-slate-900">{option}</option>
                  ))}
                </select>

                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={draft.amount}
                  onChange={(event) => setDraft((prev) => ({ ...prev, amount: event.target.value }))}
                  disabled={!isEditMode}
                  className={`rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors ${isEditMode ? 'border-fuchsia-300/30 bg-slate-950/65 text-slate-100 focus:border-fuchsia-400/60' : 'border-white/10 bg-slate-950/50 text-slate-300'}`}
                />

                <select
                  value={draft.currency}
                  onChange={(event) => setDraft((prev) => ({ ...prev, currency: event.target.value }))}
                  disabled={!isEditMode}
                  className={`rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors ${isEditMode ? 'border-fuchsia-300/30 bg-slate-950/65 text-slate-100 focus:border-fuchsia-400/60' : 'border-white/10 bg-slate-950/50 text-slate-300'}`}
                >
                  {CURRENCY_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-slate-900">{option}</option>
                  ))}
                </select>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => setIsEditMode((prev) => !prev)}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-white/15 bg-slate-700/35 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700/55"
                >
                  <Pencil className="h-4 w-4" />
                  {isEditMode ? 'Düzenlemeyi Bitir' : 'Düzenle'}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-emerald-300/35 bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.28)] transition-all hover:bg-emerald-500/28 disabled:opacity-65"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isConfirming ? 'Onaylanıyor...' : 'Onayla'}
                </motion.button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

MagicAiInput.propTypes = {
  userId: PropTypes.string,
  onSuccess: PropTypes.func,
};
