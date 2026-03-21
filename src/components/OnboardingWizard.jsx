import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { AnimatePresence, motion } from 'framer-motion';
import { Bitcoin, CandlestickChart, Coins, DollarSign, Landmark, Rocket, Scale, Shield } from 'lucide-react';

const INTEREST_OPTIONS = [
  { key: 'hisse', label: 'Hisse Senedi', Icon: CandlestickChart },
  { key: 'kripto', label: 'Kripto', Icon: Bitcoin },
  { key: 'altin-gumus', label: 'Altın / Gümüş', Icon: Coins },
  { key: 'doviz', label: 'Döviz', Icon: DollarSign },
  { key: 'fonlar', label: 'Fonlar', Icon: Landmark },
];

const RISK_OPTIONS = [
  {
    key: 'conservative',
    title: 'Muhafazakar',
    subtitle: 'Ana param korunsun, az ama öz artsın.',
    Icon: Shield,
  },
  {
    key: 'balanced',
    title: 'Dengeli',
    subtitle: 'Makul risk, makul kazanç.',
    Icon: Scale,
  },
  {
    key: 'aggressive',
    title: 'Agresif',
    subtitle: 'Yüksek risk, yüksek getiri hedefliyorum.',
    Icon: Rocket,
  },
];

const SLIDE_VARIANTS = {
  enter: (direction) => ({
    x: direction > 0 ? 48 : -48,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -48 : 48,
    opacity: 0,
  }),
};

export default function OnboardingWizard({ open, loading, onComplete }) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [riskProfile, setRiskProfile] = useState('');
  const [firstAssetCommand, setFirstAssetCommand] = useState('');

  const canContinue = useMemo(() => {
    if (step === 1) {
      return selectedInterests.length > 0;
    }
    if (step === 2) {
      return Boolean(riskProfile);
    }
    return String(firstAssetCommand || '').trim().length > 0;
  }, [step, selectedInterests, riskProfile, firstAssetCommand]);

  if (!open) {
    return null;
  }

  const nextStep = () => {
    setDirection(1);
    setStep((prev) => Math.min(3, prev + 1));
  };

  const previousStep = () => {
    setDirection(-1);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const toggleInterest = (key) => {
    setSelectedInterests((prev) => (
      prev.includes(key)
        ? prev.filter((entry) => entry !== key)
        : [...prev, key]
    ));
  };

  const handleComplete = async () => {
    if (!canContinue || loading) {
      return;
    }

    await onComplete?.({
      interests: selectedInterests,
      riskProfile,
      firstAssetCommand: String(firstAssetCommand || '').trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 p-4 backdrop-blur-md">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-[0_36px_100px_rgba(2,6,23,0.45)] dark:bg-slate-950/95">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <p className="text-ui-body font-semibold text-slate-500 dark:text-slate-400">TEK Finans Kurulum Sihirbazı</p>
          <h3 className="mt-1 text-ui-h2 text-slate-800 dark:text-slate-100">3 adımda sana özel bir başlangıç hazırlayalım</h3>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
        </div>

        <div className="min-h-[340px] px-6 py-6 md:px-8 md:py-7">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={step}
              custom={direction}
              variants={SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              {step === 1 ? (
                <section>
                  <p className="text-ui-h2 text-slate-800 dark:text-slate-100">Hangi yatırım araçlarıyla ilgileniyorsun?</p>
                  <p className="mt-1 text-ui-body text-slate-500 dark:text-slate-400">Dashboard'da bu alanları öncelikli göstereceğim.</p>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {INTEREST_OPTIONS.map((option) => {
                      const isActive = selectedInterests.includes(option.key);
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => toggleInterest(option.key)}
                          className={`rounded-2xl border p-4 text-left transition-all duration-200 ${isActive ? 'border-violet-400 bg-violet-50 text-violet-700 shadow-[0_0_0_1px_rgba(139,92,246,0.2)] dark:bg-violet-500/15 dark:text-violet-200' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-violet-400/60'}`}
                        >
                          <option.Icon className="h-5 w-5" />
                          <p className="mt-2 text-ui-body font-semibold">{option.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {step === 2 ? (
                <section>
                  <p className="text-ui-h2 text-slate-800 dark:text-slate-100">Yatırım karakterin nedir?</p>
                  <p className="mt-1 text-ui-body text-slate-500 dark:text-slate-400">AI Asistan tavsiye tonunu buna göre ayarlar.</p>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {RISK_OPTIONS.map((option) => {
                      const isActive = riskProfile === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setRiskProfile(option.key)}
                          className={`rounded-2xl border p-4 text-left transition-all duration-200 ${isActive ? 'border-violet-400 bg-violet-50 shadow-[0_0_0_1px_rgba(139,92,246,0.22)] dark:bg-violet-500/15' : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-violet-400/60'}`}
                        >
                          <option.Icon className="h-5 w-5 text-violet-500" />
                          <p className="mt-2 text-ui-body font-semibold text-slate-800 dark:text-slate-100">{option.title}</p>
                          <p className="mt-1 text-ui-body text-slate-500 dark:text-slate-400">{option.subtitle}</p>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {step === 3 ? (
                <section>
                  <p className="text-ui-h2 text-slate-800 dark:text-slate-100">Başlamak için küçük bir adım atalım. Portföyünde şu an ne var?</p>
                  <p className="mt-1 text-ui-body text-slate-500 dark:text-slate-400">Sihirli komut satırına tek cümle yazman yeterli.</p>

                  <div className="mt-6 flex justify-center">
                    <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <input
                        value={firstAssetCommand}
                        onChange={(event) => setFirstAssetCommand(event.target.value)}
                        className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-500"
                        placeholder="Örn: 100 gram altınım var"
                      />
                    </div>
                  </div>
                </section>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={previousStep}
            disabled={step === 1 || loading}
            className="rounded-xl border border-slate-300 bg-transparent px-4 py-2 text-ui-body font-semibold text-slate-600 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Geri
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!canContinue || loading}
              className="rounded-xl border border-violet-300/35 bg-violet-600 px-4 py-2 text-ui-body font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Devam Et
            </button>
          ) : (
            <button
              type="button"
              onClick={handleComplete}
              disabled={!canContinue || loading}
              className="rounded-xl border border-emerald-300/35 bg-emerald-600 px-4 py-2 text-ui-body font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Kaydediliyor...' : 'Kurulumu Tamamla'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

OnboardingWizard.propTypes = {
  open: PropTypes.bool,
  loading: PropTypes.bool,
  onComplete: PropTypes.func,
};

OnboardingWizard.defaultProps = {
  open: false,
  loading: false,
  onComplete: async () => {},
};
