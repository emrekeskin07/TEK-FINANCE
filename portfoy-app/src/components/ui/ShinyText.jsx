import React, { memo } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';

function ShinyTextComponent({ children, className = '' }) {
  const controls = useAnimationControls();
  const prefersReducedMotion = useReducedMotion();

  const handleHover = async () => {
    if (prefersReducedMotion) {
      return;
    }

    await controls.start({
      x: ['-140%', '170%'],
      opacity: [0, 0.9, 0],
      transition: {
        duration: 0.85,
        ease: [0.16, 1, 0.3, 1],
      },
    });
  };

  return (
    <span className={`relative inline-block ${className}`} onMouseEnter={handleHover}>
      <span className="relative z-10">{children}</span>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent mix-blend-screen"
        initial={{ x: '-140%', opacity: 0 }}
        animate={controls}
      />
    </span>
  );
}

const ShinyText = memo(ShinyTextComponent);

export default ShinyText;
