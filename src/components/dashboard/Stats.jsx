import React from 'react';
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
  renderPercent,
  renderRealReturn,
}) {
  const profitPercentColorClass = profitPercentageValue >= 0 ? 'text-emerald-500' : 'text-red-500';

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
        className="relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/40 p-8 shadow-[0_30px_95px_rgba(2,6,23,0.66)] backdrop-blur-xl md:p-10"
      >
        <div className="pointer-events-none absolute -left-20 -top-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 top-8 h-52 w-52 rounded-full bg-secondary/22 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-accent/18 blur-3xl" />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-tight text-slate-400">Finansal Komuta Merkezi</p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-50 md:text-3xl">
              <SplitText text={`Hoş Geldin ${greetingName}`} by="chars" stagger={0.02} />
            </h2>
            <p className="mt-2 text-sm text-slate-400">Portföyünün canlı özeti, tek bir hero panelde.</p>

            <h3 className="mt-5 text-5xl font-black leading-none tracking-tight text-slate-50 drop-shadow-[0_0_22px_rgba(217,70,239,0.38)] md:text-6xl">
              <ShinyText>
                <AnimatedCurrencyValue
                  value={dashboardTotalValue}
                  baseCurrency={baseCurrency}
                  rates={rates}
                />
              </ShinyText>
            </h3>

            <span className={`mt-4 inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-extrabold tracking-tight shadow-[0_0_20px_rgba(15,23,42,0.24)] ${profitPercentColorClass}`}>
              Kâr / Zarar: {renderPercent()}
            </span>

            <p className="mt-2 text-sm font-semibold text-slate-300">
              Net Değişim:{' '}
              <AnimatedCurrencyValue
                value={totalProfit}
                baseCurrency={baseCurrency}
                rates={rates}
                showPositiveSign
                className={`${totalProfit >= 0 ? 'text-emerald-200' : 'text-pink-200'} drop-shadow-[0_0_10px_rgba(167,139,250,0.45)]`}
              />
            </p>

            <p className="mt-4 text-sm text-slate-400">
              (Bankalardaki Toplam:{' '}
              <AnimatedCurrencyValue
                value={totalValue}
                baseCurrency={baseCurrency}
                rates={rates}
              />
              )
            </p>
            {malVarligiManuelToplam > 0 ? (
              <p className="mt-1 text-xs text-slate-400">
                Mal Varlığı Katkısı (Araç/Gayrimenkul/Diğer):{' '}
                <AnimatedCurrencyValue
                  value={malVarligiManuelToplam}
                  baseCurrency={baseCurrency}
                  rates={rates}
                />
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">Şu an net değer yalnızca kurumlardaki varlıklardan oluşuyor.</p>
            )}

            <div className="mt-5 flex">
              <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-tight ${portfolioRealReturnPercent >= 0 ? 'border-emerald-300/45 bg-emerald-500/16 text-emerald-100' : 'border-pink-300/45 bg-pink-500/14 text-pink-100'}`}>
                <span className="inline-flex items-center gap-1">
                  Reel Getiri ({selectedInflationSourceLabel})
                  <InfoTooltip content="ENAG bağımsız enflasyon endeksine göre hesaplanan gerçek satın alma gücü getirisi" />
                </span>
                <span className="font-bold">{renderRealReturn()}</span>
              </span>
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[380px] lg:grid-cols-1">
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
  renderPercent: PropTypes.func.isRequired,
  renderRealReturn: PropTypes.func.isRequired,
};
