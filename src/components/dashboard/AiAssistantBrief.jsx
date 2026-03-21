import React, { useEffect, useMemo, useState } from 'react';
import { Bot, MessageSquareText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDashboardData } from '../../context/DashboardContext';
import { resolveAssetActivePrice } from '../../utils/assetPricing';

const COMMAND_HISTORY_STORAGE_KEY = 'tek-finance:ai-command-history';
const MAX_BUBBLES = 3;

const normalize = (value) => String(value || '').toLocaleLowerCase('tr-TR').trim();

const readRecentCommands = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(COMMAND_HISTORY_STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, MAX_BUBBLES);
  } catch {
    return [];
  }
};

const buildPortfolioFacts = (portfolio, marketData) => {
  const rows = (Array.isArray(portfolio) ? portfolio : []).map((item) => {
    const amount = Number(item?.amount || 0);
    const price = Number(resolveAssetActivePrice(item, marketData) || 0);
    const value = Number.isFinite(amount * price) ? amount * price : 0;

    return {
      name: String(item?.name || item?.symbol || 'Varlık').trim(),
      category: String(item?.category || '').trim(),
      symbol: String(item?.symbol || '').trim().toUpperCase(),
      value,
    };
  }).filter((item) => item.value > 0);

  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  const top = sorted[0] || null;

  const goldValue = rows.reduce((sum, row) => {
    const label = normalize(`${row.name} ${row.category} ${row.symbol}`);
    const isGold = label.includes('altın') || label.includes('altin') || row.symbol.includes('GC=F') || row.symbol.includes('GRAM_ALTIN');
    return sum + (isGold ? row.value : 0);
  }, 0);

  const goldWeight = total > 0 ? (goldValue / total) * 100 : 0;
  const topWeight = top && total > 0 ? (top.value / total) * 100 : 0;

  return {
    total,
    top,
    topWeight,
    goldWeight,
    assetCount: rows.length,
  };
};

const createInsight = (command, facts) => {
  const normalizedCommand = normalize(command);

  if (!facts.total || facts.assetCount === 0) {
    return 'Portföyde henüz varlık görünmüyor. İlk varlıktan sonra öneriler netleşir.';
  }

  if (normalizedCommand.includes('altın') || normalizedCommand.includes('altin') || normalizedCommand.includes('gold')) {
    if (facts.goldWeight >= 45) {
      return `Altın portföyün yaklaşık %${facts.goldWeight.toFixed(0)} oranına ulaştı. Riski dengelemek için farklı bir varlık sınıfı eklemeyi değerlendirin.`;
    }

    return `Altın ağırlığı şu anda yaklaşık %${facts.goldWeight.toFixed(0)}. Dağılım dengesi korunuyor.`;
  }

  if (facts.top && facts.topWeight >= 40) {
    return `${facts.top.name} portföyde %${facts.topWeight.toFixed(0)} paya sahip. Konsantrasyon riskini azaltmak için dağılımı çeşitlendirin.`;
  }

  if (normalizedCommand.includes('usd') || normalizedCommand.includes('dolar') || normalizedCommand.includes('döviz') || normalizedCommand.includes('doviz')) {
    return 'Kur pozisyonu eklediniz. Nakit tamponu ve varlık dağılımını birlikte izlemek faydalı olur.';
  }

  return `Son işlem sonrası portföy ${facts.assetCount} varlıkta dağılıyor. Haftalık ağırlık kontrolüyle risk dengesini koruyabilirsiniz.`;
};

export default function AiAssistantBrief() {
  const { portfolio, marketData } = useDashboardData();
  const [commands, setCommands] = useState([]);

  useEffect(() => {
    const syncCommands = () => {
      setCommands(readRecentCommands());
    };

    syncCommands();

    window.addEventListener('storage', syncCommands);
    window.addEventListener('tek-finance:ai-command-history-updated', syncCommands);

    return () => {
      window.removeEventListener('storage', syncCommands);
      window.removeEventListener('tek-finance:ai-command-history-updated', syncCommands);
    };
  }, []);

  const facts = useMemo(() => buildPortfolioFacts(portfolio, marketData), [portfolio, marketData]);

  const bubbles = useMemo(() => {
    return commands.map((command, index) => ({
      id: `bubble-${index}-${command}`,
      user: command,
      ai: createInsight(command, facts),
    }));
  }, [commands, facts]);

  return (
    <motion.section
      layout
      transition={{ type: 'spring', stiffness: 150, damping: 22 }}
      className="col-span-12 rounded-2xl border border-white/10 bg-slate-900/40 p-5 shadow-[0_18px_54px_rgba(2,6,23,0.45)] backdrop-blur-xl"
    >
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-violet-300" />
        <h3 className="text-sm font-semibold text-slate-100">AI Kısa İçgörüler</h3>
      </div>
      <p className="mt-1 text-xs text-slate-400">Son komutlara göre bağlamsal, kısa öneriler</p>

      {bubbles.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-600/70 bg-slate-800/55 p-4 text-sm text-slate-300">
          <span className="inline-flex items-center gap-2"><MessageSquareText className="h-4 w-4" /> Henüz komut yok. AI komut satırına bir işlem yazın.</span>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {bubbles.map((entry) => (
            <div key={entry.id} className="space-y-2">
              <div className="ml-auto max-w-[90%] rounded-2xl border border-violet-300/35 bg-violet-500/12 px-3 py-2 text-sm text-violet-100">
                {entry.user}
              </div>
              <div className="max-w-[90%] rounded-2xl border border-slate-600/70 bg-slate-800/70 px-3 py-2 text-sm text-slate-100">
                {entry.ai}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
}
