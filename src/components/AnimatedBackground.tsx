import React from 'react';
import { motion } from 'framer-motion';

const AnimatedBackground: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Dynamic Blobs */}
      <motion.div
        animate={{
          x: [0, 80, 0],
          y: [0, 40, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className={`absolute -top-24 -left-24 w-80 h-80 rounded-full blur-[100px] opacity-15 ${
          isDark ? 'bg-brand-500' : 'bg-brand-300'
        }`}
      />
      
      <motion.div
        animate={{
          x: [0, -80, 0],
          y: [0, 80, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        className={`absolute top-1/2 -right-24 w-[400px] h-[400px] rounded-full blur-[120px] opacity-10 ${
          isDark ? 'bg-brand-600' : 'bg-brand-400'
        }`}
      />

      <motion.div
        animate={{
          x: [0, 40, 0],
          y: [0, -60, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear"
        }}
        className={`absolute bottom-0 left-1/4 w-60 h-60 rounded-full blur-[80px] opacity-10 ${
          isDark ? 'bg-brand-500' : 'bg-brand-200'
        }`}
      />

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
