import React from 'react';
import PropTypes from 'prop-types';

export default function Card({ className = '', children }) {
  return (
    <div className={`rounded-xl border border-slate-200/70 bg-white/85 p-4 shadow-[0_8px_22px_rgba(124,58,237,0.1)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 dark:border-white/10 dark:bg-slate-900/45 dark:shadow-[0_18px_50px_rgba(2,6,23,0.55)] md:p-6 ${className}`.trim()}>
      {children}
    </div>
  );
}

Card.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};
