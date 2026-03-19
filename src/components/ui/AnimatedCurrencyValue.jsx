import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import CountUp from 'react-countup';
import { usePrivacy } from '../../context/PrivacyContext';
import { formatCurrency } from '../../utils/helpers';

const easeOutCubic = (time, begin, change, duration) => {
  const progress = (time / duration) - 1;
  return (change * ((progress * progress * progress) + 1)) + begin;
};

export default function AnimatedCurrencyValue({
  value,
  baseCurrency = 'TRY',
  rates,
  className = '',
  showPositiveSign = false,
}) {
  const { isPrivacyActive, maskValue } = usePrivacy();
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;

  const formatAnimatedCurrency = useCallback((rawValue) => {
    const formatted = formatCurrency(rawValue, baseCurrency, rates);
    if (showPositiveSign && rawValue > 0) {
      return `+${formatted}`;
    }

    return formatted;
  }, [baseCurrency, rates, showPositiveSign]);

  const finalText = formatAnimatedCurrency(safeValue);

  if (isPrivacyActive) {
    return <span className={className}>{maskValue(finalText)}</span>;
  }

  return (
    <CountUp
      key={`${baseCurrency}-${safeValue}-${showPositiveSign ? 'plus' : 'normal'}`}
      className={className}
      start={0}
      end={safeValue}
      duration={2.5}
      separator="."
      decimal="," 
      useEasing
      easingFn={easeOutCubic}
      formattingFn={formatAnimatedCurrency}
    />
  );
}

AnimatedCurrencyValue.propTypes = {
  value: PropTypes.number,
  baseCurrency: PropTypes.string,
  rates: PropTypes.object,
  className: PropTypes.string,
  showPositiveSign: PropTypes.bool,
};
