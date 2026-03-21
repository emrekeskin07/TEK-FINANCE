import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Clock3, TrendingDown, TrendingUp } from 'lucide-react';
import { resolveAssetActivePrice } from '../utils/assetPricing';
import { formatCurrency } from '../utils/helpers';

export default function OperationsPage({ portfolio, marketData, baseCurrency, rates }) {
  const operations = useMemo(() => {
    const source = Array.isArray(portfolio) ? portfolio : [];

    return source
      .map((asset) => {
        const amount = Number(asset?.amount || 0);
        const avgPrice = Number(asset?.avgPrice || 0);
        const livePrice = Number(resolveAssetActivePrice(asset, marketData) || 0);
        const positionValue = amount * livePrice;
        const costValue = amount * avgPrice;
        const pnl = positionValue - costValue;
        const pnlRate = costValue > 0 ? (pnl / costValue) * 100 : 0;

        return {
          id: String(asset?.id || `${asset?.symbol}-${asset?.bank}`),
          dateText: asset?.createdAt
            ? new Date(asset.createdAt).toLocaleDateString('tr-TR')
            : '-',
          type: 'ALIM',
          assetName: asset?.name || asset?.symbol || 'Varlık',
          category: asset?.category || 'Diğer',
          institution: asset?.bank || 'Banka Belirtilmedi',
          amount,
          avgPrice,
          positionValue,
          pnl,
          pnlRate,
        };
      })
      .sort((a, b) => {
        const aTime = Date.parse(a.dateText || '');
        const bTime = Date.parse(b.dateText || '');

        if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
          return bTime - aTime;
        }

        return 0;
      });
  }, [portfolio, marketData]);

  return (
    <section className="mx-auto w-full max-w-[1400px] rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-[0_24px_72px_rgba(2,6,23,0.62)] backdrop-blur-xl md:p-7">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-slate-100 md:text-lg">İşlem Geçmişi</h3>
          <p className="text-xs text-slate-400">Alım/satım kayıtları zaman çizelgesi ve pozisyon etkisi.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-300">
          <Clock3 className="h-3.5 w-3.5" />
          {operations.length} kayıt
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-950/70 text-xs uppercase tracking-[0.08em] text-slate-400">
            <tr>
              <th className="px-3 py-2">Tarih</th>
              <th className="px-3 py-2">İşlem</th>
              <th className="px-3 py-2">Varlık</th>
              <th className="px-3 py-2">Kurum</th>
              <th className="px-3 py-2">Miktar</th>
              <th className="px-3 py-2">Maliyet</th>
              <th className="px-3 py-2">Pozisyon</th>
              <th className="px-3 py-2">Etki</th>
            </tr>
          </thead>
          <tbody>
            {operations.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-400">Henüz işlem kaydı bulunmuyor.</td>
              </tr>
            ) : (
              operations.map((row) => {
                const isPositive = row.pnl >= 0;

                return (
                  <tr key={row.id} className="border-t border-white/5 text-slate-200">
                    <td className="px-3 py-2 text-xs text-slate-400">{row.dateText}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full border border-emerald-300/35 bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">{row.type}</span>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-100">{row.assetName}</p>
                      <p className="text-[11px] text-slate-400">{row.category}</p>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-300">{row.institution}</td>
                    <td className="px-3 py-2 text-xs">{row.amount.toLocaleString('tr-TR')}</td>
                    <td className="px-3 py-2 text-xs">{formatCurrency(row.avgPrice, baseCurrency, rates)}</td>
                    <td className="px-3 py-2 text-xs">{formatCurrency(row.positionValue, baseCurrency, rates)}</td>
                    <td className={`px-3 py-2 text-xs font-semibold ${isPositive ? 'text-emerald-300' : 'text-rose-300'}`}>
                      <span className="inline-flex items-center gap-1">
                        {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {formatCurrency(row.pnl, baseCurrency, rates)} ({row.pnlRate >= 0 ? '+' : ''}{row.pnlRate.toFixed(2)}%)
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

OperationsPage.propTypes = {
  portfolio: PropTypes.arrayOf(PropTypes.object),
  marketData: PropTypes.object,
  baseCurrency: PropTypes.string,
  rates: PropTypes.object,
};

OperationsPage.defaultProps = {
  portfolio: [],
  marketData: {},
  baseCurrency: 'TRY',
  rates: {},
};
