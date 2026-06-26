'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-[#0D0F14] overflow-hidden">
      {/* Dot Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: 'radial-gradient(circle, #1E2230 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Orb 1: Blue/Indigo */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full bg-[#6366F1] opacity-4 blur-[120px] top-[-200px] left-[-100px]"
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -60, 40, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Orb 2: Green */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full bg-[#22C55E] opacity-3 blur-[100px] bottom-[-100px] right-[100px]"
        animate={{
          x: [0, -60, 30, 0],
          y: [0, 80, -30, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
