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
      className="col-span-12 md:col-span-3 md:order-3 rounded-2xl border border-white/5 bg-[#1A2232] p-6 shadow-2xl transition-all duration-300 hover:scale-[1.01] hover:border-white/10 md:p-8"
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
