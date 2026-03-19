import React from 'react';
import PropTypes from 'prop-types';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Landmark, LineChart, Menu, Target, X } from 'lucide-react';

const MENU_ITEMS = [
  { key: 'dashboard', label: 'Ana Sayfa (Dashboard)', icon: Home },
  { key: 'net-worth', label: 'Net Servetim (Mal Varlığı)', icon: Landmark },
  { key: 'enflasyon', label: 'Enflasyon Analizi', icon: LineChart },
  { key: 'hedeflerim', label: 'Hedeflerim', icon: Target },
];

export default function SidebarMenu({ isOpen, activePage, onClose, onNavigate }) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.button
            type="button"
            aria-label="Sidebar kapat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-black/45 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: -320, opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0.9 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-0 top-0 z-[95] h-full w-[290px] border-r border-white/10 bg-card/90 p-5 shadow-[0_28px_90px_rgba(15,23,42,0.6)] backdrop-blur-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0 rounded-xl border border-white/10 bg-page/70 p-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 overflow-hidden rounded-lg border border-primary/40 bg-primary/20">
                    <img src="/pwa-192x192.png" alt="TEK Finans" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black tracking-tight text-text-main">TEK Finans</p>
                    <p className="truncate text-[11px] text-text-muted">Emre &amp; [Yengemizin Adı]</p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-gray-300">Hoş geldiniz, finansal kontrol sizde.</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-text-main transition-all duration-200 hover:scale-105 hover:bg-white/10 active:scale-95"
                aria-label="Sidebar kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-page/70 px-3 py-2">
              <Menu className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-tight text-gray-300">Navigasyon</span>
            </div>

            <nav className="space-y-2">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onNavigate(item.key)}
                    className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.99] ${
                      isActive
                        ? 'border-secondary/45 bg-secondary/20 text-text-main shadow-[0_0_18px_rgba(139,92,246,0.22)]'
                        : 'border-white/10 bg-white/[0.03] text-text-muted hover:border-primary/35 hover:text-text-main'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

SidebarMenu.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  activePage: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
};
