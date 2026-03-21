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
import { Command, Sparkles } from 'lucide-react';

const PLACEHOLDER_HINTS = [
  '1000 TL altın ekle...',
  'Portföyüm ne durumda?',
  'Hedefime ne kadar kaldı?',
];

const TYPE_SPEED_MS = 45;
const DELETE_SPEED_MS = 26;
const HOLD_MS = 1100;

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

const AiCommandBar = forwardRef(function AiCommandBar({ onExecute }, ref) {
  const inputRef = useRef(null);
  const [value, setValue] = useState('');
  const [typedHint, setTypedHint] = useState('');
  const [hintIndex, setHintIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

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
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-violet-300/40 bg-violet-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-violet-700"
          >
            <Command className="h-3.5 w-3.5" />
            Çalıştır
          </button>
        </div>

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
};

AiCommandBar.defaultProps = {
  onExecute: async () => ({ message: '' }),
};

export default AiCommandBar;
