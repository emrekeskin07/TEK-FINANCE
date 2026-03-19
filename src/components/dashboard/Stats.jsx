import React from 'react';
import PropTypes from 'prop-types';
import { Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import ShinyText from '../ui/ShinyText';
import SplitText from '../ui/SplitText';
import AnimatedCurrencyValue from '../ui/AnimatedCurrencyValue';
import SpotlightCard from '../SpotlightCard';
import Card from '../common/Card';

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
      className="col-span-12 space-y-4 rounded-2xl border border-white/10 bg-card/75 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.5)] backdrop-blur-md transition-all duration-300 hover:scale-[1.01] hover:border-primary/45 md:p-8"
    >
      <Card className="border-white/10 bg-card/70 p-6 md:p-8">
        <h2 className="text-lg font-bold tracking-tight text-text-main sm:text-xl md:text-2xl">
          <SplitText text={`Hoş Geldin ${greetingName}`} by="chars" stagger={0.025} />
        </h2>
        <p className="mt-1 text-xs text-text-muted sm:text-sm">Finansal durumunun güncel özetini aşağıda bulabilirsin.</p>
      </Card>

      <SpotlightCard
        spotlightColor="rgba(var(--secondary), 0.24)"
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-card/90 via-page/80 to-card/75 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.55)] backdrop-blur-md md:p-8 lg:p-10"
      >
        <div className="pointer-events-none absolute -left-16 -top-14 h-44 w-44 rounded-full bg-secondary/18 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-6 h-40 w-40 rounded-full bg-primary/16 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-accent/14 blur-3xl" />
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-tight text-text-main/90">Genel Portföy</p>
            <h2 className="mt-2 text-5xl font-black leading-none tracking-tight text-white drop-shadow-[0_0_18px_rgba(125,211,252,0.35)] md:text-6xl">
              <ShinyText>
                <AnimatedCurrencyValue
                  value={dashboardTotalValue}
                  baseCurrency={baseCurrency}
                  rates={rates}
                />
              </ShinyText>
            </h2>
            <p className="mt-4 text-sm text-slate-300">
              (Bankalardaki Toplam:{' '}
              <AnimatedCurrencyValue
                value={totalValue}
                baseCurrency={baseCurrency}
                rates={rates}
              />
              )
            </p>
            {malVarligiManuelToplam > 0 ? (
              <p className="mt-1 text-xs text-slate-300/95">
                Mal Varlığı Katkısı (Araç/Gayrimenkul/Diğer):{' '}
                <AnimatedCurrencyValue
                  value={malVarligiManuelToplam}
                  baseCurrency={baseCurrency}
                  rates={rates}
                />
              </p>
            ) : (
              <p className="mt-1 text-xs text-text-muted">Şu an net değer yalnızca kurumlardaki varlıklardan oluşuyor.</p>
            )}
          </div>

          <div className={`w-full rounded-2xl border p-4 backdrop-blur-md md:w-auto md:min-w-[260px] md:p-5 ${totalProfit >= 0 ? 'border-emerald-300/40 bg-emerald-500/14' : 'border-fuchsia-300/40 bg-fuchsia-500/14'}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-tight text-slate-100">Toplam Performans</p>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-black/20">
                <Wallet className={`h-4 w-4 ${totalProfit >= 0 ? 'text-emerald-300' : 'text-fuchsia-300'}`} />
              </span>
            </div>
            <AnimatedCurrencyValue
              value={totalProfit}
              baseCurrency={baseCurrency}
              rates={rates}
              showPositiveSign
              className={`mt-3 block text-2xl font-extrabold tracking-tight drop-shadow-[0_0_12px_rgba(125,211,252,0.35)] md:text-3xl ${totalProfit >= 0 ? 'text-emerald-200' : 'text-fuchsia-200'}`}
            />
            <p className={`mt-1 text-sm font-bold ${totalProfit >= 0 ? 'text-emerald-100' : 'text-fuchsia-100'}`}>
              {renderPercent()}
            </p>
          </div>
        </div>
      </SpotlightCard>

      <div className="mt-4 flex justify-center">
        <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-[0.04em] ${portfolioRealReturnPercent >= 0 ? 'border-emerald-300/40 bg-emerald-500/10 text-emerald-200' : 'border-rose-300/45 bg-rose-500/10 text-rose-100'}`}>
          Reel Getiri ({selectedInflationSourceLabel})
          <span className="font-bold">{renderRealReturn()}</span>
        </span>
      </div>
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
