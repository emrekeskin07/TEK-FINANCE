import { useEffect, useState } from 'react';
import { animate, useSpring, useTransform } from 'framer-motion';

export function useAnimatedCounter(targetValue) {
  const springValue = useSpring(0, {
    stiffness: 210,
    damping: 26,
    mass: 0.9,
  });
  const transformedValue = useTransform(springValue, (latest) => Number(latest.toFixed(2)));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(springValue, Number(targetValue) || 0, {
      duration: 0.75,
      ease: 'easeOut',
    });

    return () => controls.stop();
  }, [springValue, targetValue]);

  useEffect(() => {
    const unsubscribe = transformedValue.on('change', (latest) => {
      setDisplayValue(latest);
    });

    setDisplayValue(transformedValue.get());
    return () => unsubscribe();
  }, [transformedValue]);

  return displayValue;
}
