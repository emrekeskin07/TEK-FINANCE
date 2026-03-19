import React, { useMemo } from 'react';
import { Briefcase, Building2, Landmark, MoreHorizontal, PiggyBank, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePrivacy } from '../context/PrivacyContext';
import { formatCurrencyParts } from '../utils/helpers';

const INSTITUTION_ICON_SET = [Landmark, Building2, Wallet, PiggyBank, Briefcase];

const getInstitutionIcon = (name, isOther = false) => {
  if (isOther) {
    return MoreHorizontal;
  }

  const normalized = String(name || '').trim();
  if (!normalized) {
    return Building2;
  }

  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % INSTITUTION_ICON_SET.length;
  return INSTITUTION_ICON_SET[index];
};

export default function BankTotals({ bankTotals, rates, totalValue, selectedBank, onSelectBank }) {
  const { isPrivacyActive, maskValue } = usePrivacy();
  const bankGroups = useMemo(() => {
    const entries = Object.entries(bankTotals || {})
      .map(([name, value]) => ({
        name,
        value: Number(value || 0),
      }))
      .filter((entry) => Number.isFinite(entry.value) && entry.value > 0)
      .sort((a, b) => b.value - a.value);

    const safeTotal = Number(totalValue || 0) > 0 ? Number(totalValue) : entries.reduce((sum, entry) => sum + entry.value, 0);
    if (safeTotal <= 0) {
      return [];
    }

    const major = [];
    let otherValue = 0;
    const otherInstitutions = [];

    entries.forEach((entry) => {
      const share = (entry.value / safeTotal) * 100;
      if (share < 1) {
        otherValue += entry.value;
        otherInstitutions.push(entry.name);
        return;
      }

      major.push({
        ...entry,
        share,
        isOther: false,
      });
    });

    if (otherValue > 0) {
      major.push({
        name: 'Diğer',
        value: otherValue,
        share: (otherValue / safeTotal) * 100,
        isOther: true,
        institutions: otherInstitutions,
      });
    }

    return major.sort((a, b) => b.value - a.value);
  }, [bankTotals, totalValue]);

  const renderTryCurrencyWithMutedSymbol = (value) => {
    const plainCurrencyText = formatCurrencyParts(value, 'TRY', rates)
      .map((part) => part.value)
      .join('');

    if (isPrivacyActive) {
      return <span>{maskValue(plainCurrencyText)}</span>;
    }

    return (
      <>
        {formatCurrencyParts(value, 'TRY', rates).map((part, index) => (
          part.type === 'currency'
            ? <span key={`${part.type}-${index}`} className="text-slate-400/75">{part.value}</span>
            : <span key={`${part.type}-${index}`}>{part.value}</span>
        ))}
      </>
    );
  };

  const topInstitution = bankGroups[0] || null;
  const restInstitutions = bankGroups.slice(1);
  const hasData = bankGroups.length > 0;
  const TopInstitutionIcon = topInstitution
    ? getInstitutionIcon(topInstitution.name, topInstitution.isOther)
    : Building2;

  return (
    <div>
      <div className="mb-4">
        <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-sky-300/25 bg-sky-500/10">
          <Building2 className="h-4 w-4 text-sky-200/90" />
        </div>
        <h2 className="text-sm font-bold uppercase tracking-[0.13em] text-slate-200">KURUMLARDAKI TOPLAM VARLIKLAR</h2>
        <p className="mt-1 text-xs font-medium text-slate-500">Nakit/Banka + Hisse + Altın dahil kurum bazlı toplam</p>
      </div>

      {!hasData ? (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-slate-400 text-sm">
          Kayıtlı kurum verisi bulunmuyor.
        </div>
      ) : (
        <div className="space-y-3">
          {topInstitution ? (
            <motion.button
              key={topInstitution.name}
              type="button"
              onClick={() => !topInstitution.isOther && onSelectBank(topInstitution.name)}
              aria-pressed={selectedBank === topInstitution.name}
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.995 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={`w-full text-left relative overflow-hidden rounded-2xl border p-4 md:p-5 transition-all duration-200 ${
                topInstitution.isOther
                  ? 'cursor-default border-emerald-300/20 bg-emerald-500/8'
                  : 'cursor-pointer border-emerald-300/40 bg-gradient-to-br from-emerald-500/15 via-cyan-500/10 to-slate-900/50 hover:border-emerald-300/65'
              } ${selectedBank === topInstitution.name ? 'ring-2 ring-emerald-200/60 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'shadow-[0_8px_30px_rgba(15,23,42,0.35)]'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-200/90">En Yüksek Paylı Kurum</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-emerald-200/30 bg-emerald-400/15 text-emerald-100">
                      <TopInstitutionIcon className="h-4 w-4" />
                    </span>
                    <h4 className="text-base md:text-lg font-bold text-slate-100 break-words whitespace-normal">{topInstitution.name}</h4>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full border border-emerald-200/30 bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-100">
                  {isPrivacyActive ? maskValue(`%${topInstitution.share.toFixed(1)}`) : `%${topInstitution.share.toFixed(1)}`}
                </span>
              </div>
              <p className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-slate-50">
                {renderTryCurrencyWithMutedSymbol(topInstitution.value)}
              </p>
            </motion.button>
          ) : null}

          {restInstitutions.length > 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-2.5 md:p-3">
              <ul className="space-y-2.5">
                {restInstitutions.map((entry) => {
                  const isSelected = selectedBank === entry.name;
                  const InstitutionIcon = getInstitutionIcon(entry.name, entry.isOther);

                  return (
                    <li key={entry.name}>
                      <button
                        type="button"
                        onClick={() => !entry.isOther && onSelectBank(entry.name)}
                        disabled={entry.isOther}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                          entry.isOther
                            ? 'cursor-default border-white/10 bg-white/5'
                            : 'cursor-pointer border-white/10 bg-white/[0.03] hover:border-sky-300/40 hover:bg-sky-500/10'
                        } ${isSelected ? 'ring-1 ring-sky-200/60 border-sky-200/60 bg-sky-400/10' : ''}`}
                        aria-pressed={entry.isOther ? undefined : isSelected}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0 flex flex-1 items-center gap-2.5">
                            <span className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${entry.isOther ? 'border-white/15 bg-white/10 text-slate-300' : 'border-sky-300/25 bg-sky-500/10 text-sky-200'}`}>
                              <InstitutionIcon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm md:text-[15px] font-semibold text-slate-200 break-words whitespace-normal">{entry.name}</p>
                              {entry.isOther && Array.isArray(entry.institutions) && entry.institutions.length > 0 ? (
                                <p className="mt-0.5 text-[11px] text-slate-500">{entry.institutions.length} küçük kurum birleştirildi</p>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm md:text-base font-medium text-slate-200">{renderTryCurrencyWithMutedSymbol(entry.value)}</p>
                            <p className="text-xs font-semibold text-slate-400">{isPrivacyActive ? maskValue(`%${entry.share.toFixed(1)}`) : `%${entry.share.toFixed(1)}`}</p>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      )}
      </div>
    
  );
}