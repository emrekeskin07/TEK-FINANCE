import React from 'react';
import PropTypes from 'prop-types';

export default function Card({ className = '', children }) {
  return (
    <div className={`rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-white/15 md:p-8 ${className}`.trim()}>
      {children}
    </div>
  );
}

Card.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};
