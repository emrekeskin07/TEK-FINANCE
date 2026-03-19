import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { NumericFormat } from 'react-number-format';
import { CalendarClock, Pencil, Save, Target, Trash2, TrendingUp } from 'lucide-react';
import { useDashboardData } from '../context/DashboardContext';
import { usePrivacy } from '../context/PrivacyContext';
import AnimatedCurrencyValue from './ui/AnimatedCurrencyValue';

const GOAL_STORAGE_PREFIX = 'tek-finance:userGoals';
const DAY_MS = 24 * 60 * 60 * 1000;

const createEmptyGoal = () => ({
  name: '',
  targetAmount: 0,
  completedSignature: '',
});

const getMotivationMessage = (progress) => {
  if (progress >= 100) {
    return 'TEBRIKLER! Hedefine ulastin, konfeti zamani! 🎉';
  }

  if (progress >= 75) {
    return 'Neredeyse bitti, o anahtari hisset! 🔥';
  }

  if (progress >= 50) {
    return 'Ritmi koruyorsun, hedef giderek netlesiyor!';
  }

  if (progress >= 25) {
    return 'Yarisina az kaldi, disiplini bozma! 🚀';
  }

  return 'Yolun basindasin, damlaya damlaya gol olur! 🌱';
};

const getPredictionFromRecentTrend = ({ lineChartData, currentValue, targetAmount, windowDays = 30 }) => {
  if (!Array.isArray(lineChartData) || lineChartData.length < 2) {
    return {
      status: 'insufficient-data',
      dailyGrowth: 0,
      daysLeft: null,
    };
  }

  const now = Date.now();
  const threshold = now - (windowDays * DAY_MS);

  const recentPoints = lineChartData
    .filter((point) => {
      const timestamp = Number(point?.timestamp || 0);
      return Number.isFinite(timestamp) && timestamp >= threshold;
    })
    .sort((a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0));

  if (recentPoints.length < 2) {
    return {
      status: 'insufficient-data',
      dailyGrowth: 0,
      daysLeft: null,
    };
  }

  const firstPoint = recentPoints[0];
  const lastPoint = recentPoints[recentPoints.length - 1];
  const totalDays = Math.max(1, Math.round((Number(lastPoint.timestamp) - Number(firstPoint.timestamp)) / DAY_MS));
  const dailyGrowth = (Number(lastPoint.value || 0) - Number(firstPoint.value || 0)) / totalDays;
  const remaining = Math.max(0, Number(targetAmount || 0) - Number(currentValue || 0));

  if (remaining <= 0) {
    return {
      status: 'completed',
      dailyGrowth,
      daysLeft: 0,
    };
  }

  if (!Number.isFinite(dailyGrowth) || dailyGrowth <= 0) {
    return {
      status: 'non-positive-trend',
      dailyGrowth,
      daysLeft: null,
    };
  }

  const daysLeft = Math.ceil(remaining / dailyGrowth);

  if (!Number.isFinite(daysLeft) || daysLeft <= 0) {
    return {
      status: 'non-positive-trend',
      dailyGrowth,
      daysLeft: null,
    };
  }

  return {
    status: 'on-track',
    dailyGrowth,
    daysLeft,
  };
};

export default function GoalTracker() {
  const {
    userId,
    dashboardTotalValue,
    baseCurrency,
    rates,
    lineChartData,
    triggerCelebration,
  } = useDashboardData();
  const { isPrivacyActive, maskValue } = usePrivacy();

  const storageKey = useMemo(
    () => `${GOAL_STORAGE_PREFIX}:${userId || 'guest'}`,
    [userId]
  );

  const [goal, setGoal] = useState(createEmptyGoal());
  const [draftName, setDraftName] = useState('');
  const [draftTargetAmount, setDraftTargetAmount] = useState('');
  const [targetMonths, setTargetMonths] = useState('12');
  const [isEditing, setIsEditing] = useState(true);

  const persistGoal = (nextGoal) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(nextGoal));
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      setGoal(createEmptyGoal());
      setDraftName('');
      setDraftTargetAmount('');
      setIsEditing(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const normalizedGoal = {
        name: String(parsed?.name || '').trim(),
        targetAmount: Number(parsed?.targetAmount || 0),
        completedSignature: String(parsed?.completedSignature || ''),
      };

      if (!normalizedGoal.name || !Number.isFinite(normalizedGoal.targetAmount) || normalizedGoal.targetAmount <= 0) {
        throw new Error('Invalid goal record');
      }

      setGoal(normalizedGoal);
      setDraftName(normalizedGoal.name);
      setDraftTargetAmount(String(normalizedGoal.targetAmount));
      setIsEditing(false);
    } catch {
      setGoal(createEmptyGoal());
      setDraftName('');
      setDraftTargetAmount('');
      setIsEditing(true);
    }
  }, [storageKey]);

  const hasGoal = goal.name && Number(goal.targetAmount) > 0;
  const currentValue = Number.isFinite(Number(dashboardTotalValue)) ? Number(dashboardTotalValue) : 0;
  const targetAmount = Number.isFinite(Number(goal.targetAmount)) ? Number(goal.targetAmount) : 0;
  const progressRaw = hasGoal && targetAmount > 0 ? (currentValue / targetAmount) * 100 : 0;
  const progress = Math.max(0, Math.min(100, Number.isFinite(progressRaw) ? progressRaw : 0));

  const prediction = useMemo(
    () => getPredictionFromRecentTrend({
      lineChartData,
      currentValue,
      targetAmount,
      windowDays: 30,
    }),
    [lineChartData, currentValue, targetAmount]
  );

  const percentageLabel = `%${progress.toFixed(0)} Tamamlandi`;
  const motivationMessage = getMotivationMessage(progress);
  const completionSignature = `${goal.name}|${goal.targetAmount}`;
  const remainingAmount = Math.max(0, targetAmount - currentValue);
  const parsedTargetMonths = Math.max(1, Number(targetMonths || 0));
  const monthlyContributionNeeded = remainingAmount / parsedTargetMonths;

  useEffect(() => {
    if (!hasGoal || progress < 100 || !triggerCelebration) {
      return;
    }

    if (goal.completedSignature === completionSignature) {
      return;
    }

    const nextGoal = {
      ...goal,
      completedSignature: completionSignature,
    };

    setGoal(nextGoal);
    persistGoal(nextGoal);
    triggerCelebration(3800);
  }, [hasGoal, progress, goal, completionSignature, triggerCelebration]);

  const handleSaveGoal = (event) => {
    event.preventDefault();

    const normalizedName = String(draftName || '').trim();
    const parsedTarget = Number(draftTargetAmount || 0);

    if (!normalizedName || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      return;
    }

    const nextGoal = {
      name: normalizedName,
      targetAmount: parsedTarget,
      completedSignature: currentValue >= parsedTarget ? `${normalizedName}|${parsedTarget}` : '',
    };

    setGoal(nextGoal);
    persistGoal(nextGoal);
    setIsEditing(false);
  };

  const handleResetGoal = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }

    setGoal(createEmptyGoal());
    setDraftName('');
    setDraftTargetAmount('');
    setIsEditing(true);
  };

  const renderPrediction = () => {
    if (!hasGoal) {
      return 'Hedef olusturuldugunda 30 gunluk trend analizi burada gorunecek.';
    }

    if (prediction.status === 'completed') {
      return 'Hedefine zaten ulasmissin. Simdi yeni bir seviye belirleme zamani.';
    }

    if (prediction.status === 'on-track') {
      const daysLeftText = isPrivacyActive ? maskValue(String(prediction.daysLeft)) : String(prediction.daysLeft);
      return `Bu tempoyla devam edersen hedefine ulasmana tahmini ${daysLeftText} gun kaldi.`;
    }

    if (prediction.status === 'non-positive-trend') {
      return 'Hedefin biraz uzaklasiyor, ama disiplini bozma!';
    }

    return 'Son 30 gun verisi henuz yeterli degil, analiz icin biraz daha zamana ihtiyac var.';
  };

  return (
    <motion.section
      layout
      transition={{ type: 'spring', stiffness: 140, damping: 24 }}
      className="col-span-12 rounded-2xl border border-white/10 bg-card/75 p-6 shadow-[0_24px_72px_rgba(15,23,42,0.5)] backdrop-blur-md transition-all duration-300 hover:scale-[1.01] hover:border-secondary/45 md:p-8"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-tight text-text-main/90">Finansal Hedef Takibi</p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-text-main md:text-2xl">Goal Tracker</h3>
          <p className="mt-2 text-xs text-text-muted">Bir hedef belirle, ilerlemeni takip et ve tahmini bitis suresini gor.</p>
        </div>

        {hasGoal && !isEditing ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex min-h-[44px] transform-gpu items-center gap-1.5 rounded-lg border border-sky-300/35 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-100 transition-all duration-200 hover:scale-105 hover:bg-sky-500/25 active:scale-95"
            >
              <Pencil className="h-3.5 w-3.5" />
              Duzenle
            </button>
            <button
              type="button"
              onClick={handleResetGoal}
              className="inline-flex min-h-[44px] transform-gpu items-center gap-1.5 rounded-lg border border-rose-300/35 bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-100 transition-all duration-200 hover:scale-105 hover:bg-rose-500/25 active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Temizle
            </button>
          </div>
        ) : null}
      </div>

      {isEditing ? (
        <form onSubmit={handleSaveGoal} className="rounded-2xl border border-white/15 bg-card/65 p-4 backdrop-blur-md md:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label htmlFor="goal-name" className="mb-1 block text-xs font-semibold uppercase tracking-tight text-slate-300">
                Hedef Adi
              </label>
              <input
                id="goal-name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Orn: Yeni Araba, Ev Pesinati"
                className="w-full rounded-lg border border-white/15 bg-card/70 px-3 py-2.5 text-sm text-text-main outline-none transition-colors focus:border-secondary/70"
                required
              />
            </div>

            <div>
              <label htmlFor="goal-target" className="mb-1 block text-xs font-semibold uppercase tracking-tight text-slate-300">
                Hedef Tutar
              </label>
              <NumericFormat
                id="goal-target"
                value={draftTargetAmount}
                valueIsNumericString
                decimalScale={2}
                fixedDecimalScale={false}
                allowNegative={false}
                thousandSeparator="."
                decimalSeparator="," 
                inputMode="decimal"
                onValueChange={({ value }) => setDraftTargetAmount(value)}
                placeholder="250.000"
                className="w-full rounded-lg border border-white/15 bg-card/70 px-3 py-2.5 text-sm text-text-main outline-none transition-colors focus:border-secondary/70"
                required
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="inline-flex min-h-[44px] transform-gpu items-center gap-1.5 rounded-lg border border-secondary/35 bg-gradient-to-r from-primary/35 via-secondary/30 to-accent/35 px-4 py-2 text-sm font-semibold text-text-main transition-all duration-200 hover:scale-105 hover:shadow-[0_0_20px_rgba(var(--secondary),0.35)] active:scale-95"
            >
              <Save className="h-4 w-4" />
              Hedefi Kaydet
            </button>
          </div>
        </form>
      ) : null}

      {hasGoal ? (
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-secondary/16 via-card/60 to-primary/14 p-5 backdrop-blur-md">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/20 blur-2xl" aria-hidden="true" />
            <div className="absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-primary/16 blur-2xl" aria-hidden="true" />
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-tight text-slate-200">
              <Target className="h-4 w-4 text-blue-300" />
              Hedef: {goal.name}
            </div>

            <div className="mt-6">
              <div className="flex items-end justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-tight text-slate-300">Ilerleme</p>
                <p className="text-2xl font-black leading-none text-white drop-shadow-[0_0_14px_rgba(139,92,246,0.45)]">{isPrivacyActive ? maskValue(percentageLabel) : percentageLabel}</p>
              </div>

              <div className="mt-3 rounded-full border border-white/10 bg-slate-900/80 p-1">
                <div className="relative h-5 overflow-hidden rounded-full bg-slate-800/80">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                    className="relative h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 shadow-[0_0_22px_rgba(16,185,129,0.45)]"
                  >
                    <motion.span
                      className="absolute -right-1 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-emerald-200/90 blur-[1px]"
                      animate={{ opacity: [0.55, 1, 0.55], scale: [0.95, 1.05, 0.95] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </motion.div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-[12px] text-slate-200">
                <span>Mevcut: <AnimatedCurrencyValue value={currentValue} baseCurrency={baseCurrency} rates={rates} /></span>
                <span>Hedef: <AnimatedCurrencyValue value={targetAmount} baseCurrency={baseCurrency} rates={rates} /></span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-slate-900/65 p-5 backdrop-blur-md">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-tight text-slate-300">Mevcut Portfoy</p>
              <p className="text-2xl font-black text-slate-100 drop-shadow-[0_0_14px_rgba(56,189,248,0.35)] md:text-3xl">
                <AnimatedCurrencyValue value={currentValue} baseCurrency={baseCurrency} rates={rates} />
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[11px] uppercase tracking-tight text-slate-300">Hedef Tutar</p>
              <p className="text-lg font-bold text-emerald-200 md:text-xl">
                <AnimatedCurrencyValue value={targetAmount} baseCurrency={baseCurrency} rates={rates} />
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[11px] uppercase tracking-tight text-slate-300">Kalan Tutar</p>
              <p className="text-base font-semibold text-slate-200">
                <AnimatedCurrencyValue value={remainingAmount} baseCurrency={baseCurrency} rates={rates} />
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-violet-300/20 bg-violet-500/10 p-3.5">
              <p className="text-xs font-semibold text-indigo-100">Hedef icin aylik ne kadar eklemeliyim?</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={targetMonths}
                  onChange={(event) => setTargetMonths(event.target.value)}
                  className="w-20 rounded-md border border-white/15 bg-slate-900/75 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-400/70"
                />
                <span className="text-sm text-slate-300">ay icin gerekli aylik birikim:</span>
              </div>
              <p className="mt-2 text-lg font-black text-indigo-100 drop-shadow-[0_0_12px_rgba(139,92,246,0.4)]">
                <AnimatedCurrencyValue value={monthlyContributionNeeded} baseCurrency={baseCurrency} rates={rates} />
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
              <p className="flex items-center gap-2 text-xs font-semibold text-blue-200">
                <TrendingUp className="h-4 w-4" />
                Motivasyon
              </p>
              <p className="mt-1 text-sm text-slate-200">{motivationMessage}</p>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
              <p className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
                <CalendarClock className="h-4 w-4" />
                Akilli Tahmin
              </p>
              <p className="mt-1 text-sm text-slate-200">{renderPrediction()}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-sm text-slate-300">
          Ilk hedefini olustur, sistem ilerleme orani ve 3 aylik hizina gore tahmini kalan gunu gostersin.
        </div>
      )}
    </motion.section>
  );
}
