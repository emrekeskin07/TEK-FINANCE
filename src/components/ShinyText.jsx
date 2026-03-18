import React from 'react';
import { motion, useAnimation } from 'framer-motion';

export default function ShinyText({
  children,
  className = '',
}) {
  const controls = useAnimation();

  const triggerShine = () => {
    controls.start({
      x: ['-130%', '150%'],
      opacity: [0, 0.85, 0],
      transition: {
        duration: 0.85,
        ease: 'easeOut',
      },
    });
  };

  return (
    <span
      className={`group relative inline-block ${className}`}
      onMouseEnter={triggerShine}
    >
      <span className="relative z-10">{children}</span>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent mix-blend-screen"
        initial={{ x: '-130%', opacity: 0 }}
        animate={controls}
      />
    </span>
  );
}
