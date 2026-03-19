import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Eye, EyeOff, LogOut, Menu, Palette, Plus, RefreshCcw } from 'lucide-react';
import { useSyncState } from '../context/SyncContext';
import { usePrivacy } from '../context/PrivacyContext';
import SplitText from './ui/SplitText';

export default function Header({
  activePage,
  onToggleSidebar = () => {},
  activeTheme = 'deep-ocean',
  themeOptions = [],
  onThemeChange,
  baseCurrency,
  setBaseCurrency,
  openAddModal,
  loading,
  syncFailed,
  onRefresh,
  user,
  onSignOut,
  onToggleAlerts,
  hasActiveAlerts = false,
  alertCount = 0,
}) {
  const { isPrivacyActive, togglePrivacy } = usePrivacy();
  const { lastSyncTime } = useSyncState();
  const [now, setNow] = useState(Date.now());

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
  const profileName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')?.[0]
    || 'Kullanıcı';
  const profileAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  return (
    <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-4 md:gap-5">
      <div className="flex items-center gap-3 w-full md:w-auto">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-text-main transition-all duration-200 hover:scale-105 hover:bg-white/10 active:scale-95"
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
          <p className="text-sm text-text-muted">Banka & Kurum Bazlı Varlık Takibi</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-3 w-full md:w-auto">
        <button
          type="button"
          onClick={togglePrivacy}
          className={`inline-flex transform-gpu items-center justify-center gap-2 px-3 py-2 border rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-sm w-full md:w-auto ${isPrivacyActive ? 'bg-amber-500/15 border-amber-300/35 text-amber-100 hover:bg-amber-500/25' : 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'}`}
          title={isPrivacyActive ? 'Gizlilik modunu kapat' : 'Gizlilik modunu aç'}
        >
          {isPrivacyActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="text-xs font-semibold">{isPrivacyActive ? 'Gizlilik Açık' : 'Gizlilik Kapalı'}</span>
        </button>

        <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-card/70 px-2 py-1.5 backdrop-blur-md">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-page/70 text-text-main" title="Tema Seçici">
            <Palette className="h-4 w-4" />
          </span>
          <div className="flex items-center gap-1">
            {themeOptions.map((option) => {
              const isActiveTheme = activeTheme === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onThemeChange?.(option.id)}
                  className={`h-6 w-6 rounded-full border transition-all duration-300 hover:scale-110 ${isActiveTheme ? 'border-white ring-2 ring-white/40' : 'border-white/20'}`}
                  title={option.label}
                  aria-label={`${option.label} temasini sec`}
                  style={{ background: option.swatch }}
                />
              );
            })}
          </div>
        </div>

        {activePage === 'dashboard' ? (
          <>
        <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setBaseCurrency('TRY')}
            className={`transform-gpu px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 hover:scale-105 active:scale-95 ${baseCurrency === 'TRY' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/35' : 'text-slate-300 hover:bg-white/10'}`}
            title="Portföyü TL görüntüle"
          >
            TRY
          </button>
          <button
            type="button"
            onClick={() => setBaseCurrency('USD')}
            className={`transform-gpu px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 hover:scale-105 active:scale-95 ${baseCurrency === 'USD' ? 'bg-sky-500/20 text-sky-200 border border-sky-400/35' : 'text-slate-300 hover:bg-white/10'}`}
            title="Portföyü USD görüntüle"
          >
            USD
          </button>
        </div>

        <button 
          onClick={openAddModal}
          className="flex transform-gpu items-center justify-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-sm w-full md:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Varlık Ekle</span>
        </button>

        <div className="flex flex-col items-start md:items-end gap-1 md:gap-1.5 w-full md:w-auto">
          <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={onRefresh} 
            disabled={loading}
            className="flex transform-gpu items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-sm disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : 'text-slate-300'}`} />
            <span className="text-sm hidden sm:inline">{loading ? 'Güncelleniyor...' : 'Yenile'}</span>
          </button>
          </div>
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
        </div>
          </>
        ) : null}

        {user ? (
          <div className="flex items-center justify-between md:justify-start gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={onToggleAlerts}
              className="relative inline-flex h-10 w-10 transform-gpu items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition-all duration-200 hover:scale-105 hover:bg-white/10 active:scale-95"
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

            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 backdrop-blur-sm">
            {profileAvatar ? (
              <img
                src={profileAvatar}
                alt={`${profileName} avatar`}
                className="w-8 h-8 rounded-full object-cover border border-white/20"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-500/25 border border-blue-400/35 flex items-center justify-center text-xs font-bold text-blue-200">
                {String(profileName).trim().charAt(0).toUpperCase() || 'U'}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-100 truncate max-w-[9rem]">
                <SplitText key={profileName} text={profileName} by="chars" stagger={0.02} />
              </p>
              <p className="text-[11px] text-slate-400 truncate max-w-[9rem]">{user.email}</p>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex transform-gpu items-center gap-1 rounded-md border border-white/10 bg-black/25 px-2 py-1 text-[11px] text-slate-200 transition-all duration-200 hover:scale-105 hover:bg-black/40 active:scale-95"
              title="Çıkış yap"
            >
              <LogOut className="w-3.5 h-3.5" />
              Çıkış
            </button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}