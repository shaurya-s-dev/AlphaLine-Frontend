'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export interface SignalCardProps {
  ticker: string;
  market: string;
  signalType: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  entry: number;
  stopLoss: number;
  target: number;
  timestamp: string;
  isBlurred?: boolean;
  index?: number;
  onClick?: () => void;
}

export function SignalCard({
  ticker,
  market,
  signalType,
  confidence,
  entry,
  stopLoss,
  target,
  timestamp,
  isBlurred = false,
  index = 0,
  onClick,
}: SignalCardProps) {
  // Parse relative timestamp to seconds
  const parseTimestampToSeconds = (ts: string): number => {
    if (!ts) return 0;
    if (ts.toLowerCase() === 'just now') return 0;
    
    const match = ts.match(/^(\d+)\s*(min|hr|day|s|m|h|d)/i);
    if (!match) return 0;
    
    const val = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    
    if (unit.startsWith('min') || unit === 'm') return val * 60;
    if (unit.startsWith('hr') || unit === 'h') return val * 3600;
    if (unit.startsWith('day') || unit === 'd') return val * 86400;
    return val;
  };

  const [ageSeconds, setAgeSeconds] = useState(parseTimestampToSeconds(timestamp));

  useEffect(() => {
    setAgeSeconds(parseTimestampToSeconds(timestamp));
  }, [timestamp]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAgeSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatAge = (totalSeconds: number): string => {
    if (totalSeconds < 60) {
      return `${totalSeconds}s ago`;
    }
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins < 60) {
      return `${mins}m ${secs}s ago`;
    }
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m ago`;
  };

  const signalColors = {
    BUY: '#22C55E',
    SELL: '#EF4444',
    HOLD: '#F59E0B',
  };

  const signalColor = signalColors[signalType] || signalColors.BUY;

  // Calculate dynamic Risk-Reward Ratio
  const stopDistance = Math.abs(entry - stopLoss);
  const rewardDistance = Math.abs(target - entry);
  const rrRatio = stopDistance > 0 ? rewardDistance / stopDistance : 2.1;

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.3, 
        ease: [0.23, 1, 0.32, 1] 
      } 
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="show"
      whileHover={isBlurred ? {} : { y: -2, transition: { duration: 0.2 } }}
      onClick={isBlurred ? undefined : onClick}
      className={`relative w-full rounded-[6px] bg-surface border border-border-dark overflow-hidden ${
        isBlurred ? '' : 'cursor-pointer'
      }`}
      style={{
        borderLeft: `3px solid ${signalColor}`,
      }}
    >
      {/* Shimmer Effect on Hover */}
      {!isBlurred && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%)",
            backgroundSize: "200% 100%",
          }}
          initial={{ backgroundPosition: "200% 0" }}
          whileHover={{ backgroundPosition: "-200% 0" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      )}

      {/* Live pulse dot in top-right */}
      {!isBlurred && (
        <div className="absolute top-4 right-4 z-10 flex items-center justify-center">
          <motion.span
            animate={{ opacity: [1, 0.4, 1], scale: [1, 0.9, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: signalColor }}
          />
        </div>
      )}

      {/* Blurred content wrapper */}
      <div className={`p-[14px_16px] relative z-10 transition-all duration-150 ${isBlurred ? 'blur-[4px] select-none pointer-events-none' : ''}`}>
        {/* Row 1: Ticker and Confidence/Signal */}
        <div className="flex justify-between items-center mb-2">
          <span className="font-sans font-medium text-[14px] text-frost leading-none">
            {ticker}
          </span>
          <div className="flex items-center gap-1 font-sans" style={{ color: signalColor }}>
            {signalType === 'BUY' && (
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-[6px] h-[6px] rounded-full inline-block mr-1.5"
                style={{ background: signalColor }}
              />
            )}
            <span className="font-mono text-[13px] font-medium leading-none">{confidence}%</span>
            <span className="text-[11px] leading-none">·</span>
            <span className="text-[11px] font-medium uppercase tracking-widest leading-none">{signalType}</span>
          </div>
        </div>

        {/* Row 2: Confidence Bar with Glow */}
        <div className="h-[2px] w-full bg-raised rounded-full overflow-hidden mb-3">
          <motion.div
            style={{ background: signalColor, height: 2, borderRadius: 1 }}
            initial={{ width: "0%" }}
            animate={{ width: `${confidence}%` }}
            transition={{ 
              duration: 0.8, 
              delay: index * 0.05, 
              ease: [0.23, 1, 0.32, 1] 
            }}
          />
        </div>

        {/* Row 3: Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div>
            <div className="font-sans text-[11px] text-dim font-normal mb-0.5 leading-none">Entry</div>
            <div className="font-mono text-[13px] text-frost font-medium leading-none">
              {entry.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="font-sans text-[11px] text-dim font-normal mb-0.5 leading-none">Stop loss</div>
            <div className="font-mono text-[13px] text-frost font-medium leading-none">
              {stopLoss.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="font-sans text-[11px] text-dim font-normal mb-0.5 leading-none">Target</div>
            <div className="font-mono text-[13px] text-frost font-medium leading-none">
              {target.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Row 4: Market Tag, R:R Chip and Live Countdown */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-normal text-dim bg-raised px-2 py-0.5 border border-border-dark rounded-[6px] font-sans leading-none">
              {market}
            </span>
            <span className="bg-[#1C1F28] border border-[#1E2230] rounded-[6px] px-2 py-0.5 text-[10px] font-medium text-[#6B7280] font-sans leading-none">
              R:R {rrRatio.toFixed(1)}x
            </span>
          </div>
          <span className="font-mono text-[11px] font-normal text-dim leading-none">
            {formatAge(ageSeconds)}
          </span>
        </div>
      </div>

      {/* Free Tier Blur Overlay */}
      {isBlurred && (
        <div className="absolute inset-0 bg-[#0D0F14]/85 flex flex-col items-center justify-center gap-2 z-20 pointer-events-auto">
          <span className="font-sans font-medium text-[13px] text-frost">Upgrade to Pro</span>
          <button className="bg-indigo text-white text-[12px] font-medium px-4 py-1.5 rounded-[6px] hover:bg-[#5254DE] transition-all duration-150">
            Unlock Now
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default SignalCard;
