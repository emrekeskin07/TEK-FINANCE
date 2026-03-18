import React from 'react';
import { Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrencyParts } from '../utils/helpers';

export default function BankTotals({ bankTotals, baseCurrency, rates, totalValue, selectedBank, onSelectBank }) {
  const bankNames = Object.keys(bankTotals);

  const renderCurrencyWithMutedSymbol = (value) => (
    <>
      {formatCurrencyParts(value, baseCurrency, rates).map((part, index) => (
        part.type === 'currency'
          ? <span key={`${part.type}-${index}`} className="text-slate-400/75">{part.value}</span>
          : <span key={`${part.type}-${index}`}>{part.value}</span>
      ))}
    </>
  );

  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-[0.12em] flex items-center gap-2 mb-4 text-slate-300">
        <Building2 className="w-4 h-4 text-sky-200/80" />
        Kurumlardaki Toplam Varlıklar
      </h2>
      <p className="text-xs font-medium text-slate-500 mb-6">Nakit/Banka + Hisse + Altın dahil kurum bazlı toplam</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 xl:gap-8">
        {bankNames.length === 0 && (
            <div className="col-span-full p-4 bg-white/5 border border-white/10 rounded-xl text-slate-400 text-sm">
              Kayıtlı banka verisi bulunmuyor.
            </div>
        )}
        {bankNames.map((bankName) => {
          const isSelected = selectedBank === bankName;
          const bankValue = bankTotals[bankName];
          const weightPercentage = totalValue > 0 ? (bankValue / totalValue) * 100 : 0;

          return (
          <motion.button
            key={bankName}
            type="button"
            onClick={() => onSelectBank(bankName)}
            aria-pressed={isSelected}
            whileHover={{ y: -4, scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={`text-left relative overflow-hidden bg-white/5 backdrop-blur-md border rounded-2xl p-4 md:p-6 xl:p-7 transition-all duration-150 hover:bg-white/10 hover:border-sky-200/35 hover:shadow-[0_0_15px_rgba(125,211,252,0.18)] before:pointer-events-none before:absolute before:left-3 before:right-3 before:top-0 before:h-px before:bg-white/5 before:content-[''] after:pointer-events-none after:absolute after:top-3 after:bottom-3 after:left-0 after:w-px after:bg-white/5 after:content-[''] cursor-pointer ${
              isSelected
                ? 'ring-2 ring-sky-200/60 border-sky-200/60 bg-sky-300/10 shadow-[0_0_24px_rgba(125,211,252,0.12)]'
                : `border-white/10 ${selectedBank ? 'opacity-70 hover:opacity-90' : ''}`
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400/90 truncate" title={bankName}>{bankName}</h4>
              <span className="shrink-0 bg-white/10 text-sky-200/90 text-[11px] font-semibold px-2 py-1 rounded-full">
                %{weightPercentage.toFixed(1)}
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
              {renderCurrencyWithMutedSymbol(bankValue)}
            </p>
          </motion.button>
          );
        })}
      </div>
    </div>
  );
}