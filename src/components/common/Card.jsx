import React from 'react';
import PropTypes from 'prop-types';

export default function Card({ className = '', children }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-card/80 p-6 backdrop-blur-md shadow-[0_18px_50px_rgba(15,23,42,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-primary/40 md:p-8 ${className}`.trim()}>
      {children}
    </div>
  );
}

Card.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};
