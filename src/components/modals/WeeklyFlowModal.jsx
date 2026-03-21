import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function WeeklyFlowModal({ isOpen, step, summary, setStep, onClose, onAction }) {
  return (
    <AnimatePresence>
      {isOpen && summary ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[132] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl"
          >
            {step === 0 ? (
              <>
                <h3 className="text-ui-h2 text-slate-100">Haftalık Özet</h3>
                <p className="mt-2 text-ui-body text-slate-300">Geçen hafta net değişimin {summary.weeklyGain?.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} oldu.</p>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <h3 className="text-ui-h2 text-slate-100">En Çok Yükselen</h3>
                <p className="mt-2 text-ui-body text-slate-300">{summary.topMoverName} haftayı %{summary.topMoverPercent?.toFixed(2)} değişimle kapattı.</p>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h3 className="text-ui-h2 text-slate-100">AI Tahmini</h3>
                <p className="mt-2 text-ui-body text-slate-300">{summary.forecast}</p>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <h3 className="text-ui-h2 text-slate-100">Bu Haftanın İlk Adımı</h3>
                <p className="mt-2 text-ui-body text-slate-300">Hadi bu haftaki ilk yatırımını gir ve ivmeyi koru.</p>
              </>
            ) : null}

            <div className="mt-5 flex justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (step === 0) {
                    onClose();
                    return;
                  }

                  setStep((prev) => Math.max(0, prev - 1));
                }}
                className="rounded-lg border border-slate-700 bg-transparent px-3 py-2 text-ui-body text-slate-300 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:bg-slate-800"
              >
                {step === 0 ? 'Kapat' : 'Geri'}
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep((prev) => Math.min(3, prev + 1))}
                  className="rounded-lg border border-violet-300/40 bg-violet-600 px-3 py-2 text-ui-body font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:bg-violet-700"
                >
                  Devam
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAction();
                  }}
                  className="rounded-lg border border-emerald-300/35 bg-emerald-600 px-3 py-2 text-ui-body font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:bg-emerald-700"
                >
                  Hadi Bu Haftaki İlk Yatırımını Gir
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
