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
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-400">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        className={`w-full rounded-lg border border-white/10 bg-black/20 p-3 text-slate-200 transition-colors focus:outline-none focus:border-blue-500 ${inputClassName}`.trim()}
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
