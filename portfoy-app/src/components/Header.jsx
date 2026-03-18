import React, { useEffect, useMemo, useState } from 'react';
import { Bell, LogOut, Plus, RefreshCcw } from 'lucide-react';
import { useSyncState } from '../context/SyncContext';
import SplitText from './ui/SplitText';

export default function Header({
  activePage,
  setActivePage,
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
        <div className="bg-blue-500/20 p-0 w-8 h-8 rounded-lg border border-blue-500/30 backdrop-blur-md overflow-hidden">
          <img
            src="/pwa-192x192.png"
            alt="TEK Finans logo"
            className="object-cover w-full h-full rounded-lg"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            <SplitText text="TEK Finans" by="chars" stagger={0.045} />
          </h1>
          <p className="text-sm text-slate-400">Banka & Kurum Bazlı Varlık Takibi</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-3 w-full md:w-auto">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1 backdrop-blur-sm w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActivePage('dashboard')}
            className={`px-3 py-1.5 text-sm rounded-md transition-all duration-300 ${activePage === 'dashboard' ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' : 'text-slate-300 hover:bg-white/10'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActivePage('malvarligi')}
            className={`px-3 py-1.5 text-sm rounded-md transition-all duration-300 ${activePage === 'malvarligi' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' : 'text-slate-300 hover:bg-white/10'}`}
          >
            Mal Varlığı
          </button>
          <button
            onClick={() => setActivePage('enflasyon')}
            className={`px-3 py-1.5 text-sm rounded-md transition-all duration-300 ${activePage === 'enflasyon' ? 'bg-rose-600/25 text-rose-200 border border-rose-400/40' : 'text-slate-300 hover:bg-white/10'}`}
          >
            Enflasyon Analizi
          </button>
        </div>

        {activePage === 'dashboard' ? (
          <>
        <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setBaseCurrency('TRY')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${baseCurrency === 'TRY' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/35' : 'text-slate-300 hover:bg-white/10'}`}
            title="Portföyü TL görüntüle"
          >
            TRY
          </button>
          <button
            type="button"
            onClick={() => setBaseCurrency('USD')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${baseCurrency === 'USD' ? 'bg-sky-500/20 text-sky-200 border border-sky-400/35' : 'text-slate-300 hover:bg-white/10'}`}
            title="Portföyü USD görüntüle"
          >
            USD
          </button>
        </div>

        <button 
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-lg transition-all duration-300 backdrop-blur-sm w-full md:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Varlık Ekle</span>
        </button>

        <div className="flex flex-col items-start md:items-end gap-1 md:gap-1.5 w-full md:w-auto">
          <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={onRefresh} 
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all duration-300 backdrop-blur-sm disabled:opacity-50"
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
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition-colors hover:bg-white/10"
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
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/25 px-2 py-1 text-[11px] text-slate-200 hover:bg-black/40 transition-colors"
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