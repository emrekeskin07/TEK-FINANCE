import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CheckCircle2, Sparkles, Target } from 'lucide-react';

const clampPercent = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.max(0, Math.min(100, num));
};

function GoalSuccessModal({ flow, onClose, onOpenGoalDetails }) {
  const [animatedPercent, setAnimatedPercent] = useState(clampPercent(flow?.oldPercent));

  const oldPercent = useMemo(() => clampPercent(flow?.oldPercent), [flow?.oldPercent]);
  const newPercent = useMemo(() => clampPercent(flow?.newPercent), [flow?.newPercent]);
  const deltaPercent = useMemo(() => clampPercent(flow?.deltaPercent), [flow?.deltaPercent]);

  useEffect(() => {
    if (!flow) {
      return;
    }

    const durationMs = 950;
    const start = performance.now();

    const run = (now) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - ((1 - progress) ** 3);
      const nextPercent = oldPercent + ((newPercent - oldPercent) * eased);
      setAnimatedPercent(nextPercent);

      if (progress < 1) {
        requestAnimationFrame(run);
      }
    };

    setAnimatedPercent(oldPercent);
    requestAnimationFrame(run);
  }, [flow, oldPercent, newPercent]);

  useEffect(() => {
    if (!flow || typeof window === 'undefined') {
      return;
    }

    const originY = window.innerWidth < 768 ? 0.8 : 0.7;

    confetti({
      particleCount: 70,
      spread: 72,
      startVelocity: 42,
      ticks: 160,
      scalar: 0.95,
      origin: { x: 0.5, y: originY },
      colors: ['#34d399', '#10b981', '#f59e0b', '#fef08a', '#93c5fd'],
    });
  }, [flow]);

  if (!flow) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[132] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ y: 26, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 18, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="w-full max-w-xl overflow-hidden rounded-3xl border border-emerald-200/20 bg-slate-950/95 shadow-[0_24px_80px_rgba(16,185,129,0.25)]"
        >
          <div className="border-b border-white/10 bg-gradient-to-r from-emerald-500/25 via-emerald-400/15 to-cyan-400/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200/30 bg-emerald-500/20 text-emerald-200">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200/80">Hedef İlerleme Özeti</p>
                <h3 className="mt-1 text-ui-h2 text-white">{flow.goalEmoji || '🎯'} {flow.goalName}</h3>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-5 py-5">
            <p className="text-ui-body text-slate-200">
              {flow.assetName || 'Yeni varlık'} eklemenle hedefin <span className="font-semibold text-emerald-300">%{deltaPercent.toFixed(1)}</span> daha ilerledi.
            </p>

            <div className="rounded-2xl border border-white/10 bg-slate-900/85 p-4">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-400">
                <span>İlerleme</span>
                <span>{animatedPercent.toFixed(1)}%</span>
              </div>

              <div className="relative h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-slate-700"
                  style={{ width: `${oldPercent}%` }}
                />
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-300"
                  initial={{ width: `${oldPercent}%` }}
                  animate={{ width: `${newPercent}%` }}
                  transition={{ duration: 0.95, ease: 'easeOut' }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
                <span>Önce: %{oldPercent.toFixed(1)}</span>
                <span>Şimdi: %{newPercent.toFixed(1)}</span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-3 text-emerald-100">
              <Target className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm leading-relaxed">
                {Number.isFinite(Number(flow.monthsToGoal))
                  ? `${flow.monthsToGoal} ay bu tempoda devam edersen hedefine ulaşabilirsin.`
                  : 'Bu hızla hedefini daha da yakınlaştırdın, tempoyu koru!'}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 bg-transparent px-4 py-2 text-ui-body text-slate-200 transition-all duration-200 hover:bg-slate-800"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={onOpenGoalDetails}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300/45 bg-emerald-500 px-4 py-2 text-ui-body font-semibold text-emerald-950 transition-all duration-200 hover:bg-emerald-400"
              >
                <Sparkles className="h-4 w-4" />
                Hedef Detayına Git
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default GoalSuccessModal;
