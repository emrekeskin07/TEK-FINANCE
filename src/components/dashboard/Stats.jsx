import React from 'react';
import PropTypes from 'prop-types';
import { Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import ShinyText from '../ui/ShinyText';
import SplitText from '../ui/SplitText';
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
  renderCurrency,
  renderPercent,
  renderRealReturn,
}) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="col-span-12 space-y-4 rounded-2xl border border-white/5 bg-[#1A2232] p-6 shadow-2xl md:p-8"
    >
      <Card className="border-white/5 bg-white/5 p-6 md:p-8">
        <h2 className="text-lg font-bold text-slate-100 sm:text-xl md:text-2xl">
          <SplitText text={`Hoş Geldin ${greetingName}`} by="chars" stagger={0.025} />
        </h2>
        <p className="mt-1 text-xs text-slate-400 sm:text-sm">Finansal durumunun güncel özetini aşağıda bulabilirsin.</p>
      </Card>

      <SpotlightCard
        spotlightColor="rgba(99, 102, 241, 0.18)"
        className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-indigo-900/35 via-[#16233d] to-[#0b1120] p-6 shadow-2xl md:p-8 lg:p-10"
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-200/85">Genel Portföy</p>
            <h2 className="mt-2 text-5xl font-black leading-none tracking-tight text-white md:text-6xl">
              <ShinyText>{renderCurrency(dashboardTotalValue)}</ShinyText>
            </h2>
            <p className="mt-4 text-sm text-slate-300">(Bankalardaki Toplam: {renderCurrency(totalValue)})</p>
            {malVarligiManuelToplam > 0 ? (
              <p className="mt-1 text-xs text-slate-300/85">
                Mal Varlığı Katkısı (Araç/Gayrimenkul/Diğer): {renderCurrency(malVarligiManuelToplam)}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Şu an net değer yalnızca kurumlardaki varlıklardan oluşuyor.</p>
            )}
          </div>

          <div className={`w-full rounded-2xl border p-4 md:w-auto md:min-w-[260px] md:p-5 ${totalProfit >= 0 ? 'border-emerald-300/35 bg-emerald-500/12' : 'border-rose-300/35 bg-rose-500/12'}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-200">Toplam Performans</p>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-black/20">
                <Wallet className={`h-4 w-4 ${totalProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`} />
              </span>
            </div>
            <p className={`mt-3 text-2xl font-extrabold tracking-tight md:text-3xl ${totalProfit >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
              {totalProfit > 0 ? '+' : ''}{renderCurrency(totalProfit)}
            </p>
            <p className={`mt-1 text-sm font-bold ${totalProfit >= 0 ? 'text-emerald-100' : 'text-rose-100'}`}>
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
  renderCurrency: PropTypes.func.isRequired,
  renderPercent: PropTypes.func.isRequired,
  renderRealReturn: PropTypes.func.isRequired,
};
