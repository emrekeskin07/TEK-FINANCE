import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import PropTypes from 'prop-types';

export default function PortfolioTableHeader({ sortConfig, handleSort }) {
  const getSortIcon = (key) => {
    if (sortConfig?.key !== key) return null;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="inline w-3 h-3 ml-0.5" /> 
      : <ChevronDown className="inline w-3 h-3 ml-0.5" />;
  };

  return (
    <div className="sticky top-0 z-20 grid grid-cols-12 gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-ui-body font-semibold uppercase tracking-[0.08em] text-slate-500 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-400 md:px-5">
      <div className="col-span-2">Kurum</div>
      <div className="col-span-2">Varlık</div>
      <div className="col-span-2">Kategori</div>
      <div 
        className="col-span-2 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors select-none flex items-center justify-end"
        onClick={() => handleSort?.('totalValue')}
        title="Toplam Değere Göre Sırala"
      >
        <span>Toplam Değer</span>
        {getSortIcon('totalValue')}
      </div>
      <div 
        className="col-span-2 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors select-none flex items-center justify-end"
        onClick={() => handleSort?.('profit')}
        title="Kâr/Zarara Göre Sırala"
      >
        <span>K / Z</span>
        {getSortIcon('profit')}
      </div>
      <div className="col-span-1 text-right flex items-center justify-end">Portföy %</div>
      <div className="col-span-1 text-right flex items-center justify-end">İşlemler</div>
    </div>
  );
}

PortfolioTableHeader.propTypes = {
  sortConfig: PropTypes.shape({
    key: PropTypes.string,
    direction: PropTypes.string,
  }).isRequired,
  handleSort: PropTypes.func.isRequired,
};
