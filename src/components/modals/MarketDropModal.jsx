import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function MarketDropModal({ isLoading, insight, onClose }) {
  return (
    <AnimatePresence>
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[131] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-4">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
              <div>
                <h3 className="text-lg font-semibold text-slate-100">AI Piyasalari Tariyor...</h3>
                <p className="mt-1 text-sm text-slate-400">Fiyat, volatilite, sentiment ve haber akisindan ozet cikartiliyor.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : insight ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[131] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl"
          >
            <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">AI Analyze: {insight.assetName}</h3>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-rose-300/40 bg-rose-500/10 px-3 py-1 text-sm text-rose-200">
                Gunluk Dusus: %{insight.dropPercent.toFixed(2)}
              </span>
              <span className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-200">
                Sentiment: {insight.sentimentLabel} {insight.sentimentIndicator}
              </span>
              <span className="rounded-full border border-amber-300/40 bg-amber-500/10 px-3 py-1 text-sm text-amber-200">
                Volatilite: %{insight.volatilityPercent.toFixed(2)} ({insight.volatilityLabel})
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">🔍 Neler Oluyor?</h4>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{insight.summary}</p>
                {insight.headlines?.length ? (
                  <ul className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                    {insight.headlines.map((headline) => (
                      <li key={headline}>• {headline}</li>
                    ))}
                  </ul>
                ) : null}
              </article>

              <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">⚡ Risk/Fırsat Analizi</h4>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{insight.riskOpportunity}</p>
              </article>

              <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">💡 Strateji Önerisi</h4>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{insight.strategy}</p>
                <p className="mt-2 text-sm font-medium text-emerald-300">Aksiyon: {insight.action}</p>
              </article>
            </div>

            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{insight.warning}</p>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-700 bg-transparent px-3 py-2 text-ui-body text-slate-300 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:bg-slate-800"
              >
                Kapat
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
