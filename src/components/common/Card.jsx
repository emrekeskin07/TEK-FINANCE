import React from 'react';
import PropTypes from 'prop-types';

export default function Card({ className = '', children }) {
  return (
    <div className={`rounded-2xl border border-white/15 bg-card/80 p-6 backdrop-blur-md shadow-[0_20px_60px_rgba(7,10,16,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-primary/45 md:p-8 ${className}`.trim()}>
      {children}
    </div>
  );
}

Card.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};
