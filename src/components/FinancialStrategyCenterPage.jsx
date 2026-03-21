import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { BrainCircuit, Loader2, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchAiFinancialStrategy } from '../services/api';

const DISCLAIMER = 'Bu analiz bir yatırım tavsiyesi değildir, sadece finansal simülasyon ve strateji bilgilendirmesidir.';

export default function FinancialStrategyCenterPage({ portfolioDistribution }) {
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyExpense, setMonthlyExpense] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const investableAmount = useMemo(() => {
    const income = Number(monthlyIncome || 0);
    const expense = Number(monthlyExpense || 0);

    if (!Number.isFinite(income) || !Number.isFinite(expense)) {
      return 0;
    }

    return Math.max(0, income - expense);
  }, [monthlyIncome, monthlyExpense]);

  const handleAnalyze = async (event) => {
    event.preventDefault();

    const income = Number(monthlyIncome || 0);
    const expense = Number(monthlyExpense || 0);

    if (!Number.isFinite(income) || income <= 0) {
      toast.error('Aylık gelir sıfırdan büyük olmalıdır.');
      return;
    }

    if (!Number.isFinite(expense) || expense < 0) {
      toast.error('Aylık gider negatif olamaz.');
      return;
    }

    try {
      setIsLoading(true);
      const data = await fetchAiFinancialStrategy({
        monthlyIncome: income,
        monthlyExpense: expense,
        investableAmount,
        portfolioDistribution,
      });

      setAnalysis(data);
    } catch (error) {
      toast.error(error?.message || 'AI analizi alınamadı.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl rounded-3xl border border-white/10 bg-slate-900/45 p-5 shadow-[0_30px_90px_rgba(2,6,23,0.58)] backdrop-blur-xl md:p-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-fuchsia-300/35 bg-fuchsia-500/15">
          <BrainCircuit className="h-5 w-5 text-fuchsia-200" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-50">Finansal Strateji Merkezi</h2>
          <p className="text-sm text-slate-400">Gelir ve giderinizi girin, yatırılabilir tutarınıza göre AI simülasyonu alın.</p>
        </div>
      </div>

      <form onSubmit={handleAnalyze} className="grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-black/15 p-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-300">Aylık Gelir (TL)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={monthlyIncome}
            onChange={(event) => setMonthlyIncome(event.target.value)}
            placeholder="Örn: 85000"
            className="w-full rounded-lg border border-white/10 bg-slate-950/65 p-3 text-slate-100 outline-none transition-colors focus:border-fuchsia-400/60"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-300">Aylık Gider (TL)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={monthlyExpense}
            onChange={(event) => setMonthlyExpense(event.target.value)}
            placeholder="Örn: 42000"
            className="w-full rounded-lg border border-white/10 bg-slate-950/65 p-3 text-slate-100 outline-none transition-colors focus:border-fuchsia-400/60"
            required
          />
        </div>

        <div className="md:col-span-2 rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-3">
          <p className="text-xs uppercase tracking-[0.08em] text-emerald-200">Yatırılabilir Tutar</p>
          <p className="text-2xl font-black text-emerald-100">{investableAmount.toLocaleString('tr-TR')} TL</p>
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-purple-700 bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-65 dark:border-fuchsia-300/35 dark:bg-gradient-to-r dark:from-violet-500/25 dark:to-fuchsia-500/25 dark:text-slate-50 dark:hover:from-violet-500/35 dark:hover:to-fuchsia-500/35"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
            {isLoading ? 'AI Analizi Hazırlanıyor...' : 'AI Stratejisi Oluştur'}
          </button>
        </div>
      </form>

      {analysis ? (
        <div className="mt-5 space-y-4 rounded-2xl border border-white/10 bg-slate-950/65 p-4">
          <div className="rounded-xl border border-amber-300/40 bg-amber-500/12 p-3">
            <p className="text-xs font-black uppercase tracking-[0.09em] text-amber-200">Önemli Uyarı</p>
            <p className="mt-1 text-sm text-amber-100">{DISCLAIMER}</p>
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-50">Paranızı Nasıl Yönetmelisiniz?</h3>
            <p className="mt-1 text-sm text-slate-300">{analysis.summary}</p>
          </div>

          <div>
            <h4 className="text-base font-bold text-fuchsia-200">Potansiyel Stratejiler</h4>
            <ul className="mt-2 space-y-2 text-sm text-slate-300">
              {(analysis.strategies || []).map((item, index) => (
                <li key={`${item}-${index}`} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-base font-bold text-rose-200">Dikkat Edilmesi Gereken Riskler</h4>
            <ul className="mt-2 space-y-2 text-sm text-slate-300">
              {(analysis.risks || []).map((item, index) => (
                <li key={`${item}-${index}`} className="rounded-lg border border-rose-300/20 bg-rose-500/8 px-3 py-2">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-xl border border-amber-300/35 bg-amber-500/10 p-3 text-sm text-amber-100">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          <span className="font-semibold">Bu analiz bir yatırım tavsiyesi değildir, sadece finansal simülasyon ve strateji bilgilendirmesidir.</span>
        </div>
      </div>
    </section>
  );
}

FinancialStrategyCenterPage.propTypes = {
  portfolioDistribution: PropTypes.arrayOf(
    PropTypes.shape({
      category: PropTypes.string,
      percent: PropTypes.number,
      value: PropTypes.number,
    })
  ),
};

FinancialStrategyCenterPage.defaultProps = {
  portfolioDistribution: [],
};
