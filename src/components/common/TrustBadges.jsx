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
            className={compact ? 'rounded-lg border border-white/15 bg-black/25 p-2.5' : 'rounded-xl border border-white/10 bg-slate-900/45 p-3'}
          >
            <p className={compact ? 'inline-flex items-center gap-1 text-[11px] font-semibold text-slate-200' : 'inline-flex items-center gap-2 text-sm font-semibold text-slate-100'}>
              <Icon className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${badge.iconClassName}`} />
              {badge.title}
            </p>
            <p className={compact ? 'mt-1 text-[10px] text-slate-400' : 'mt-1 text-xs text-slate-400'}>{badge.description}</p>
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
