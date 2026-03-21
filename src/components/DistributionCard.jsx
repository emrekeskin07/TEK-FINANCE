import React from 'react';
import { motion } from 'framer-motion';
import { useDashboardData } from '../context/DashboardContext';
import BankTotals from './BankTotals';

export default function DistributionCard() {
  const {
    bankTotals,
    portfolio,
    marketData,
    baseCurrency,
    rates,
    totalValue,
    activeAssetCategory,
    setActiveAssetCategory,
    selectedInstitution,
    handleInstitutionSelect,
  } = useDashboardData();

  return (
    <motion.section
      layout
      transition={{ type: 'spring', stiffness: 140, damping: 24 }}
      className="col-span-12 lg:col-span-5 rounded-2xl border border-white/5 bg-slate-900/40 p-8 shadow-[0_24px_72px_rgba(2,6,23,0.62)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] hover:border-fuchsia-400/35"
    >
      <BankTotals
        bankTotals={bankTotals}
        portfolio={portfolio}
        marketData={marketData}
        baseCurrency={baseCurrency}
        rates={rates}
        totalValue={totalValue}
        activeCategory={activeAssetCategory}
        onResetCategory={() => setActiveAssetCategory?.('Tümü')}
        selectedBank={selectedInstitution}
        onSelectBank={handleInstitutionSelect}
      />
    </motion.section>
  );
}
