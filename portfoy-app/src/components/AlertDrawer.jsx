import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, ChevronRight, ShieldAlert, TrendingDown, X } from 'lucide-react';

const levelStyleMap = {
  critical: {
    card: 'border-rose-300/40 bg-rose-500/10',
    title: 'text-rose-100',
    icon: 'text-rose-300',
    badge: 'bg-rose-500/20 text-rose-200 border border-rose-300/30',
    label: 'Kritik',
  },
  warning: {
    card: 'border-amber-300/35 bg-amber-500/10',
    title: 'text-amber-100',
    icon: 'text-amber-300',
    badge: 'bg-amber-500/20 text-amber-200 border border-amber-300/30',
    label: 'Uyari',
  },
  info: {
    card: 'border-sky-300/25 bg-sky-500/10',
    title: 'text-sky-100',
    icon: 'text-sky-200',
    badge: 'bg-sky-500/20 text-sky-100 border border-sky-300/25',
    label: 'Bilgi',
  },
};

const getLevelStyle = (level) => levelStyleMap[level] || levelStyleMap.info;

const LevelIcon = ({ level }) => {
  if (level === 'critical') {
    return <TrendingDown className="h-4 w-4" />;
  }

  if (level === 'warning') {
    return <ShieldAlert className="h-4 w-4" />;
  }

  return <BellRing className="h-4 w-4" />;
};

export default function AlertDrawer({
  isOpen,
  onClose,
  alerts = [],
  onOpenInflationAnalysis,
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const actionableCount = alerts.filter((item) => item.level === 'critical' || item.level === 'warning').length;

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[70]">
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            aria-label="Uyari panelini kapat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="absolute right-0 top-0 h-full w-full max-w-md border-l border-white/10 bg-[#060b17]/95 shadow-[0_0_60px_rgba(2,6,23,0.85)]"
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Alert Management</p>
                    <h2 className="mt-1 text-xl font-bold text-slate-100">Risk ve Akilli Oneriler</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      {actionableCount > 0
                        ? `${actionableCount} aktif uyari var`
                        : 'Su an aktif kritik risk gorunmuyor'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 transition-colors"
                    title="Kapat"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                {alerts.length === 0 ? (
                  <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-200">
                    Su an gosterilecek bir risk veya akilli oneri bulunmuyor.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {alerts.map((alert) => {
                      const levelStyle = getLevelStyle(alert.level);

                      return (
                        <li key={alert.id} className={`rounded-xl border p-3 ${levelStyle.card}`}>
                          <div className="flex items-start gap-3">
                            <span className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-black/20 ${levelStyle.icon}`}>
                              <LevelIcon level={alert.level} />
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm font-semibold leading-tight ${levelStyle.title}`}>{alert.title}</p>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${levelStyle.badge}`}>
                                  {levelStyle.label}
                                </span>
                              </div>

                              <p className="mt-1 text-xs leading-relaxed text-slate-300">{alert.detail}</p>

                              {alert.ctaToInflation ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenInflationAnalysis?.()}
                                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-200 hover:text-sky-100"
                                >
                                  Enflasyon Analizi'ne git
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
