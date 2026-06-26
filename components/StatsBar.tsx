'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface StatsBarProps {
  activeCount: number;
  buyCount: number;
  sellCount: number;
  holdCount: number;
  avgConfidence: number;
}

export function StatsBar({
  activeCount,
  buyCount,
  sellCount,
  holdCount,
  avgConfidence,
}: StatsBarProps) {
  const stats = [
    { label: "Active", value: `${activeCount}`, color: "#E2E8F0" },
    { label: "BUY", value: `${buyCount}`, color: "#22C55E" },
    { label: "SELL", value: `${sellCount}`, color: "#EF4444" },
    { label: "HOLD", value: `${holdCount}`, color: "#F59E0B" },
    { label: "Avg confidence", value: `${avgConfidence}%`, color: "#6366F1" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-6 py-3 border-b border-[#1E2230]/30 select-none">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.3, ease: 'easeOut' }}
          className="flex items-center gap-2"
        >
          <span className="text-[#374151] text-[12px] font-sans font-medium uppercase tracking-wider">
            {stat.label}
          </span>
          <motion.span
            className="font-mono text-[13px] font-semibold"
            style={{ color: stat.color }}
            key={`${stat.label}-${stat.value}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {stat.value}
          </motion.span>
        </motion.div>
      ))}
    </div>
  );
}

export default StatsBar;
