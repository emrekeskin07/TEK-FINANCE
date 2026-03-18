import React, { useState } from 'react';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';

const OFFSCREEN_POS = -999;

export default function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(56, 189, 248, 0.22)',
}) {
  const [isHovering, setIsHovering] = useState(false);

  const mouseX = useMotionValue(OFFSCREEN_POS);
  const mouseY = useMotionValue(OFFSCREEN_POS);

  const smoothX = useSpring(mouseX, { stiffness: 260, damping: 24, mass: 0.35 });
  const smoothY = useSpring(mouseY, { stiffness: 260, damping: 24, mass: 0.35 });

  const spotlight = useMotionTemplate`radial-gradient(280px circle at ${smoothX}px ${smoothY}px, ${spotlightColor}, transparent 65%)`;

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set(event.clientX - rect.left);
    mouseY.set(event.clientY - rect.top);
  };

  const hideSpotlight = () => {
    setIsHovering(false);
    mouseX.set(OFFSCREEN_POS);
    mouseY.set(OFFSCREEN_POS);
  };

  return (
    <motion.div
      className={`group relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={hideSpotlight}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 240, damping: 24 }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ backgroundImage: spotlight }}
        animate={{ opacity: isHovering ? 1 : 0 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      />

      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit] border border-sky-200/0"
        animate={{ borderColor: isHovering ? 'rgba(125, 211, 252, 0.35)' : 'rgba(125, 211, 252, 0)' }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      />

      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}
