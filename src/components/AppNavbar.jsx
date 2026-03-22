import React from 'react';
import { Settings, LogOut, ChevronDown, Eye, EyeOff } from 'lucide-react';
import SplitText from './ui/SplitText';
import AiCommandBar from './AiCommandBar';

export default function AppNavbar({
  isSidebarCollapsed,
  user,
  onSignOut,
  onOpenSettings,
  isPrivacyActive,
  onTogglePrivacy,
  aiCommandBarRef,
  onExecuteAiCommand,
  onQuickAddAsset,
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

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

  return (
    <div className="sticky top-0 z-40 bg-slate-900/60 backdrop-blur-3xl border-b border-white/5 transition-all duration-300">
      <header className="flex h-16 sm:h-20 w-full items-center justify-between px-4 md:px-8 gap-4">
        <div className="flex shrink-0 items-center gap-3">
          <div className="h-9 w-9 overflow-hidden rounded-xl border border-primary/35 bg-primary/20 shadow-lg">
            <img src="/pwa-192x192.png" alt="TEK Finans logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="hidden sm:block truncate text-xl font-extrabold bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent drop-shadow-sm">
            <SplitText text="TEK Finans" by="chars" stagger={0.025} />
          </h1>
        </div>

        <div className="flex-1 max-w-2xl mx-auto">
          <AiCommandBar
            ref={aiCommandBarRef}
            onExecute={onExecuteAiCommand}
            onQuickAddAsset={onQuickAddAsset}
            onDismiss={() => {}}
            autoFocusOnMount={false}
          />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={onTogglePrivacy}
            aria-pressed={isPrivacyActive}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 shadow-sm ${
              isPrivacyActive
                ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {isPrivacyActive ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </button>

          <div className="relative" onBlur={() => window.setTimeout(() => setIsUserMenuOpen(false), 120)}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 pl-1.5 pr-3 text-xs font-bold text-slate-200 transition-colors hover:bg-white/10 shadow-sm"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-inner">{profileInitials}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>

            {isUserMenuOpen ? (
              <div className="absolute right-0 top-12 mt-1 w-64 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl">
                <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3 mb-2">
                  <p className="truncate text-sm font-bold text-white">{profileName}</p>
                  <p className="truncate text-xs text-slate-400 mt-0.5">{profileEmail}</p>
                </div>

                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => { setIsUserMenuOpen(false); onOpenSettings(); }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
                >
                  <Settings className="h-4 w-4 text-sky-400" />
                  Ayarlar
                </button>

                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => { setIsUserMenuOpen(false); onSignOut(); }}
                  className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/15"
                >
                  <LogOut className="h-4 w-4 text-rose-400" />
                  Çıkış Yap
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
    </div>
  );
}
