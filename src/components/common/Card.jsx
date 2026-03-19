import React from 'react';
import PropTypes from 'prop-types';

export default function Card({ className = '', children }) {
  return (
    <div className={`rounded-2xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-xl shadow-[0_20px_60px_rgba(2,6,23,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-fuchsia-400/35 md:p-8 ${className}`.trim()}>
      {children}
    </div>
  );
}

Card.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};
