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
import { Command, Loader2, Plus, Sparkles, X } from 'lucide-react';
import { fetchSymbolSuggestions, fetchYahooData } from '../services/api';
import { parseNaturalInvestmentCommand } from '../services/nlInvestmentParser';

const PLACEHOLDER_HINTS = [
  '1000 TL Tesla al...',
  '70 gram altın ekle...',
  'Portföyüm ne durumda?',
  '5 adet Apple hissesi ekle...',
];

const TYPE_SPEED_MS = 45;
const DELETE_SPEED_MS = 26;
const HOLD_MS = 1100;
const PRICE_LOOKUP_DEBOUNCE_MS = 360;
const COMMAND_HISTORY_STORAGE_KEY = 'tek-finance:ai-command-history';
const MAX_HISTORY_COUNT = 3;

const QUICK_ACTIONS = [
  { id: 'portfolio', label: '📈 Portföy Özeti', command: 'Portföyüm ne durumda?' },
  { id: 'gold-add', label: '💰 Altın Ekle', command: '1000 TL altın ekle' },
  { id: 'goal', label: '🎯 Hedef Durumu', command: 'Hedefime ne kadar kaldı?' },
  { id: 'thy-price', label: '🔍 THY Fiyatı', command: 'THYAO.IS' },
];

const normalize = (value) => String(value || '').toLocaleLowerCase('tr-TR').trim();

const readCommandHistory = () => {
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
      .map((entry) => String(entry || '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

const writeCommandHistory = (history) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(COMMAND_HISTORY_STORAGE_KEY, JSON.stringify(history));
};

const buildPreviewFromParsed = (parsed) => {
  if (!parsed || parsed.kind === 'empty') {
    return '';
  }

  if (parsed.kind === 'portfolio_status') {
    return 'Portföy özeti ve analiz bölümüne yönlendirilecek.';
  }

  if (parsed.kind === 'goal_status') {
    return 'Hedef ilerleme özeti açılacak.';
  }

  if (parsed.kind === 'gold_price') {
    return 'Anlık Gram Altın fiyatı gösterilecek.';
  }

  if (parsed.kind === 'add_asset') {
    const quantityText = Number.isFinite(Number(parsed.quantity))
      ? Number(parsed.quantity).toLocaleString('tr-TR', { maximumFractionDigits: 4 })
      : '';
    const unitText = parsed.unit || (parsed.asset_type === 'gold' || parsed.asset_type === 'silver' ? 'gram' : 'adet');
    const assetText = parsed.asset_name || parsed.asset_type || 'varlık';
    return `${quantityText ? `${quantityText} ${unitText}` : ''} ${assetText} için işlem hazırlanıyor.`.replace(/\s+/g, ' ').trim();
  }

  if (parsed.kind === 'unknown' && parsed.suggestion) {
    return parsed.suggestion;
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

const AiCommandBar = forwardRef(function AiCommandBar({ onExecute, onQuickAddAsset, onDismiss, autoFocusOnMount }, ref) {
  const inputRef = useRef(null);
  const [value, setValue] = useState('');
  const [typedHint, setTypedHint] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [resultFeedback, setResultFeedback] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [priceResult, setPriceResult] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [activeChipId, setActiveChipId] = useState('');

  const parsedIntent = useMemo(() => parseNaturalInvestmentCommand(value), [value]);
  const previewText = useMemo(() => buildPreviewFromParsed(parsedIntent), [parsedIntent]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      setIsFocused(true);
      inputRef.current?.focus();
    },
  }));

  useEffect(() => {
    if (!autoFocusOnMount) {
      return;
    }

    setIsFocused(true);
    inputRef.current?.focus();
  }, [autoFocusOnMount]);

  useEffect(() => {
    setCommandHistory(readCommandHistory());
  }, []);

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

  const pushHistory = (commandText) => {
    const normalizedText = String(commandText || '').trim();
    if (!normalizedText) {
      return;
    }

    setCommandHistory((prev) => {
      const deduped = prev.filter((entry) => normalize(entry) !== normalize(normalizedText));
      const next = [normalizedText, ...deduped].slice(0, MAX_HISTORY_COUNT);
      writeCommandHistory(next);
      return next;
    });
  };

  const isSuccessfulResult = (message, intentKind) => {
    const normalizedMessage = normalize(message);
    if (!normalizedMessage) {
      return false;
    }

    if (intentKind === 'unknown' || intentKind === 'empty') {
      return false;
    }

    if (normalizedMessage.includes('anlayamad')) {
      return false;
    }

    return true;
  };

  const executeCommand = async (rawCommand) => {
    const commandText = String(rawCommand || value || '').trim();
    if (!commandText) {
      return;
    }

    const parsed = parseNaturalInvestmentCommand(commandText);

    setIsAnalyzing(true);
    setResultFeedback({
      type: 'analyzing',
      title: 'Analyzing...',
      message: 'Komutunuz doğal dil parser tarafından çözümleniyor.',
    });

    if (parsed.kind === 'unknown' && parsed.suggestion) {
      setIsAnalyzing(false);
      setResultFeedback({
        type: 'error',
        title: 'Komut netleşmedi',
        message: parsed.suggestion,
      });
      return;
    }

    if (parsed.kind === 'unknown' && priceResult) {
      const localPriceMessage = `${priceResult.name} (${priceResult.symbol}) anlık fiyatı: ${formattedPrice} ${priceResult.currency} (${formattedChange})`;
      setIsAnalyzing(false);
      setResultFeedback({
        type: 'info',
        title: '📊 Fiyat Bilgisi',
        message: localPriceMessage,
      });
      pushHistory(commandText);
      return;
    }

    try {
      const result = await onExecute?.(parsed);
      const nextMessage = String(result?.message || '').trim();
      const fallbackSuccess = parsed.kind === 'add_asset'
        ? `✅ ${parsed.quantity || ''}${parsed.unit ? ` ${parsed.unit}` : ''} ${parsed.asset_name || parsed.asset_type || 'varlık'} işlendi. 📊 Average cost updated.`.replace(/\s+/g, ' ').trim()
        : 'Komut başarıyla uygulandı.';

      setIsAnalyzing(false);

      const resolvedMessage = nextMessage || fallbackSuccess;
      setResultFeedback({
        type: 'success',
        title: parsed.kind === 'add_asset' ? '✅ İşlem Alındı' : '✅ Komut Uygulandı',
        message: resolvedMessage,
        meta: {
          intent: parsed.intent,
          assetType: parsed.asset_type,
          assetName: parsed.asset_name,
          quantity: parsed.quantity,
          unit: parsed.unit,
        },
      });

      if (isSuccessfulResult(resolvedMessage, parsed.kind)) {
        pushHistory(commandText);
      }
    } catch {
      setIsAnalyzing(false);
      setResultFeedback({
        type: 'error',
        title: 'Komut işlenemedi',
        message: 'Lütfen ifadeyi biraz daha net yazıp tekrar deneyin.',
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    await executeCommand(value);
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

  const historyItems = useMemo(() => commandHistory.slice(0, 3), [commandHistory]);

  const handleQuickAction = async (chip) => {
    if (!chip) {
      return;
    }

    setActiveChipId(chip.id);
    setValue(chip.command);
    setShowHistoryPanel(false);
    await executeCommand(chip.command);
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      if (historyItems.length > 0) {
        event.preventDefault();
        setShowHistoryPanel(true);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setShowHistoryPanel(false);
      onDismiss?.();
    }
  };

  return (
    <section className="mx-auto w-full max-w-[1160px] px-3 sm:px-4 md:px-8">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`rounded-3xl border bg-white/92 p-4 shadow-[0_28px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:bg-slate-900/88 ${isFocused ? 'border-violet-400/70 shadow-[0_0_0_1px_rgba(167,139,250,0.5),0_0_48px_rgba(59,130,246,0.22)]' : 'border-slate-200 dark:border-slate-700'}`}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-300/35 bg-violet-500/12 text-violet-500 dark:text-violet-300">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <input
              ref={inputRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleInputKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full bg-transparent text-lg text-slate-800 outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-500"
              placeholder={`Nasıl yardımcı olabilirim? ${typedHint}`}
            />
          </div>
          {isPriceLoading || isAnalyzing ? <Loader2 className="h-5 w-5 animate-spin text-violet-400" /> : null}
          <button
            type="submit"
            className="inline-flex h-11 items-center gap-1 rounded-xl border border-violet-300/40 bg-violet-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
          >
            <Command className="h-3.5 w-3.5" />
            Çalıştır
          </button>
          <button
            type="button"
            onClick={() => onDismiss?.()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Komut satirini kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <AnimatePresence>
          {showHistoryPanel && historyItems.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mt-2 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/70"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Geçmiş</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {historyItems.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={async () => {
                      setValue(entry);
                      setShowHistoryPanel(false);
                      await executeCommand(entry);
                    }}
                    className="rounded-full border border-slate-300/80 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {entry}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mt-2 overflow-hidden"
          >
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((chip) => {
                const isActive = activeChipId === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onMouseEnter={() => setActiveChipId(chip.id)}
                    onFocus={() => setActiveChipId(chip.id)}
                    onClick={() => handleQuickAction(chip)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${isActive ? 'border-violet-400/80 bg-violet-500/15 text-violet-700 shadow-[0_0_0_1px_rgba(139,92,246,0.35),0_0_18px_rgba(139,92,246,0.24)] dark:text-violet-200' : 'border-slate-300/80 bg-slate-100/70 text-slate-700 hover:border-violet-300/70 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-violet-400/60 dark:hover:text-violet-200'}`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

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
          {resultFeedback ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={`mt-2 rounded-2xl border px-3 py-2 text-sm ${resultFeedback.type === 'error' ? 'border-rose-300/60 bg-rose-500/10 text-rose-200' : resultFeedback.type === 'success' ? 'border-emerald-300/50 bg-emerald-500/10 text-emerald-100' : 'border-slate-200/80 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}
            >
              <p className="font-semibold">{resultFeedback.title}</p>
              <p className="mt-1">{resultFeedback.message}</p>
              {resultFeedback.meta ? (
                <p className="mt-1 text-xs opacity-80">
                  intent: {resultFeedback.meta.intent || '-'} | asset_type: {resultFeedback.meta.assetType || '-'} | asset_name: {resultFeedback.meta.assetName || '-'} | quantity: {resultFeedback.meta.quantity ?? '-'} | unit: {resultFeedback.meta.unit || '-'}
                </p>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {historyItems.length > 0 ? (
          <div className="mt-3 flex flex-col items-start gap-2">
            {historyItems.map((entry, index) => (
              <button
                key={`${entry}-${index}`}
                type="button"
                onClick={async () => {
                  setValue(entry);
                  await executeCommand(entry);
                }}
                className="max-w-[85%] rounded-2xl border border-slate-300/70 bg-white px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {entry}
              </button>
            ))}
          </div>
        ) : null}
      </motion.form>
    </section>
  );
});

AiCommandBar.propTypes = {
  onExecute: PropTypes.func,
  onQuickAddAsset: PropTypes.func,
  onDismiss: PropTypes.func,
  autoFocusOnMount: PropTypes.bool,
};

AiCommandBar.defaultProps = {
  onExecute: async () => ({ message: '' }),
  onQuickAddAsset: () => {},
  onDismiss: () => {},
  autoFocusOnMount: true,
};

export default AiCommandBar;
