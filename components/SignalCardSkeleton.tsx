'use client';

import React from 'react';
import { motion } from 'framer-motion';

const shimmer = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
  },
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: "linear",
  },
};

function SkeletonBar({ 
  width, 
  height = 8,
  className = ""
}: { 
  width: string;
  height?: number;
  className?: string; 
}) {
  return (
    <motion.div
      animate={shimmer.animate}
      transition={shimmer.transition}
      className={className}
      style={{
        width,
        height,
        borderRadius: 3,
        background: 
          "linear-gradient(90deg, #1C1F28 25%, #252830 50%, #1C1F28 75%)",
        backgroundSize: "200% 100%",
      }}
    />
  );
}

export function SignalCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      style={{
        background: "#111318",
        border: "1px solid #1E2230",
        borderLeft: "3px solid #1E2230",
        borderRadius: 6,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Row 1: ticker + confidence */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <SkeletonBar width="120px" height={14} />
        <SkeletonBar width="64px" height={12} />
      </div>

      {/* Row 2: confidence bar */}
      <SkeletonBar width="100%" height={2} />

      {/* Row 3: entry/sl/target grid */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 8
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <SkeletonBar width="36px" height={8} />
          <SkeletonBar width="56px" height={12} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <SkeletonBar width="48px" height={8} />
          <SkeletonBar width="56px" height={12} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <SkeletonBar width="40px" height={8} />
          <SkeletonBar width="56px" height={12} />
        </div>
      </div>

      {/* Row 4: market tag + timestamp */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <SkeletonBar width="36px" height={18} />
        <SkeletonBar width="56px" height={10} />
      </div>
    </motion.div>
  );
}
