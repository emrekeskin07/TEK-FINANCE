import React, { useEffect, useRef, useState } from 'react';

export default function InfoTooltip({ content, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleDocumentPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
        setIsPinned(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsPinned(false);
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleMouseEnter = () => {
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      setIsOpen(false);
    }
  };

  const handleToggle = () => {
    if (isPinned) {
      setIsPinned(false);
      setIsOpen(false);
      return;
    }

    setIsPinned(true);
    setIsOpen(true);
  };

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex items-center gap-1 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[11px] text-slate-400 cursor-help transition-colors hover:text-slate-200"
        aria-label="Bilgi"
      >
        ⓘ
      </button>

      {isOpen ? (
        <span
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-64 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-[11px] font-medium leading-relaxed text-slate-100 shadow-[0_14px_30px_rgba(2,6,23,0.45)]"
          role="tooltip"
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}