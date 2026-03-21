import React from 'react';
import AiCommandBar from './AiCommandBar';

export default function MagicCommandBar({
  isSidebarCollapsed,
  isVisible,
  aiCommandBarRef,
  onExecute,
  onQuickAddAsset,
  setIsVisible,
}) {
  return (
    <div className={`mb-4 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-[86px]' : 'lg:ml-[272px]'}`}>
      {isVisible ? (
        <AiCommandBar
          ref={aiCommandBarRef}
          onExecute={onExecute}
          onQuickAddAsset={onQuickAddAsset}
          onDismiss={() => setIsVisible(false)}
          autoFocusOnMount
        />
      ) : (
        <div className="mx-auto w-full max-w-[960px] px-3 sm:px-4 md:px-8">
          <button
            type="button"
            onClick={() => {
              setIsVisible(true);
              window.setTimeout(() => {
                aiCommandBarRef.current?.focus?.();
              }, 60);
            }}
            className="rounded-2xl border border-slate-300 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-xl transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Komut Satirini Ac (Ctrl+K)
          </button>
        </div>
      )}
    </div>
  );
}
