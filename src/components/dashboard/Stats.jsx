import React from 'react';
import PropTypes from 'prop-types';
import { Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import ShinyText from '../ui/ShinyText';
import SplitText from '../ui/SplitText';
import AnimatedCurrencyValue from '../ui/AnimatedCurrencyValue';
import SpotlightCard from '../SpotlightCard';

export default function Stats({
  greetingName,
  totalProfit,
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
        className="relative overflow-hidden rounded-3xl border border-white/15 bg-card/80 p-8 shadow-[0_30px_95px_rgba(7,10,16,0.6)] backdrop-blur-md md:p-10"
      >
        <div className="pointer-events-none absolute -left-20 -top-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 top-8 h-52 w-52 rounded-full bg-secondary/22 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-accent/18 blur-3xl" />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-tight text-gray-300">Finansal Komuta Merkezi</p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-text-main md:text-3xl">
              <SplitText text={`Hoş Geldin ${greetingName}`} by="chars" stagger={0.02} />
            </h2>
            <p className="mt-2 text-sm text-gray-300">Portföyünün canlı özeti, tek bir hero panelde.</p>

            <h3 className="mt-5 text-5xl font-black leading-none tracking-tight text-emerald-400 drop-shadow-[0_0_24px_rgba(16,185,129,0.45)] md:text-6xl">
              <ShinyText>
                <AnimatedCurrencyValue
                  value={dashboardTotalValue}
                  baseCurrency={baseCurrency}
                  rates={rates}
                />
              </ShinyText>
            </h3>

            <span className="mt-4 inline-flex items-center rounded-xl border border-emerald-300/45 bg-emerald-500/20 px-4 py-2 text-sm font-extrabold tracking-tight text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.28)]">
              Kâr / Zarar: {renderPercent()}
            </span>

            <p className="mt-2 text-sm font-semibold text-gray-300">
              Net Değişim:{' '}
              <AnimatedCurrencyValue
                value={totalProfit}
                baseCurrency={baseCurrency}
                rates={rates}
                showPositiveSign
                className={`${totalProfit >= 0 ? 'text-emerald-200' : 'text-pink-200'} drop-shadow-[0_0_10px_rgba(167,139,250,0.45)]`}
              />
            </p>

            <p className="mt-4 text-sm text-gray-300">
              (Bankalardaki Toplam:{' '}
              <AnimatedCurrencyValue
                value={totalValue}
                baseCurrency={baseCurrency}
                rates={rates}
              />
              )
            </p>
            {malVarligiManuelToplam > 0 ? (
              <p className="mt-1 text-xs text-gray-300">
                Mal Varlığı Katkısı (Araç/Gayrimenkul/Diğer):{' '}
                <AnimatedCurrencyValue
                  value={malVarligiManuelToplam}
                  baseCurrency={baseCurrency}
                  rates={rates}
                />
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-300">Şu an net değer yalnızca kurumlardaki varlıklardan oluşuyor.</p>
            )}

            <div className="mt-5 flex">
              <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-tight ${portfolioRealReturnPercent >= 0 ? 'border-emerald-300/45 bg-emerald-500/16 text-emerald-100' : 'border-pink-300/45 bg-pink-500/14 text-pink-100'}`}>
                Reel Getiri ({selectedInflationSourceLabel})
                <span className="font-bold">{renderRealReturn()}</span>
              </span>
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[380px] lg:grid-cols-1">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-tight text-gray-300">Portföy Gücü</p>
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-2xl font-black tracking-tight text-text-main drop-shadow-[0_0_14px_rgba(167,139,250,0.38)]">
                {dashboardTotalValue > 0 ? 'Yüksek' : 'Başlangıç'}
              </p>
              <p className="mt-1 text-xs text-gray-300">Anlık portföy büyüklüğüne göre otomatik güç seviyesi.</p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
              <p className="text-xs font-bold uppercase tracking-tight text-gray-300">Veri Güveni</p>
              <p className="mt-3 text-xl font-black tracking-tight text-text-main drop-shadow-[0_0_12px_rgba(236,72,153,0.35)]">
                Canlı + Senkron
              </p>
              <p className="mt-1 text-xs text-gray-300">Banka ve varlık verileri tek bakışta senkron özetlenir.</p>
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
