import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Lightbulb, Loader2, MessageSquareText, Send, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchAiSmartSuggestions } from '../services/api';

const DISCLAIMER = 'Bu analiz bir yatırım tavsiyesi değildir, sadece finansal simülasyon ve strateji bilgilendirmesidir.';
const DEFAULT_PROMPT = 'Mevcut portföy dağılımıma göre genel piyasa görünümünü matematiksel bir çerçevede analiz et.';
const RISK_PROFILE_STORAGE_KEY = 'tek-finance:risk-profile';

const RISK_PROFILES = [
  {
    id: 'Muhafazakar',
    shortLabel: 'Muhafazakâr',
    title: 'Muhafazakar',
    description: 'Ana parayı korumayı hedefler (Altın, Mevduat odaklı).',
  },
  {
    id: 'Dengeli',
    shortLabel: 'Dengeli',
    title: 'Dengeli',
    description: 'Risk ve getiriyi orta yolda buluşturur (Hisse ve Değerli Maden karışımı).',
  },
  {
    id: 'Atılgan',
    shortLabel: 'Atılgan',
    title: 'Atılgan',
    description: 'Yüksek getiri için yüksek riski göze alır (Büyüme Hisseleri, Kripto odaklı).',
  },
];

const resolveInitialRiskProfile = () => {
  if (typeof window === 'undefined') {
    return 'Dengeli';
  }

  const stored = String(window.localStorage.getItem(RISK_PROFILE_STORAGE_KEY) || '').trim();
  return RISK_PROFILES.some((profile) => profile.id === stored) ? stored : 'Dengeli';
};

export default function SmartSuggestionsPage({ portfolioDistribution, dashboardTotalValue }) {
  const [isLoading, setIsLoading] = useState(false);
  const [promptText, setPromptText] = useState(DEFAULT_PROMPT);
  const [history, setHistory] = useState([]);
  const [riskProfile, setRiskProfile] = useState(resolveInitialRiskProfile);

  const runAnalysis = async ({ prompt, profile }) => {
    const trimmedPrompt = String(prompt || '').trim();
    const selectedProfile = String(profile || 'Dengeli').trim() || 'Dengeli';

    if (!trimmedPrompt) {
      toast.error('Lütfen analiz için bir soru veya bağlam yazın.');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetchAiSmartSuggestions({
        portfolioDistribution,
        dashboardTotalValue,
        userPrompt: trimmedPrompt,
        riskProfile: selectedProfile,
      });

      setHistory((prev) => ([
        {
          id: `${Date.now()}-${prev.length}`,
          prompt: trimmedPrompt,
          riskProfile: selectedProfile,
          response,
        },
        ...prev,
      ]));
    } catch (error) {
      toast.error(error?.message || 'Akıllı öneriler alınamadı.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async (event) => {
    event.preventDefault();
    await runAnalysis({ prompt: promptText, profile: riskProfile });
  };

  const handleRiskProfileChange = async (nextProfile) => {
    setRiskProfile(nextProfile);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(RISK_PROFILE_STORAGE_KEY, nextProfile);
    }

    await runAnalysis({ prompt: promptText, profile: nextProfile });
  };

  return (
    <section className="mx-auto w-full max-w-5xl rounded-3xl border border-white/10 bg-slate-900/45 p-6 shadow-[0_30px_90px_rgba(2,6,23,0.58)] backdrop-blur-xl md:p-8">
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-amber-300/35 bg-amber-500/15">
          <Lightbulb className="h-5 w-5 text-amber-200" />
        </span>
        <div>
          <h2 className="text-xl font-black text-slate-50">Akıllı Öneriler</h2>
          <p className="text-sm text-slate-400">Portföy dağılımınıza göre AI destekli genel piyasa yorumu ve strateji notları.</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-amber-300/40 bg-amber-500/12 p-3">
        <p className="text-xs font-black uppercase tracking-[0.09em] text-amber-200">Önemli Uyarı</p>
        <p className="mt-1 text-sm text-amber-100">{DISCLAIMER}</p>
      </div>

      <section className="mb-5 rounded-xl border border-white/10 bg-slate-950/65 p-4">
        <h3 className="text-sm font-black uppercase tracking-[0.08em] text-slate-200">Risk Karakterim</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {RISK_PROFILES.map((profile) => {
            const isActive = riskProfile === profile.id;

            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => handleRiskProfileChange(profile.id)}
                className={`rounded-xl border p-3 text-left transition-all ${isActive ? 'border-amber-300/45 bg-amber-500/12 shadow-[0_0_18px_rgba(251,191,36,0.2)]' : 'border-white/10 bg-black/25 hover:border-white/20'}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">{profile.shortLabel}</p>
                <p className="mt-1 text-sm font-bold text-slate-100">{profile.title}</p>
                <p className="mt-1 text-xs text-slate-300">{profile.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <form onSubmit={handleAnalyze} className="mb-5 rounded-xl border border-white/10 bg-slate-950/65 p-4">
        <div className="mb-2 flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-slate-300" />
          <p className="text-sm font-semibold text-slate-200">Yapay Zeka Analizi</p>
        </div>
        <textarea
          value={promptText}
          onChange={(event) => setPromptText(event.target.value)}
          placeholder="Örn: Portföyümde hisse ağırlığı yüksek, matematiksel risk/denge açısından nasıl bir yaklaşım düşünmeliyim?"
          className="min-h-[120px] w-full resize-y rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-amber-300/60"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-amber-300/35 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isLoading ? 'Analiz Üretiliyor...' : 'Analizi Gönder'}
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          AI analiz hazırlanıyor...
        </div>
      ) : history.length > 0 ? (
        <div className="space-y-4">
          {history.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-white/10 bg-slate-950/65 p-4">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Soru</p>
                <p className="mt-1 text-sm text-slate-200">{entry.prompt}</p>
                <p className="mt-2 text-[11px] text-amber-200">Risk Profili: {entry.riskProfile || 'Dengeli'}</p>
              </div>

              <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
                <h3 className="text-base font-black text-slate-50">Genel Piyasa Yorumu</h3>
                <p className="mt-2 text-sm text-slate-300">{entry.response?.marketComment}</p>
              </div>

              <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
                <h4 className="text-base font-bold text-fuchsia-200">Strateji Notları</h4>
                <ul className="mt-2 space-y-2 text-sm text-slate-300">
                  {(entry.response?.strategyNotes || []).map((note, index) => (
                    <li key={`${entry.id}-${index}`} className="rounded-lg border border-white/10 bg-slate-900/45 px-3 py-2">
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-slate-950/65 p-4 text-sm text-slate-300">
          Henüz analiz yok. Yukarıdaki alana bir soru yazarak başlatabilirsiniz.
        </div>
      )}

      <div className="mt-6 rounded-xl border border-amber-300/35 bg-amber-500/10 p-3 text-sm text-amber-100">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          <span className="font-semibold">Bu analiz bir yatırım tavsiyesi değildir, sadece finansal simülasyon ve strateji bilgilendirmesidir.</span>
        </div>
      </div>
    </section>
  );
}

SmartSuggestionsPage.propTypes = {
  portfolioDistribution: PropTypes.arrayOf(
    PropTypes.shape({
      category: PropTypes.string,
      percent: PropTypes.number,
      value: PropTypes.number,
    })
  ),
  dashboardTotalValue: PropTypes.number,
};

SmartSuggestionsPage.defaultProps = {
  portfolioDistribution: [],
  dashboardTotalValue: 0,
};
