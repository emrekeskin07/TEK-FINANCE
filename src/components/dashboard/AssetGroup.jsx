import React from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, Plus } from 'lucide-react';

export default function AssetGroup({
  group,
  isOpen,
  groupProfitPercent,
  onToggle,
  onQuickAdd,
  renderCurrency,
  isPrivacyActive,
  maskValue,
  children,
}) {
  return (
    <section className="space-y-2">
      <div className="group flex items-stretch gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="w-full rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-3 text-left transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-blue-500/15 md:px-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.08em] text-slate-400">Portföy Grubu</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <h4 className="text-ui-h2 text-slate-800 dark:text-slate-100 break-words">{group.portfolioName}</h4>
                <span className="text-slate-500">-</span>
                <p className="text-ui-body font-semibold text-slate-700 dark:text-slate-100">{renderCurrency(group.totalValue)}</p>
                <span className="inline-flex items-center rounded-full border border-white/10 bg-black/35 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-slate-300">
                  {group.items.length} Varlık
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className={`text-[11px] font-semibold ${group.totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {isPrivacyActive ? maskValue(`%${groupProfitPercent}`) : `%${groupProfitPercent}`}
              </p>
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/20 transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
                <ChevronDown className="h-4 w-4 text-slate-300" />
              </span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onQuickAdd}
          className="inline-flex h-auto min-w-10 items-center justify-center rounded-xl border border-white/10 bg-black/25 px-2 text-slate-300 opacity-55 transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:border-blue-300/45 hover:bg-blue-500/20 hover:text-blue-100 hover:opacity-100 group-hover:opacity-100"
          title={`${group.portfolioName} portföyüne hızlı varlık ekle`}
          aria-label={`${group.portfolioName} portföyüne hızlı varlık ekle`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden" aria-hidden={!isOpen}>
          <div className="ml-3 space-y-2 border-l border-white/10 pl-3 md:ml-4 md:pl-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

AssetGroup.propTypes = {
  group: PropTypes.shape({
    portfolioName: PropTypes.string,
    totalValue: PropTypes.number,
    totalProfit: PropTypes.number,
    items: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
  isOpen: PropTypes.bool.isRequired,
  groupProfitPercent: PropTypes.string.isRequired,
  onToggle: PropTypes.func.isRequired,
  onQuickAdd: PropTypes.func.isRequired,
  renderCurrency: PropTypes.func.isRequired,
  isPrivacyActive: PropTypes.bool.isRequired,
  maskValue: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};
