import React from 'react';
import PropTypes from 'prop-types';

export default function Input({
  id,
  label,
  className = '',
  inputClassName = '',
  ...props
}) {
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-text-muted">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        className={`w-full rounded-xl border border-slate-300/40 bg-white/80 px-3.5 py-3 text-sm text-slate-800 shadow-sm transition-all duration-200 focus:outline-none focus:border-primary/85 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-slate-900/55 dark:text-slate-100 ${inputClassName}`.trim()}
        {...props}
      />
    </div>
  );
}

Input.propTypes = {
  id: PropTypes.string,
  label: PropTypes.string,
  className: PropTypes.string,
  inputClassName: PropTypes.string,
};
