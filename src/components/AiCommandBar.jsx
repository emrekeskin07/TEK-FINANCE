import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { AnimatePresence, motion } from 'framer-motion';
import { Command, Loader2, Plus, Sparkles } from 'lucide-react';
import { fetchSymbolSuggestions, fetchYahooData } from '../services/api';

const PLACEHOLDER_HINTS = [
  '1000 TL altın ekle...',
  'Portföyüm ne durumda?',
  'Hedefime ne kadar kaldı?',
];

const TYPE_SPEED_MS = 45;
const DELETE_SPEED_MS = 26;
const HOLD_MS = 1100;
const PRICE_LOOKUP_DEBOUNCE_MS = 360;

const normalize = (value) => String(value || '').toLocaleLowerCase('tr-TR').trim();

const parseIntent = (inputValue) => {
  const raw = String(inputValue || '').trim();
  const normalized = normalize(raw);

  if (!normalized) {
    return { kind: 'empty', raw };
  }

  if (normalized.includes('portföyüm ne durumda') || normalized.includes('portfoyum ne durumda') || normalized.includes('portföyüm nasıl') || normalized.includes('portfoyum nasil')) {
    return { kind: 'portfolio_status', raw };
  }

  if (normalized.includes('hedefime ne kadar kaldı') || normalized.includes('hedefime ne kadar kaldi')) {
    return { kind: 'goal_status', raw };
  }

  if (normalized.includes('altın fiyatı ne') || normalized.includes('altin fiyati ne') || normalized.includes('gram altın kaç') || normalized.includes('gram altin kac')) {
    return { kind: 'gold_price', raw };
  }

  const addMatch = raw.match(/(\d+(?:[\.,]\d+)?)\s*(tl|try)?\s*(altın|altin|gümüş|gumus|nakit|dolar|usd)?\s*(ekle|yatır|yatir)?/i);
  if (addMatch) {
    const amountRaw = String(addMatch[1] || '').replace(',', '.');
    const amount = Number(amountRaw);
    const assetToken = normalize(addMatch[3] || 'nakit');

    let assetType = 'nakit';
    if (assetToken.includes('alt')) {
      assetType = 'altin';
    } else if (assetToken.includes('gümüş') || assetToken.includes('gumus')) {
      assetType = 'gumus';
    } else if (assetToken.includes('dolar') || assetToken.includes('usd')) {
      assetType = 'usd';
    }

    if (Number.isFinite(amount) && amount > 0 && normalized.includes('ekle')) {
      return {
        kind: 'add_asset',
        raw,
        amount,
        assetType,
      };
    }
  }

  return { kind: 'unknown', raw };
};

const buildPreview = (intent) => {
  if (!intent || intent.kind === 'empty') {
    return '';
  }

  if (intent.kind === 'portfolio_status') {
    return 'Portföy özeti ve analiz bölümüne yönlendirilecek.';
  }

  if (intent.kind === 'goal_status') {
    return 'Hedef ilerleme özeti açılacak.';
  }

  if (intent.kind === 'gold_price') {
    return 'Anlık Gram Altın fiyatı gösterilecek.';
  }

  if (intent.kind === 'add_asset') {
    const amountText = intent.amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
    const labelMap = {
      nakit: 'Nakit',
      altin: 'Altın',
      gumus: 'Gümüş',
      usd: 'USD',
    };

    return `₺${amountText} tutarında ${labelMap[intent.assetType] || 'Nakit'} varlık ekleniyor...`;
  }

  return 'Komut analiz ediliyor. Daha net bir ifade deneyebilirsin.';
};

const shouldSkipPriceLookup = (input) => {
  const normalized = normalize(input);
  if (!normalized || normalized.length < 2) {
    return true;
  }

  const commandTokens = ['ekle', 'yatır', 'yatir', 'portföyüm', 'portfoyum', 'hedefime', 'kaldı', 'kaldi'];
  return commandTokens.some((token) => normalized.includes(token));
};

const normalizeSuggestionToSymbol = (suggestion, input) => {
  const typed = String(input || '').trim();
  const normalizedTyped = normalize(typed);

  if (normalizedTyped === 'bitcoin' || normalizedTyped === 'btc') {
    return { symbol: 'BTC-USD', name: 'Bitcoin' };
  }

  if (normalizedTyped === 'gram altın' || normalizedTyped === 'gram altin') {
    return { symbol: 'GC=F', name: 'Gram Altın' };
  }

  const symbol = String(suggestion?.symbol || typed).trim().toUpperCase();
  const name = String(suggestion?.name || suggestion?.symbol || typed).trim();
  return { symbol, name };
};

const inferCategoryFromSymbol = (symbol, name) => {
  const normalizedSymbol = String(symbol || '').toUpperCase();
  const normalizedName = normalize(name);

  if (normalizedSymbol.includes('BTC') || normalizedSymbol.includes('ETH') || normalizedName.includes('bitcoin')) {
    return 'Kripto';
  }

  if (normalizedSymbol.includes('=X') || normalizedSymbol.includes('-USD')) {
    return 'Döviz';
  }

  if (normalizedSymbol === 'GC=F' || normalizedSymbol === 'SI=F' || normalizedName.includes('altın') || normalizedName.includes('altin')) {
    return 'Değerli Madenler';
  }

  return 'Hisse Senedi';
};

const AiCommandBar = forwardRef(function AiCommandBar({ onExecute, onQuickAddAsset }, ref) {
  const inputRef = useRef(null);
  const [value, setValue] = useState('');
  const [typedHint, setTypedHint] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [priceResult, setPriceResult] = useState(null);

  const intent = useMemo(() => parseIntent(value), [value]);
  const previewText = useMemo(() => buildPreview(intent), [intent]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      setIsFocused(true);
      inputRef.current?.focus();
    },
  }));

  useEffect(() => {
    let timer;
    const currentHint = PLACEHOLDER_HINTS[hintIndex % PLACEHOLDER_HINTS.length];

    if (!isDeleting && typedHint.length < currentHint.length) {
      timer = window.setTimeout(() => {
        setTypedHint(currentHint.slice(0, typedHint.length + 1));
      }, TYPE_SPEED_MS);
    } else if (!isDeleting && typedHint.length === currentHint.length) {
      timer = window.setTimeout(() => {
        setIsDeleting(true);
      }, HOLD_MS);
    } else if (isDeleting && typedHint.length > 0) {
      timer = window.setTimeout(() => {
        setTypedHint(currentHint.slice(0, typedHint.length - 1));
      }, DELETE_SPEED_MS);
    } else if (isDeleting && typedHint.length === 0) {
      setIsDeleting(false);
      setHintIndex((prev) => (prev + 1) % PLACEHOLDER_HINTS.length);
    }

    return () => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [typedHint, isDeleting, hintIndex]);

  useEffect(() => {
    const onShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && String(event.key || '').toLowerCase() === 'k') {
        event.preventDefault();
        setIsFocused(true);
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  useEffect(() => {
    const query = String(value || '').trim();
    if (shouldSkipPriceLookup(query)) {
      setPriceResult(null);
      setIsPriceLoading(false);
      return undefined;
    }

    let isDisposed = false;
    const timeout = window.setTimeout(async () => {
      setIsPriceLoading(true);

      try {
        const suggestions = await fetchSymbolSuggestions(query);
        const primary = suggestions[0] || { symbol: query, name: query };
        const normalized = normalizeSuggestionToSymbol(primary, query);
        const quote = await fetchYahooData(normalized.symbol);

        if (isDisposed) {
          return;
        }

        if (!quote || !Number.isFinite(Number(quote.price))) {
          setPriceResult(null);
          return;
        }

        setPriceResult({
          symbol: quote.symbol || normalized.symbol,
          name: normalized.name || quote.symbol,
          price: Number(quote.price),
          currency: String(quote.currency || '').toUpperCase() || 'TRY',
          changePercent: Number.isFinite(Number(quote.changePercent)) ? Number(quote.changePercent) : 0,
          category: inferCategoryFromSymbol(quote.symbol || normalized.symbol, normalized.name),
        });
      } catch {
        if (!isDisposed) {
          setPriceResult(null);
        }
      } finally {
        if (!isDisposed) {
          setIsPriceLoading(false);
        }
      }
    }, PRICE_LOOKUP_DEBOUNCE_MS);

    return () => {
      isDisposed = true;
      window.clearTimeout(timeout);
    };
  }, [value]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!value.trim()) {
      return;
    }

    const result = await onExecute?.(intent);
    if (result?.message) {
      setResultMessage(result.message);
      window.setTimeout(() => setResultMessage(''), 3200);
    }
  };

  const handleQuickAddFromPrice = () => {
    if (!priceResult) {
      return;
    }

    onQuickAddAsset?.({
      symbol: priceResult.symbol,
      name: priceResult.name,
      category: priceResult.category,
      avgPrice: priceResult.price,
      currency: priceResult.currency,
    });
  };

  const changeClass = priceResult
    ? (priceResult.changePercent > 0 ? 'text-emerald-500' : (priceResult.changePercent < 0 ? 'text-red-500' : 'text-slate-400'))
    : 'text-slate-400';

  const formattedPrice = priceResult
    ? priceResult.price.toLocaleString('tr-TR', { maximumFractionDigits: 4 })
    : '';

  const formattedChange = priceResult
    ? `${priceResult.changePercent >= 0 ? '+' : '-'}%${Math.abs(priceResult.changePercent).toFixed(2)}`
    : '';

  return (
    <section className="mx-auto w-full max-w-[960px] px-3 sm:px-4 md:px-8">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`rounded-2xl border bg-white/90 p-3 shadow-md backdrop-blur-xl dark:bg-slate-900/85 ${isFocused ? 'border-violet-400/65 shadow-[0_0_0_1px_rgba(167,139,250,0.45),0_0_36px_rgba(59,130,246,0.22)] animate-pulse' : 'border-slate-200 dark:border-slate-700'}`}
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-violet-300/35 bg-violet-500/12 text-violet-500 dark:text-violet-300">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <input
              ref={inputRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-500"
              placeholder={`Nasıl yardımcı olabilirim? ${typedHint}`}
            />
          </div>
          {isPriceLoading ? <Loader2 className="h-4 w-4 animate-spin text-violet-400" /> : null}
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-violet-300/40 bg-violet-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
          >
            <Command className="h-3.5 w-3.5" />
            Çalıştır
          </button>
        </div>

        <AnimatePresence>
          {priceResult ? (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-violet-300/30 bg-violet-500/10 px-3 py-2"
            >
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{priceResult.name} ({priceResult.symbol})</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {formattedPrice} {priceResult.currency}
                  <span className={`ml-2 text-xs font-semibold ${changeClass}`}>{formattedChange}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleQuickAddFromPrice}
                className="inline-flex items-center gap-1 rounded-lg border border-violet-300/35 bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Portföyüme Ekle
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {value.trim() ? (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-2 text-xs text-slate-500 dark:text-slate-400"
            >
              {previewText}
            </motion.p>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {resultMessage ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-2 rounded-lg border border-violet-300/30 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-700 dark:text-violet-200"
            >
              {resultMessage}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.form>
    </section>
  );
});

AiCommandBar.propTypes = {
  onExecute: PropTypes.func,
  onQuickAddAsset: PropTypes.func,
};

AiCommandBar.defaultProps = {
  onExecute: async () => ({ message: '' }),
  onQuickAddAsset: () => {},
};

export default AiCommandBar;
