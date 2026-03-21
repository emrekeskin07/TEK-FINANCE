import React, { useState } from 'react';
import { Coins, X, ChevronUp, ChevronDown, FileText, Download } from 'lucide-react';

export default function PortfolioTableControls({
  selectedBank,
  selectedCategory,
  onClearFilter,
  sortConfig,
  onSortChange,
  onExportPdfReport,
  onExportExcelReport,
  lastUpdated,
  searchQuery,
  setSearchQuery,
  categoryFilterOptions,
  resolvedActiveCategory,
  categoryFilterCounts,
  getFilterDotColor,
  onCategorySelect
}) {
  const [isReportMenuOpen, setIsReportMenuOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-6 md:p-8">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-ui-h2 flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <Coins className="w-5 h-5 text-blue-400" />
            VARLIKLARIM
          </h3>
          {selectedBank && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/35 bg-sky-500/15 px-3 py-1.5 text-[11px] font-semibold text-sky-100">
              Kurum: {selectedBank}
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-300/35 bg-indigo-500/15 px-3 py-1.5 text-[11px] font-semibold text-indigo-100">
              Kategori: {selectedCategory}
            </span>
          )}
          {(selectedBank || selectedCategory) && (
            <button
              type="button"
              onClick={() => onClearFilter?.()}
              className="inline-flex min-h-[44px] transform-gpu items-center gap-1.5 rounded-full border border-fuchsia-300/35 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25 px-3 py-1.5 text-xs font-semibold text-slate-50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg"
              title="Filtreleri temizle"
            >
              <X className="w-3.5 h-3.5" />
              Filtreyi Temizle (X)
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-slate-900/40 backdrop-blur-xl p-1">
          <button
            type="button"
            onClick={() => onSortChange('totalValue')}
            className={`inline-flex min-h-[44px] transform-gpu items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg ${sortConfig.key === 'totalValue' ? 'bg-primary/22 text-slate-100' : 'text-slate-400 hover:bg-slate-800/60'}`}
            title="Toplam değere göre sırala"
          >
            Toplam Değer
            {sortConfig.key === 'totalValue' && (
              sortConfig.direction === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onSortChange('profit')}
            className={`inline-flex min-h-[44px] transform-gpu items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg ${sortConfig.key === 'profit' ? 'bg-emerald-500/20 text-emerald-100' : 'text-slate-400 hover:bg-slate-800/60'}`}
            title="Kâr/zarara göre sırala"
          >
            Kâr/Zarar
            {sortConfig.key === 'profit' && (
              sortConfig.direction === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div className="relative" onBlur={() => window.setTimeout(() => setIsReportMenuOpen(false), 120)}>
          <button
            type="button"
            onClick={() => setIsReportMenuOpen((prev) => !prev)}
            className="inline-flex min-h-[44px] transform-gpu items-center gap-2 rounded-md border border-purple-700 bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-purple-800 dark:border-fuchsia-300/35 dark:bg-gradient-to-r dark:from-violet-500/25 dark:to-fuchsia-500/25 dark:text-slate-50 dark:hover:from-violet-500/35 dark:hover:to-fuchsia-500/35"
            title="Rapor seçeneklerini aç"
            aria-haspopup="menu"
            aria-expanded={isReportMenuOpen}
          >
            <FileText className="h-3.5 w-3.5" />
            Rapor Al
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isReportMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isReportMenuOpen ? (
            <div className="absolute right-0 z-20 mt-1 min-w-[190px] overflow-hidden rounded-lg border border-white/5 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-xl" role="menu">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setIsReportMenuOpen(false);
                  onExportPdfReport?.();
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/10"
                role="menuitem"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-300" />
                PDF (Profesyonel)
              </button>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setIsReportMenuOpen(false);
                  onExportExcelReport?.();
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-white/10"
                role="menuitem"
              >
                <Download className="h-3.5 w-3.5 text-sky-300" />
                Excel (CSV)
              </button>
            </div>
          ) : null}
        </div>

        {lastUpdated ? (
          <span className="text-ui-body text-slate-500">
            Son: {lastUpdated.toLocaleTimeString('tr-TR')}
          </span>
        ) : null}
      </div>

      <div className="mb-1">
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Varlık ara..."
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-ui-body text-slate-700 placeholder:text-slate-500 focus:outline-none focus:border-fuchsia-400/60 dark:border-white/10 dark:bg-slate-900/35 dark:text-slate-100"
        />
      </div>

      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="inline-flex min-w-full items-center gap-2 px-1">
          {categoryFilterOptions.map((category) => {
            const isActive = resolvedActiveCategory === category;
            const count = Number(categoryFilterCounts[category] || 0);
            const dotColor = getFilterDotColor(category);

            return (
              <button
                key={`category-filter-${category}`}
                type="button"
                onClick={() => onCategorySelect(category)}
                className={`inline-flex min-h-[38px] items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${isActive
                  ? 'border-fuchsia-300/45 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_10px_26px_rgba(168,85,247,0.38)] hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg'
                  : 'border-slate-300/30 bg-slate-100 text-slate-700 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:bg-slate-200/90 dark:border-slate-700/60 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80'}`}
                title={`${category} filtresi`}
              >
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
                <span>{category}</span>
                <span className={`${isActive ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'}`}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
