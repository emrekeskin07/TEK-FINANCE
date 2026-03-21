import React from 'react';
import PropTypes from 'prop-types';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Home,
  LineChart,
  LogOut,
  Settings,
  TableProperties,
  WalletCards,
} from 'lucide-react';

const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: Home },
  { key: 'portfolio', label: 'Portföyüm', icon: WalletCards },
  { key: 'operations', label: 'İşlemler', icon: TableProperties },
  { key: 'analysis', label: 'Analiz', icon: LineChart },
  { key: 'ai-assistant', label: 'AI Asistan', icon: Bot },
  { key: 'ayarlar', label: 'Ayarlar', icon: Settings },
];

function SidebarContent({ activePage, isCollapsed, onNavigate, onToggleCollapse, user, onSignOut }) {
  const profileName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')?.[0]
    || 'Kullanıcı';

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-white/10 pb-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-9 w-9 overflow-hidden rounded-lg border border-primary/40 bg-primary/20">
            <img src="/pwa-192x192.png" alt="TEK Finans" className="h-full w-full object-cover" />
          </div>
          {!isCollapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-100">TEK Finans</p>
              <p className="truncate text-[11px] text-slate-400">{profileName}</p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-900/60 text-slate-200 transition-colors hover:bg-slate-800"
          aria-label={isCollapsed ? 'Sidebar genişlet' : 'Sidebar daralt'}
          title={isCollapsed ? 'Genişlet' : 'Daralt'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="space-y-1.5">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className={`group relative flex w-full items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200'
                  : 'text-slate-300 hover:bg-white/5 hover:text-slate-100'
              }`}
              title={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive ? <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-purple-500" aria-hidden="true" /> : null}
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed ? <span className="truncate">{item.label}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={onSignOut}
          className={`inline-flex min-h-[40px] w-full items-center ${isCollapsed ? 'justify-center px-0' : 'justify-center gap-2 px-3'} rounded-lg border border-rose-300/30 bg-rose-500/12 py-2 text-xs font-semibold text-rose-100 transition-colors hover:bg-rose-500/20`}
          title="Çıkış Yap"
        >
          <LogOut className="h-3.5 w-3.5" />
          {!isCollapsed ? 'Çıkış Yap' : null}
        </button>
      </div>
    </>
  );
}

export default function SidebarMenu({
  activePage,
  isCollapsed,
  isMobileOpen,
  onToggleCollapse,
  onNavigate,
  onCloseMobile,
  user,
  onSignOut,
}) {
  return (
    <>
      <aside className={`fixed left-0 top-0 z-40 hidden h-screen border-r border-white/10 bg-slate-950/90 p-4 shadow-[0_20px_60px_rgba(2,6,23,0.65)] backdrop-blur-xl lg:flex lg:flex-col ${isCollapsed ? 'w-[86px]' : 'w-[272px]'}`}>
        <SidebarContent
          activePage={activePage}
          isCollapsed={isCollapsed}
          onNavigate={onNavigate}
          onToggleCollapse={onToggleCollapse}
          user={user}
          onSignOut={onSignOut}
        />
      </aside>

      <AnimatePresence>
        {isMobileOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Sidebar kapat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-black/50 lg:hidden"
              onClick={onCloseMobile}
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-0 top-0 z-[95] flex h-screen w-[286px] flex-col border-r border-white/10 bg-slate-950/95 p-4 shadow-[0_28px_90px_rgba(2,6,23,0.72)] backdrop-blur-2xl lg:hidden"
            >
              <SidebarContent
                activePage={activePage}
                isCollapsed={false}
                onNavigate={(page) => {
                  onNavigate(page);
                  onCloseMobile();
                }}
                onToggleCollapse={onCloseMobile}
                user={user}
                onSignOut={onSignOut}
              />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

SidebarMenu.propTypes = {
  activePage: PropTypes.string.isRequired,
  isCollapsed: PropTypes.bool,
  isMobileOpen: PropTypes.bool,
  onToggleCollapse: PropTypes.func,
  onNavigate: PropTypes.func.isRequired,
  onCloseMobile: PropTypes.func,
  user: PropTypes.object,
  onSignOut: PropTypes.func,
};

SidebarMenu.defaultProps = {
  isCollapsed: false,
  isMobileOpen: false,
  onToggleCollapse: () => {},
  onCloseMobile: () => {},
  user: null,
  onSignOut: () => {},
};
