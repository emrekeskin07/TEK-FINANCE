import React, { useState } from 'react';
import { Menu, Search, Settings, LogOut, ChevronDown, Eye, EyeOff } from 'lucide-react';
import SplitText from './ui/SplitText';

export default function Header({
  onToggleSidebar = () => {},
  user,
  onSignOut = () => {},
  onOpenSettings = () => {},
  onSearchNavigate = () => {},
  isPrivacyActive = false,
  onTogglePrivacy = () => {},
}) {
  const [query, setQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const profileName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')?.[0]
    || 'Kullanıcı';
  const profileEmail = user?.email || 'mail bilgisi yok';
  const profileInitials = String(profileName)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => String(part).charAt(0).toUpperCase())
    .join('') || 'U';

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearchNavigate(query);
  };

  return (
    <header className="mx-auto mb-6 flex max-w-[1400px] items-center gap-3 lg:mb-8">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900/45 text-slate-50 transition-colors hover:bg-slate-800/70 lg:hidden"
        aria-label="Sidebar aç"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-slate-900/45 px-3 py-2 backdrop-blur-xl">
        <div className="h-8 w-8 overflow-hidden rounded-lg border border-primary/35 bg-primary/20">
          <img src="/pwa-192x192.png" alt="TEK Finans logo" className="h-full w-full object-cover" />
        </div>
        <h1 className="truncate text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          <SplitText text="TEK Finans" by="chars" stagger={0.025} />
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="ml-auto flex min-w-0 flex-1 items-center rounded-xl border border-white/10 bg-slate-900/45 px-3 py-2 backdrop-blur-xl lg:max-w-xl">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Sayfa ara: Dashboard, Portföyüm, Analiz, AI Asistan..."
          className="ml-2 w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
          aria-label="Sayfa arama"
        />
      </form>

      <button
        type="button"
        onClick={onTogglePrivacy}
        aria-pressed={isPrivacyActive}
        aria-label={isPrivacyActive ? 'Gizlilik modunu kapat' : 'Gizlilik modunu aç'}
        data-title="Hide your balances in public spaces"
        className={`topbar-tooltip inline-flex h-10 w-10 items-center justify-center rounded-xl border text-slate-100 backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 ${
          isPrivacyActive
            ? 'border-emerald-300/40 bg-emerald-500/20 hover:bg-emerald-500/30'
            : 'border-white/10 bg-slate-900/45 hover:bg-slate-800/70'
        }`}
      >
        {isPrivacyActive ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
      </button>

      <div className="relative" onBlur={() => window.setTimeout(() => setIsUserMenuOpen(false), 120)}>
        <button
          type="button"
          onClick={() => setIsUserMenuOpen((prev) => !prev)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-slate-900/45 px-2.5 text-xs font-bold text-slate-100 transition-colors hover:bg-slate-800/65"
          aria-haspopup="menu"
          aria-expanded={isUserMenuOpen}
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-purple-500/30 text-[11px]">{profileInitials}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-300" />
        </button>

        {isUserMenuOpen ? (
          <div className="absolute right-0 mt-1 w-64 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-xl" role="menu">
            <div className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2">
              <p className="truncate text-sm font-semibold text-slate-100">{profileName}</p>
              <p className="truncate text-xs text-slate-400">{profileEmail}</p>
            </div>

            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setIsUserMenuOpen(false);
                onOpenSettings();
              }}
              className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/10"
              role="menuitem"
            >
              <Settings className="h-4 w-4 text-sky-300" />
              Ayarlar
            </button>

            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setIsUserMenuOpen(false);
                onSignOut();
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/20"
              role="menuitem"
            >
              <LogOut className="h-4 w-4 text-rose-300" />
              Çıkış Yap
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
