import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Sparkles, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { parseAiAndAutoAddAsset } from '../services/api';

export default function MagicAiInput({ userId, onSuccess }) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmed = String(text || '').trim();
    if (!trimmed || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      await parseAiAndAutoAddAsset({ text: trimmed, userId });
      toast.success('Başarıyla eklendi!');
      setText('');
      await onSuccess?.();
    } catch (error) {
      toast.error(error?.message || 'AI komutu islenemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="col-span-12 rounded-3xl border border-white/15 bg-card/80 p-6 shadow-[0_20px_70px_rgba(7,10,16,0.56)] backdrop-blur-md md:p-8">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary/35 bg-primary/15">
          <Sparkles className="h-4 w-4 text-primary" />
        </span>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-tight text-text-main">Hizli Varlik Ekle (Magic AI Input)</h3>
          <p className="text-xs text-gray-300">Komutu yaz, sistem kurum ve varlik turunu otomatik ayiklayip kaydetsin.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Örn: Ziraat bankasına 50.000 TL ekle veya 100 gram altınım var yaz..."
          className="min-h-[110px] w-full resize-y rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-400 focus:border-secondary/60"
          disabled={isSubmitting}
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !String(text || '').trim()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-secondary/35 bg-gradient-to-r from-primary/25 via-secondary/20 to-accent/25 px-4 py-2 text-sm font-semibold text-text-main transition-all duration-200 hover:scale-105 hover:shadow-[0_0_18px_rgba(167,139,250,0.32)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Wand2 className="h-4 w-4" />
            {isSubmitting ? 'AI Isliyor...' : 'AI ile Ekle'}
          </button>
        </div>
      </form>
    </section>
  );
}

MagicAiInput.propTypes = {
  userId: PropTypes.string,
  onSuccess: PropTypes.func,
};
