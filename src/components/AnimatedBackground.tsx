import React from 'react';
import { motion } from 'framer-motion';

const AnimatedBackground: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Minimalist Subtle Blobs - Very low color impact */}
      {/* Soft Diagonal Rays Animation */}
      {[...Array(4)].map((_, i) => (
        <motion.div
           key={i}
           animate={{
             x: ['-100vw', '100vw'],
             opacity: [0, 0.15, 0],
           }}
           transition={{
             duration: 12 + i * 4,
             repeat: Infinity,
             ease: "linear",
             delay: i * 2
           }}
           className={`absolute top-0 bottom-0 w-[60%] skew-x-[-25deg] blur-[100px] pointer-events-none z-0 ${
             isDark ? 'bg-brand-500' : 'bg-brand-400'
           }`}
           style={{
             left: (i * 20) + '%'
           }}
        />
      ))}

      {/* Grid Pattern Overlay */}
      <div 
        className={`absolute inset-0 opacity-[0.02] ${isDark ? 'invert' : ''}`}
        style={{
          backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
