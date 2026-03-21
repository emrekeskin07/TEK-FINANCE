import React, { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronDown, Eye, EyeOff, Menu, Moon, Plus, RefreshCw, Sun } from 'lucide-react';
import { useSyncState } from '../context/SyncContext';
import { usePrivacy } from '../context/PrivacyContext';
import SplitText from './ui/SplitText';

export default function Header({
  activePage,
  onToggleSidebar = () => {},
  baseCurrency,
  setBaseCurrency,
  openAddModal,
  openQuickAddModal,
  isDarkMode = false,
  onToggleTheme = () => {},
  loading,
  syncFailed,
  onRefresh,
  onToggleAlerts,
  hasActiveAlerts = false,
  alertCount = 0,
}) {
  const { isPrivacyActive, togglePrivacy } = usePrivacy();
  const { lastSyncTime } = useSyncState();
  const [now, setNow] = useState(Date.now());
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const [isAddChoiceOpen, setIsAddChoiceOpen] = useState(false);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  const elapsedMinutes = useMemo(() => {
    if (lastSyncTime === null || lastSyncTime === undefined) {
      return 0;
    }

    const syncTimestamp = Number(lastSyncTime);
    if (!Number.isFinite(syncTimestamp) || syncTimestamp <= 0) {
      return 0;
    }

    const diffMs = Math.max(0, now - syncTimestamp);
    return Math.floor(diffMs / 60000);
  }, [lastSyncTime, now]);

  const isStale = elapsedMinutes > 30;
  const hasSuccessfulSync = lastSyncTime !== null && lastSyncTime !== undefined && Number.isFinite(Number(lastSyncTime)) && Number(lastSyncTime) > 0;
  const timestampToneClass = syncFailed
    ? 'text-rose-400'
    : (isStale ? 'text-amber-300' : 'text-slate-400');

  const currentCurrencyIcon = baseCurrency === 'USD' ? '$' : '₺';

  const handleCurrencySelect = (nextCurrency) => {
    setBaseCurrency(nextCurrency);
    setIsCurrencyMenuOpen(false);
  };

  const handleOpenAddChoice = () => {
    setIsAddChoiceOpen(true);
  };

  const handleCloseAddChoice = () => {
    setIsAddChoiceOpen(false);
  };

  const handleOpenManualAdd = () => {
    setIsAddChoiceOpen(false);
    openAddModal();
  };

  const handleOpenQuickAdd = () => {
    setIsAddChoiceOpen(false);
    openQuickAddModal();
  };

  return (
    <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-4 md:gap-5">
      <div className="flex items-center gap-3 w-full md:w-auto">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-slate-900/45 text-slate-50 transition-all duration-200 hover:scale-105 hover:bg-slate-800/60 active:scale-95"
          title="Menü"
          aria-label="Sidebar menüyü aç"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="bg-primary/20 p-0 w-8 h-8 rounded-lg border border-primary/30 backdrop-blur-md overflow-hidden">
          <img
            src="/pwa-192x192.png"
            alt="TEK Finans logo"
            className="object-cover w-full h-full rounded-lg"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            <SplitText text="TEK Finans" by="chars" stagger={0.045} />
          </h1>
          <p className="text-sm text-slate-400">Banka & Kurum Bazlı Varlık Takibi</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 w-full md:w-auto">
        {activePage === 'dashboard' ? (
          <>
            <div className="relative z-50">
              <button
                type="button"
                onClick={() => setIsCurrencyMenuOpen((prev) => !prev)}
                onBlur={() => window.setTimeout(() => setIsCurrencyMenuOpen(false), 120)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/5 bg-slate-900/35 px-3 text-xs font-semibold text-slate-200 backdrop-blur-xl transition-all duration-200 hover:bg-slate-800/55"
                title="Para birimi seç"
                aria-haspopup="menu"
                aria-expanded={isCurrencyMenuOpen}
              >
                <span className="text-sm leading-none">{currentCurrencyIcon}</span>
                <span>{baseCurrency}</span>
                <ChevronDown size={14} className={`transition-transform ${isCurrencyMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCurrencyMenuOpen ? (
                <div className="absolute right-0 mt-1 min-w-[130px] rounded-lg border border-white/10 bg-slate-950/95 p-1 shadow-2xl backdrop-blur-xl" role="menu">
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleCurrencySelect('TRY')}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold transition-colors ${baseCurrency === 'TRY' ? 'bg-emerald-500/20 text-emerald-200' : 'text-slate-200 hover:bg-white/10'}`}
                    role="menuitem"
                    title="Portföyü TL görüntüle"
                  >
                    <span className="text-sm leading-none">₺</span>
                    TRY
                  </button>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleCurrencySelect('USD')}
                    className={`mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold transition-colors ${baseCurrency === 'USD' ? 'bg-sky-500/20 text-sky-200' : 'text-slate-200 hover:bg-white/10'}`}
                    role="menuitem"
                    title="Portföyü USD görüntüle"
                  >
                    <span className="text-sm leading-none">$</span>
                    USD
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/5 bg-slate-900/40 text-slate-200 transition-all duration-300 hover:scale-105 hover:bg-slate-800/60 active:scale-95 disabled:opacity-50"
              title="Verileri Yenile"
              aria-label="Verileri Yenile"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin text-emerald-400' : 'text-slate-300'} />
            </button>

            <span className={`text-xs whitespace-nowrap ${timestampToneClass}`}>
              {hasSuccessfulSync
                ? `Veriler ${elapsedMinutes} dakika önce güncellendi`
                : 'Henüz başarılı güncelleme yok'}
            </span>
            {syncFailed ? (
              <span className="text-[11px] text-rose-400 whitespace-nowrap">
                Veriler Güncellenemedi - Bağlantınızı Kontrol Edin
              </span>
            ) : isStale ? (
              <span className="text-[11px] text-amber-400 whitespace-nowrap">
                Veriler eski olabilir, lütfen yenileyin
              </span>
            ) : null}
          </>
        ) : null}

        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex h-10 w-10 transform-gpu items-center justify-center rounded-lg border border-white/5 bg-slate-900/40 text-slate-200 transition-all duration-300 hover:scale-105 hover:bg-slate-800/60 active:scale-95"
          title={isDarkMode ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}
          aria-label={isDarkMode ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button
          type="button"
          onClick={togglePrivacy}
          className={`inline-flex h-10 transform-gpu items-center justify-center gap-2 px-3 border rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-sm ${isPrivacyActive ? 'bg-amber-500/15 border-amber-300/35 text-amber-100 hover:bg-amber-500/25' : 'bg-slate-900/40 border-white/5 text-slate-200 hover:bg-slate-800/60'}`}
          title={isPrivacyActive ? 'Gizlilik modunu kapat' : 'Gizlilik modunu aç'}
        >
          {isPrivacyActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="text-xs font-semibold">{isPrivacyActive ? 'Gizlilik Açık' : 'Gizlilik Kapalı'}</span>
        </button>

        {activePage === 'dashboard' ? (
          <button
            type="button"
            onClick={handleOpenAddChoice}
            className="inline-flex h-10 transform-gpu items-center justify-center gap-2 rounded-lg border border-fuchsia-300/35 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25 px-3 text-slate-50 transition-all duration-300 hover:scale-105 hover:from-violet-500/35 hover:to-fuchsia-500/35 active:scale-95"
            title="Ekle"
            aria-label="Ekle"
          >
            <Plus size={18} />
            <span className="text-sm font-medium">+ Ekle</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={onToggleAlerts}
          className="relative inline-flex h-10 w-10 transform-gpu items-center justify-center rounded-xl border border-white/5 bg-slate-900/40 text-slate-200 transition-all duration-200 hover:scale-105 hover:bg-slate-800/60 active:scale-95"
          title="Uyarılar"
          aria-label="Uyarı panelini aç"
        >
          <Bell className="h-5 w-5" />
          {hasActiveAlerts ? (
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
          ) : null}
          {alertCount > 0 ? (
            <span className="absolute -right-1 -top-1 rounded-full border border-rose-200/40 bg-rose-500 px-1 text-[10px] font-bold text-white leading-4 min-w-[1rem] text-center">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          ) : null}
        </button>
      </div>

      {isAddChoiceOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={handleCloseAddChoice}
            aria-label="Ekle seçim modalını kapat"
          />

          <div className="relative z-50 w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-[0_24px_70px_rgba(2,6,23,0.72)] backdrop-blur-xl">
            <h3 className="text-sm font-bold text-slate-100">Ekleme Yöntemi Seç</h3>
            <p className="mt-1 text-xs text-slate-400">Varlık eklemek için bir yöntem seçin.</p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={handleOpenManualAdd}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-fuchsia-300/35 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/25 px-3 py-2 text-sm font-semibold text-slate-50 transition-colors hover:from-violet-500/35 hover:to-fuchsia-500/35"
              >
                <Plus size={18} />
                Varlık Ekle
              </button>

              <button
                type="button"
                onClick={handleOpenQuickAdd}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-300/35 bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/30"
              >
                <Plus size={18} />
                Hızlı Ekle
              </button>
            </div>

            <button
              type="button"
              onClick={handleCloseAddChoice}
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800/70"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}