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

const getPredictionFromLastThreeMonths = ({ lineChartData, currentValue, targetAmount }) => {
  if (!Array.isArray(lineChartData) || lineChartData.length < 2) {
    return {
      status: 'insufficient-data',
      dailyGrowth: 0,
      daysLeft: null,
    };
  }

  const now = Date.now();
  const threshold = now - (90 * DAY_MS);

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
    () => getPredictionFromLastThreeMonths({
      lineChartData,
      currentValue,
      targetAmount,
    }),
    [lineChartData, currentValue, targetAmount]
  );

  const progressRing = useMemo(() => {
    const radius = 94;
    const strokeWidth = 16;
    const normalizedRadius = radius - (strokeWidth / 2);
    const circumference = 2 * Math.PI * normalizedRadius;
    const dashOffset = circumference * (1 - (progress / 100));

    return {
      radius,
      strokeWidth,
      normalizedRadius,
      circumference,
      dashOffset,
    };
  }, [progress]);

  const percentageLabel = `%${progress.toFixed(0)} Tamamlandi`;
  const motivationMessage = getMotivationMessage(progress);
  const completionSignature = `${goal.name}|${goal.targetAmount}`;

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
      return 'Hedef olusturuldugunda 3 aylik hiz analizi burada gorunecek.';
    }

    if (prediction.status === 'completed') {
      return 'Hedefine zaten ulasmissin. Simdi yeni bir seviye belirleme zamani.';
    }

    if (prediction.status === 'on-track') {
      const daysLeftText = isPrivacyActive ? maskValue(String(prediction.daysLeft)) : String(prediction.daysLeft);
      return `Bu tempoyla devam edersen hedefine ulasmana tahmini ${daysLeftText} gun kaldi.`;
    }

    if (prediction.status === 'non-positive-trend') {
      return 'Son 3 ay trendi hedeften uzaklasiyor. Kucuk birikim artisiyla sureyi hizlandirabilirsin.';
    }

    return 'Son 3 ay verisi henuz yeterli degil, analiz icin biraz daha zamana ihtiyac var.';
  };

  return (
    <motion.section
      layout
      transition={{ type: 'spring', stiffness: 140, damping: 24 }}
      className="col-span-12 rounded-2xl border border-white/5 bg-[#1A2232] p-6 shadow-2xl transition-all duration-300 hover:scale-[1.01] hover:border-white/10 md:p-8"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-200/80">Finansal Hedef Takibi</p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-slate-100 md:text-2xl">Goal Tracker</h3>
          <p className="mt-2 text-xs text-slate-400">Bir hedef belirle, ilerlemeni takip et ve tahmini bitis suresini gor.</p>
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
        <form onSubmit={handleSaveGoal} className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <label htmlFor="goal-name" className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
                Hedef Adi
              </label>
              <input
                id="goal-name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Orn: Yeni Araba, Ev Pesinati"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors focus:border-blue-400/70"
                required
              />
            </div>

            <div>
              <label htmlFor="goal-target" className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
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
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors focus:border-blue-400/70"
                required
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="inline-flex min-h-[44px] transform-gpu items-center gap-1.5 rounded-lg border border-emerald-300/35 bg-gradient-to-r from-blue-500/25 to-emerald-400/25 px-4 py-2 text-sm font-semibold text-emerald-100 transition-all duration-200 hover:scale-105 hover:from-blue-500/35 hover:to-emerald-400/35 active:scale-95"
            >
              <Save className="h-4 w-4" />
              Hedefi Kaydet
            </button>
          </div>
        </form>
      ) : null}

      {hasGoal ? (
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 via-slate-900/60 to-emerald-500/10 p-5">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" aria-hidden="true" />
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-300">
              <Target className="h-4 w-4 text-blue-300" />
              Hedef: {goal.name}
            </div>

            <div className="mt-4 flex justify-center">
              <div className="relative h-[220px] w-[220px]">
                <svg viewBox={`0 0 ${progressRing.radius * 2} ${progressRing.radius * 2}`} className="h-full w-full -rotate-90">
                  <defs>
                    <linearGradient id="goalProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset={progress >= 75 ? '70%' : '55%'} stopColor={progress >= 75 ? '#22c55e' : '#34d399'} />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>

                  <circle
                    cx={progressRing.radius}
                    cy={progressRing.radius}
                    r={progressRing.normalizedRadius}
                    stroke="rgba(148,163,184,0.25)"
                    strokeWidth={progressRing.strokeWidth}
                    fill="none"
                  />
                  <circle
                    cx={progressRing.radius}
                    cy={progressRing.radius}
                    r={progressRing.normalizedRadius}
                    stroke="url(#goalProgressGradient)"
                    strokeWidth={progressRing.strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={progressRing.circumference}
                    strokeDashoffset={progressRing.dashOffset}
                    className="transition-[stroke-dashoffset] duration-700 ease-out"
                    style={{ filter: progress >= 75 ? 'drop-shadow(0 0 14px rgba(16,185,129,0.55))' : 'drop-shadow(0 0 10px rgba(59,130,246,0.45))' }}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">Tamamlanma</p>
                  <p className="mt-1 text-2xl font-black text-white">{isPrivacyActive ? maskValue(percentageLabel) : percentageLabel}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Mevcut Portfoy</p>
              <p className="text-2xl font-black text-slate-100 md:text-3xl">
                <AnimatedCurrencyValue value={currentValue} baseCurrency={baseCurrency} rates={rates} />
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Hedef Tutar</p>
              <p className="text-lg font-bold text-emerald-200 md:text-xl">
                <AnimatedCurrencyValue value={targetAmount} baseCurrency={baseCurrency} rates={rates} />
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Kalan Tutar</p>
              <p className="text-base font-semibold text-slate-200">
                <AnimatedCurrencyValue value={Math.max(0, targetAmount - currentValue)} baseCurrency={baseCurrency} rates={rates} />
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
