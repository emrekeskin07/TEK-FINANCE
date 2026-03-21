import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';

const PRIVACY_STARTUP_STORAGE_KEY = 'tek-finance:privacy-startup-enabled';
const PRIVACY_AUTOHIDE_STORAGE_KEY = 'tek-finance:privacy-autohide-enabled';

const readStoredBoolean = (key, defaultValue = false) => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  const raw = window.localStorage.getItem(key);
  if (raw === null) {
    return defaultValue;
  }

  return raw === '1';
};

const writeStoredBoolean = (key, value) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, value ? '1' : '0');
};

const fieldLabelClass = 'text-xs font-bold uppercase tracking-tight text-slate-400';
const inputClassName = 'w-full rounded-xl border border-white/10 bg-slate-900/45 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-fuchsia-400/60';
const panelClassName = 'rounded-3xl border border-white/10 bg-slate-900/45 p-6 shadow-[0_30px_90px_rgba(2,6,23,0.58)] backdrop-blur-xl md:p-8';

export default function SettingsPage({
  user,
  isDarkMode,
  setThemeMode,
  baseCurrency,
  setBaseCurrency,
  isPrivacyActive,
  setPrivacyActive,
  insightTone,
  setInsightTone,
  onClearAllData,
}) {
  const [displayName, setDisplayName] = useState('');
  const [privacyAtStartup, setPrivacyAtStartup] = useState(false);
  const [autoHideEnabled, setAutoHideEnabled] = useState(false);

  useEffect(() => {
    const nextName = user?.user_metadata?.full_name
      || user?.user_metadata?.name
      || user?.email?.split('@')?.[0]
      || '';
    setDisplayName(nextName);
  }, [user]);

  useEffect(() => {
    setPrivacyAtStartup(readStoredBoolean(PRIVACY_STARTUP_STORAGE_KEY, false));
    setAutoHideEnabled(readStoredBoolean(PRIVACY_AUTOHIDE_STORAGE_KEY, false));
  }, []);

  const emailValue = useMemo(() => String(user?.email || ''), [user]);

  const handleChangePassword = () => {
    toast('Bu özellik yakında eklenecek');
  };

  const handlePrivacyStartupToggle = () => {
    const next = !privacyAtStartup;
    setPrivacyAtStartup(next);
    writeStoredBoolean(PRIVACY_STARTUP_STORAGE_KEY, next);

    if (next) {
      setPrivacyActive(true);
    }
  };

  const handleAutoHideToggle = () => {
    const next = !autoHideEnabled;
    setAutoHideEnabled(next);
    writeStoredBoolean(PRIVACY_AUTOHIDE_STORAGE_KEY, next);
  };

  const handleDangerClear = async () => {
    const isConfirmed = window.confirm('Emin misiniz? Tüm varlık verileriniz kalıcı olarak silinecektir!');
    if (!isConfirmed) {
      return;
    }

    await onClearAllData?.();
  };

  const handleExportJson = () => {
    console.log('Export triggered');
  };

  return (
    <section className={`mx-auto w-full max-w-5xl ${panelClassName}`}>
      <header className="mb-6 border-b border-white/10 pb-4">
        <h2 className="text-xl font-black tracking-tight text-slate-50">Ayarlar</h2>
        <p className="mt-2 text-sm text-slate-400">Hesap, görünüm, gizlilik ve veri yönetimi ayarlarını buradan kontrol edebilirsiniz.</p>
      </header>

      <div className="space-y-7">
        <section className="border-b border-white/10 pb-6">
          <h3 className="mb-4 text-sm font-extrabold uppercase tracking-[0.06em] text-slate-200">Hesap Bilgileri</h3>

          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-12 md:items-center md:gap-5">
              <label className={`md:col-span-4 ${fieldLabelClass}`}>Display Name</label>
              <div className="md:col-span-8">
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className={inputClassName}
                  placeholder="Ad Soyad"
                />
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-12 md:items-center md:gap-5">
              <label className={`md:col-span-4 ${fieldLabelClass}`}>Email</label>
              <div className="md:col-span-8">
                <input
                  type="email"
                  value={emailValue}
                  readOnly
                  className={`${inputClassName} cursor-not-allowed opacity-80`}
                />
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-12 md:items-center md:gap-5">
              <p className={`md:col-span-4 ${fieldLabelClass}`}>Şifreyi Değiştir</p>
              <div className="md:col-span-8">
                <button
                  type="button"
                  onClick={handleChangePassword}
                  className="inline-flex min-h-[42px] items-center rounded-xl border border-fuchsia-300/35 bg-fuchsia-500/15 px-4 py-2 text-xs font-semibold text-fuchsia-100 transition-all duration-200 hover:scale-[1.02] hover:bg-fuchsia-500/20"
                >
                  Şifreyi Değiştir
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 pb-6">
          <h3 className="mb-4 text-sm font-extrabold uppercase tracking-[0.06em] text-slate-200">Görünüm</h3>

          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-12 md:items-center md:gap-5">
              <p className={`md:col-span-4 ${fieldLabelClass}`}>Tema</p>
              <div className="md:col-span-8">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-100">
                    <input
                      type="radio"
                      name="theme-mode"
                      checked={isDarkMode}
                      onChange={() => setThemeMode?.('dark')}
                      className="h-4 w-4 accent-fuchsia-400"
                    />
                    Koyu
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-100">
                    <input
                      type="radio"
                      name="theme-mode"
                      checked={!isDarkMode}
                      onChange={() => setThemeMode?.('light')}
                      className="h-4 w-4 accent-fuchsia-400"
                    />
                    Açık
                  </label>
                </div>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-12 md:items-center md:gap-5">
              <p className={`md:col-span-4 ${fieldLabelClass}`}>Para Birimi</p>
              <div className="md:col-span-8">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-100">
                    <input
                      type="radio"
                      name="base-currency"
                      checked={baseCurrency === 'TRY'}
                      onChange={() => setBaseCurrency?.('TRY')}
                      className="h-4 w-4 accent-fuchsia-400"
                    />
                    TRY
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-100">
                    <input
                      type="radio"
                      name="base-currency"
                      checked={baseCurrency === 'USD'}
                      onChange={() => setBaseCurrency?.('USD')}
                      className="h-4 w-4 accent-fuchsia-400"
                    />
                    USD
                  </label>
                </div>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-12 md:items-center md:gap-5">
              <p className={`md:col-span-4 ${fieldLabelClass}`}>Yorum Stili</p>
              <div className="md:col-span-8">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-100">
                    <input
                      type="radio"
                      name="insight-tone"
                      checked={insightTone === 'coaching'}
                      onChange={() => setInsightTone?.('coaching')}
                    />
                    Koçluk odaklı
                  </label>

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-100">
                    <input
                      type="radio"
                      name="insight-tone"
                      checked={insightTone === 'neutral'}
                      onChange={() => setInsightTone?.('neutral')}
                    />
                    Nötr analitik
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 pb-6">
          <h3 className="mb-4 text-sm font-extrabold uppercase tracking-[0.06em] text-slate-200">Gizlilik</h3>

          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-12 md:items-center md:gap-5">
              <p className={`md:col-span-4 ${fieldLabelClass}`}>Başlangıç Ayarı</p>
              <div className="md:col-span-8">
                <button
                  type="button"
                  onClick={handlePrivacyStartupToggle}
                  aria-pressed={privacyAtStartup}
                  className={`inline-flex min-h-[42px] items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    privacyAtStartup
                      ? 'border-emerald-300/45 bg-emerald-500/20 text-emerald-100'
                      : 'border-white/10 bg-slate-900/45 text-slate-200'
                  }`}
                >
                  <span
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${privacyAtStartup ? 'bg-emerald-400/70' : 'bg-slate-700'}`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${privacyAtStartup ? 'translate-x-4' : 'translate-x-0.5'}`}
                    />
                  </span>
                  Gizlilik Modu her açılışta aktif olsun
                </button>
                <p className="mt-1 text-xs text-slate-500">Şu anki durum: {isPrivacyActive ? 'Aktif' : 'Kapalı'}</p>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-12 md:items-center md:gap-5">
              <p className={`md:col-span-4 ${fieldLabelClass}`}>Otomatik Gizle</p>
              <div className="md:col-span-8">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-100">
                  <input
                    type="checkbox"
                    checked={autoHideEnabled}
                    onChange={handleAutoHideToggle}
                    className="h-4 w-4 accent-fuchsia-400"
                  />
                  Finansal verileri 10 saniye işlem yapılmazsa otomatik gizle
                </label>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-sm font-extrabold uppercase tracking-[0.06em] text-rose-200">Veri (Danger Zone)</h3>

          <div className="space-y-3">
            <div className="grid gap-2 md:grid-cols-12 md:items-center md:gap-5">
              <p className={`md:col-span-4 ${fieldLabelClass}`}>Tum Verileri Temizle</p>
              <div className="md:col-span-8">
                <button
                  type="button"
                  onClick={handleDangerClear}
                  className="inline-flex min-h-[42px] items-center rounded-xl border border-rose-300/45 bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-100 transition-all duration-200 hover:scale-[1.02] hover:bg-rose-500/30"
                >
                  Tüm Verileri Temizle
                </button>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-12 md:items-center md:gap-5">
              <p className={`md:col-span-4 ${fieldLabelClass}`}>Verileri Dışa Aktar (JSON)</p>
              <div className="md:col-span-8">
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="inline-flex min-h-[42px] items-center rounded-xl border border-white/15 bg-slate-900/50 px-4 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-800/70"
                >
                  JSON Aktar
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

SettingsPage.propTypes = {
  user: PropTypes.object,
  isDarkMode: PropTypes.bool.isRequired,
  setThemeMode: PropTypes.func.isRequired,
  baseCurrency: PropTypes.string.isRequired,
  setBaseCurrency: PropTypes.func.isRequired,
  isPrivacyActive: PropTypes.bool.isRequired,
  setPrivacyActive: PropTypes.func.isRequired,
  insightTone: PropTypes.oneOf(['coaching', 'neutral']),
  setInsightTone: PropTypes.func,
  onClearAllData: PropTypes.func,
};

SettingsPage.defaultProps = {
  user: null,
  insightTone: 'coaching',
  setInsightTone: () => {},
  onClearAllData: null,
};
