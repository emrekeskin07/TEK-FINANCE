import React from 'react';
import PropTypes from 'prop-types';

const VARIANT_CLASS = {
  primary: 'border-sky-300/30 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25',
  emerald: 'border-emerald-300/35 bg-emerald-500 text-emerald-50 hover:bg-emerald-400',
  rose: 'border-rose-300/35 bg-rose-500 text-rose-50 hover:bg-rose-400',
  ghost: 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10',
};

export default function Button({
  type = 'button',
  variant = 'primary',
  className = '',
  children,
  ...props
}) {
  const variantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.primary;

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-all duration-200 ${variantClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

Button.propTypes = {
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf(['primary', 'emerald', 'rose', 'ghost']),
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};
