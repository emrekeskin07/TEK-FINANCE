import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import ShinyText from '../ui/ShinyText';
import SplitText from '../ui/SplitText';
import AnimatedCurrencyValue from '../ui/AnimatedCurrencyValue';
import SpotlightCard from '../SpotlightCard';
import InfoTooltip from '../common/InfoTooltip';

export default function Stats({
  greetingName,
  totalProfit,
  profitPercentageValue,
  dashboardTotalValue,
  totalValue,
  malVarligiManuelToplam,
  portfolioRealReturnPercent,
  selectedInflationSourceLabel,
  baseCurrency,
  rates,
  lineChartData,
  renderPercent,
  renderRealReturn,
  onPrimaryAction,
}) {
  const profitPercentColorClass = profitPercentageValue >= 0 ? 'text-emerald-500' : 'text-red-500';
  const monthlyChangeNote = useMemo(() => {
    const series = Array.isArray(lineChartData) ? lineChartData : [];
    if (series.length < 31) {
      return 'Geçen aya göre değişim için veri toplanıyor.';
    }

    const latestValue = Number(series[series.length - 1]?.value || 0);
    const monthAgoValue = Number(series[series.length - 31]?.value || 0);

    if (!Number.isFinite(latestValue) || !Number.isFinite(monthAgoValue) || Math.abs(monthAgoValue) < 0.01) {
      return 'Geçen aya göre değişim için veri toplanıyor.';
    }

    const changePercent = ((latestValue - monthAgoValue) / Math.abs(monthAgoValue)) * 100;
    const absPercent = Math.abs(changePercent).toFixed(1);

    if (changePercent >= 0) {
      return `Geçen aya göre %${absPercent} daha fazla tasarruf ettin.`;
    }

    return `Geçen aya göre %${absPercent} daha düşük birikim var; ritmi toparlayabilirsin.`;
  }, [lineChartData]);

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="col-span-12"
    >
      <SpotlightCard
        spotlightColor="rgba(var(--secondary), 0.3)"
        className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-purple-50 to-white p-8 shadow-sm md:p-10 dark:border-white/5 dark:bg-slate-900/40 dark:shadow-[0_30px_95px_rgba(2,6,23,0.66)] dark:backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute -left-20 -top-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 top-8 h-52 w-52 rounded-full bg-secondary/22 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-accent/18 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <p className="text-xs font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400">Finansal Komuta Merkezi</p>
          <h2 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 md:text-6xl dark:text-slate-50">
            Yatırımlarının Yeni Komuta Merkezi.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-slate-500 dark:text-slate-300">
            Banka, borsa ve kripto varlıklarını tek bir akıllı panelde yönet. Gerçek kârını ve enflasyon karşısındaki gücünü saniyeler içinde analiz et.
          </p>

          <button
            type="button"
            onClick={onPrimaryAction}
            className="mt-7 inline-flex transform-gpu items-center justify-center rounded-full bg-purple-600 px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-purple-700"
          >
            Portföyünü Oluştur →
          </button>

          <div className="mt-7 w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/65">
            <div className="mb-3 flex items-center justify-between text-left">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Canlı Önizleme</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{greetingName}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-center">
              <div className="flex items-center justify-center">
                <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-[14px] border-purple-200 dark:border-purple-500/35">
                  <div className="absolute inset-3 rounded-full border-[10px] border-emerald-200 dark:border-emerald-500/30" />
                  <div className="relative text-center">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Toplam</p>
                    <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                      <ShinyText>
                        <AnimatedCurrencyValue value={dashboardTotalValue} baseCurrency={baseCurrency} rates={rates} />
                      </ShinyText>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-left">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-slate-900/55">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Net Değişim</p>
                  <p className={`text-sm font-bold ${profitPercentColorClass}`}>
                    <AnimatedCurrencyValue
                      value={totalProfit}
                      baseCurrency={baseCurrency}
                      rates={rates}
                      showPositiveSign
                    />
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{monthlyChangeNote}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-slate-900/55">
                  <p className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    Reel Getiri ({selectedInflationSourceLabel})
                    <InfoTooltip content="ENAG bağımsız enflasyon endeksine göre hesaplanan gerçek satın alma gücü getirisi" />
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{renderRealReturn()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-7 grid w-full gap-3 sm:grid-cols-2 lg:max-w-3xl">
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-tight text-slate-400">
                  Portföy Gücü
                  <InfoTooltip content="Portföy büyüklüğüne göre otomatik atanan seviye. Yüksek: 50.000 TL+, Orta: 20.000 TL - 50.000 TL, Düşük: 20.000 TL altı" />
                </p>
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-2xl font-black tracking-tight text-slate-50 drop-shadow-[0_0_14px_rgba(217,70,239,0.32)]">
                {dashboardTotalValue > 0 ? 'Yüksek' : 'Başlangıç'}
              </p>
              <p className="mt-1 text-xs text-slate-400">Anlık portföy büyüklüğüne göre otomatik güç seviyesi.</p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-tight text-slate-400">Veri Güveni</p>
              <p className="mt-3 text-xl font-black tracking-tight text-slate-50 drop-shadow-[0_0_12px_rgba(217,70,239,0.35)]">
                Canlı + Senkron
              </p>
              <p className="mt-1 text-xs text-slate-400">Banka ve varlık verileri tek bakışta senkron özetlenir.</p>
            </div>
          </div>
        </div>
      </SpotlightCard>
    </motion.section>
  );
}

Stats.propTypes = {
  greetingName: PropTypes.string.isRequired,
  totalProfit: PropTypes.number.isRequired,
  profitPercentageValue: PropTypes.number.isRequired,
  dashboardTotalValue: PropTypes.number.isRequired,
  totalValue: PropTypes.number.isRequired,
  malVarligiManuelToplam: PropTypes.number.isRequired,
  portfolioRealReturnPercent: PropTypes.number.isRequired,
  selectedInflationSourceLabel: PropTypes.string.isRequired,
  baseCurrency: PropTypes.string.isRequired,
  rates: PropTypes.object,
  lineChartData: PropTypes.arrayOf(PropTypes.object),
  renderPercent: PropTypes.func.isRequired,
  renderRealReturn: PropTypes.func.isRequired,
  onPrimaryAction: PropTypes.func,
};

Stats.defaultProps = {
  rates: {},
  lineChartData: [],
  onPrimaryAction: () => {},
};
