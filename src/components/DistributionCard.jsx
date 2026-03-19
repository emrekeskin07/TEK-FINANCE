import React from 'react';
import { motion } from 'framer-motion';
import { useDashboardData } from '../context/DashboardContext';
import BankTotals from './BankTotals';

export default function DistributionCard() {
  const {
    bankTotals,
    rates,
    totalValue,
    selectedBank,
    handleBankSelect,
  } = useDashboardData();

  return (
    <motion.section
      layout
      transition={{ type: 'spring', stiffness: 140, damping: 24 }}
      className="col-span-12 md:col-span-3 md:order-3 rounded-2xl border border-gray-800 bg-[#1A2232] p-4 shadow-2xl md:p-5"
    >
      <BankTotals
        bankTotals={bankTotals}
        rates={rates}
        totalValue={totalValue}
        selectedBank={selectedBank}
        onSelectBank={handleBankSelect}
      />
    </motion.section>
  );
}
