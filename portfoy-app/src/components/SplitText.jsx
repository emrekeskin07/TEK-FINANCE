import React from 'react';
import { motion } from 'framer-motion';

export default function SplitText({
  text = '',
  className = '',
  by = 'chars',
  delay = 0,
  stagger = 0.04,
}) {
  const content = String(text || '');
  const segments = by === 'words' ? content.split(' ') : Array.from(content);

  return (
    <span className={className} aria-label={content}>
      {segments.map((segment, index) => {
        const key = `${segment}-${index}`;
        const output = by === 'words' && index < segments.length - 1
          ? `${segment}\u00A0`
          : segment;

        return (
          <motion.span
            key={key}
            className="inline-block whitespace-pre"
            initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              duration: 0.45,
              ease: [0.22, 1, 0.36, 1],
              delay: delay + (index * stagger),
            }}
          >
            {output}
          </motion.span>
        );
      })}
    </span>
  );
}
