import React from 'react';
import PropTypes from 'prop-types';
import { CheckCircle2, Lock, ShieldOff } from 'lucide-react';
import { TRUST_BADGES } from '../../constants/trustContent';

const ICON_MAP = {
  lock: Lock,
  'shield-off': ShieldOff,
  'check-circle': CheckCircle2,
};

export default function TrustBadges({ compact, className }) {
  const wrapperClassName = compact
    ? 'grid grid-cols-1 gap-2 md:grid-cols-3'
    : 'grid grid-cols-1 gap-3 md:grid-cols-3';

  return (
    <div className={`${wrapperClassName} ${className}`.trim()}>
      {TRUST_BADGES.map((badge) => {
        const Icon = ICON_MAP[badge.icon] || CheckCircle2;

        return (
          <article
            key={badge.id}
            className={compact ? 'rounded-xl border border-slate-800 bg-slate-900/50 p-3 transition-colors hover:bg-slate-800/50' : 'rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:bg-slate-800/50'}
          >
            <p className={compact ? 'flex items-center gap-2 text-xs font-bold text-slate-200' : 'flex items-center gap-2 text-sm font-bold text-slate-200'}>
              <Icon className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} ${badge.iconClassName || 'text-blue-500'}`} />
              {badge.title}
            </p>
            <p className={compact ? 'mt-1.5 text-[10px] sm:text-[11px] text-slate-400 leading-snug' : 'mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed'}>{badge.description}</p>
          </article>
        );
      })}
    </div>
  );
}

TrustBadges.propTypes = {
  compact: PropTypes.bool,
  className: PropTypes.string,
};

TrustBadges.defaultProps = {
  compact: false,
  className: '',
};
