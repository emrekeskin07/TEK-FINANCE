import React from 'react';
import { motion } from 'framer-motion';
import { useDashboardData } from '../context/DashboardContext';
import BankTotals from './BankTotals';

export default function DistributionCard() {
  const {
    bankTotals,
    baseCurrency,
    rates,
    totalValue,
    selectedInstitution,
    handleInstitutionSelect,
    selectedBank,
    handleBankSelect,
  } = useDashboardData();

  return (
    <motion.section
      layout
      transition={{ type: 'spring', stiffness: 140, damping: 24 }}
      className="col-span-12 md:col-span-3 md:order-3 rounded-2xl border border-white/5 bg-slate-900/40 p-8 shadow-[0_24px_72px_rgba(2,6,23,0.62)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] hover:border-fuchsia-400/35"
    >
      <BankTotals
        bankTotals={bankTotals}
        baseCurrency={baseCurrency}
        rates={rates}
        totalValue={totalValue}
        selectedBank={selectedInstitution || selectedBank}
        onSelectBank={handleInstitutionSelect || handleBankSelect}
      />
    </motion.section>
  );
}
