import React, { memo, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

function SplitTextComponent({
  text = '',
  className = '',
  by = 'chars',
  delay = 0,
  stagger = 0.035,
}) {
  const prefersReducedMotion = useReducedMotion();
  const content = String(text || '');

  const segments = useMemo(() => {
    if (by === 'words') {
      return content.split(' ').map((word, index, list) => (
        index < list.length - 1 ? `${word}\u00A0` : word
      ));
    }

    return Array.from(content);
  }, [content, by]);

  if (!content) {
    return null;
  }

  return (
    <span className={className} aria-label={content}>
      {segments.map((segment, index) => (
        <motion.span
          key={`${segment}-${index}`}
          className="inline-block whitespace-pre"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12, filter: 'blur(4px)' }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.42,
            ease: [0.22, 1, 0.36, 1],
            delay: prefersReducedMotion ? 0 : delay + (index * stagger),
          }}
        >
          {segment}
        </motion.span>
      ))}
    </span>
  );
}

const SplitText = memo(SplitTextComponent);

export default SplitText;
