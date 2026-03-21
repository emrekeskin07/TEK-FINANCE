import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Clock3, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { formatCurrency } from '../utils/helpers';

const ACTION_LABELS = {
  buy: 'ALIM',
  sell: 'SATIŞ',
  update: 'GÜNCELLEME',
  delete: 'SİLME',
};

const toSafeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function OperationsPage({ userId, baseCurrency, rates }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!userId || !supabase) {
      setLogs([]);
      return;
    }

    let isDisposed = false;

    const fetchLogs = async () => {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('transaction_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(250);

      if (isDisposed) {
        return;
      }

      if (error) {
        console.warn('transaction_log fetch failed:', error?.message || error);
        setLogs([]);
        setIsLoading(false);
        return;
      }

      setLogs(Array.isArray(data) ? data : []);
      setIsLoading(false);
    };

    fetchLogs();

    return () => {
      isDisposed = true;
    };
  }, [userId]);

  const normalizedRows = useMemo(() => {
    return logs.map((row) => {
      const action = String(row?.action || '').toLowerCase();
      const totalValue = toSafeNumber(row?.total_value);
      const unitPrice = toSafeNumber(row?.unit_price);
      const quantity = toSafeNumber(row?.quantity);
      const isNegative = action === 'sell' || action === 'delete';
      const signedValue = isNegative ? -Math.abs(totalValue) : totalValue;

      return {
        id: row?.id || `${action}-${row?.created_at || Math.random()}`,
        dateText: row?.created_at ? new Date(row.created_at).toLocaleString('tr-TR') : '-',
        action,
        actionLabel: ACTION_LABELS[action] || action.toUpperCase(),
        symbol: row?.symbol || '-',
        name: row?.name || row?.symbol || 'Varlık',
        category: row?.category || 'Diğer',
        bankName: row?.bank_name || 'Banka Belirtilmedi',
        quantity,
        unitPrice,
        totalValue,
        signedValue,
      };
    });
  }, [logs]);

  return (
    <section className="mx-auto w-full max-w-[1400px] rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-[0_24px_72px_rgba(2,6,23,0.62)] backdrop-blur-xl md:p-7">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-slate-100 md:text-lg">İşlem Geçmişi</h3>
          <p className="text-xs text-slate-400">Gerçek transaction_log kayıtları (audit trail) listeleniyor.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-300">
          <Clock3 className="h-3.5 w-3.5" />
          {normalizedRows.length} kayıt
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          İşlemler yükleniyor...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-[0.08em] text-slate-400">
              <tr>
                <th className="px-3 py-2">Tarih</th>
                <th className="px-3 py-2">İşlem</th>
                <th className="px-3 py-2">Varlık</th>
                <th className="px-3 py-2">Kurum</th>
                <th className="px-3 py-2">Miktar</th>
                <th className="px-3 py-2">Birim Fiyat</th>
                <th className="px-3 py-2">Toplam</th>
                <th className="px-3 py-2">Etki</th>
              </tr>
            </thead>
            <tbody>
              {normalizedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-400">
                    Kayıt bulunamadı. Not: Supabase SQL Editor'de transaction_log tablosunu oluşturduktan sonra yeni işlemler burada görünür.
                  </td>
                </tr>
              ) : (
                normalizedRows.map((row) => {
                  const isPositive = row.signedValue > 0;
                  const isNegative = row.signedValue < 0;
                  const effectClass = isPositive ? 'text-emerald-500' : (isNegative ? 'text-red-500' : 'text-slate-400');

                  return (
                    <tr key={row.id} className="border-t border-white/5 text-slate-200">
                      <td className="px-3 py-2 text-xs text-slate-400">{row.dateText}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full border border-slate-300/30 bg-slate-500/10 px-2 py-0.5 text-[11px] font-semibold text-slate-200">{row.actionLabel}</span>
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-100">{row.name}</p>
                        <p className="text-[11px] text-slate-400">{row.symbol} • {row.category}</p>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-300">{row.bankName}</td>
                      <td className="px-3 py-2 text-xs">{row.quantity.toLocaleString('tr-TR')}</td>
                      <td className="px-3 py-2 text-xs">{formatCurrency(row.unitPrice, baseCurrency, rates)}</td>
                      <td className="px-3 py-2 text-xs">{formatCurrency(row.totalValue, baseCurrency, rates)}</td>
                      <td className={`px-3 py-2 text-xs font-semibold ${effectClass}`}>
                        {isPositive ? (
                          <span className="inline-flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5" />
                            {formatCurrency(row.signedValue, baseCurrency, rates)}
                          </span>
                        ) : null}
                        {isNegative ? (
                          <span className="inline-flex items-center gap-1">
                            <TrendingDown className="h-3.5 w-3.5" />
                            {formatCurrency(row.signedValue, baseCurrency, rates)}
                          </span>
                        ) : null}
                        {!isPositive && !isNegative ? 'Nötr' : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

OperationsPage.propTypes = {
  userId: PropTypes.string,
  baseCurrency: PropTypes.string,
  rates: PropTypes.object,
};

OperationsPage.defaultProps = {
  userId: null,
  baseCurrency: 'TRY',
  rates: {},
};
