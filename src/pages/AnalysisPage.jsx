import React from 'react';
import { DashboardProvider } from '../context/DashboardContext';
import Chart from '../components/dashboard/Chart';
import EnflasyonAnaliziPage from '../components/EnflasyonAnaliziPage';

export default function AnalysisPage({
  dashboardContextValue,
  profitPercentage,
  dashboardTotalCost,
  inflationSource,
  setInflationSource,
}) {
  return (
    <DashboardProvider value={dashboardContextValue}>
      <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 md:grid-cols-12 md:gap-6 md:p-8">
        <Chart />
        <div className="col-span-12 rounded-2xl border border-white/10 bg-slate-900/45 p-6 md:p-8">
          <EnflasyonAnaliziPage
            nominalReturnPercent={Number(profitPercentage || 0)}
            referenceAmount={dashboardTotalCost}
            inflationSource={inflationSource}
            onInflationSourceChange={setInflationSource}
          />
        </div>
      </div>
    </DashboardProvider>
  );
}
