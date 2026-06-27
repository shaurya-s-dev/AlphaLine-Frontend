'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Bell } from 'lucide-react';
import { toast } from 'sonner';

function FlipNumber({ value }: { value: number }) {
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={value}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{ display: "inline-block" }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

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
  previousConfidence?: number;
  isWatched?: boolean;
  onWatchToggle?: (e: React.MouseEvent) => void;
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
  previousConfidence,
  isWatched = false,
  onWatchToggle,
}: SignalCardProps) {
  const [ageSeconds, setAgeSeconds] = useState(0);

  useEffect(() => {
    if (confidence > 80) {
      const enabled = localStorage.getItem('alphaline_notif_high_conf');
      if (enabled === 'true') {
        if (typeof window !== 'undefined') {
          const win = window as any;
          if (!win.toastedSignals) win.toastedSignals = new Set();
          const signalKey = `${ticker}_${signalType}_${confidence}`;
          if (!win.toastedSignals.has(signalKey)) {
            win.toastedSignals.add(signalKey);
            toast.success(`High confidence setup for ${ticker} (${confidence}%!)`, {
              icon: <Bell className="w-4 h-4 text-indigo" />,
              duration: 4000
            });
          }
        }
      }
    }
  }, [ticker, confidence, signalType]);

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

  // Ripple effect state
  const [ripples, setRipples] = useState<{x: number, y: number, id: number}[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(prev => [...prev, { x, y, id }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id));
    }, 600);
    onClick?.();
  };

  // Just updated flash effect
  const [isFlashing, setIsFlashing] = useState(false);
  const prevConfidenceRef = useRef(confidence);

  useEffect(() => {
    if (prevConfidenceRef.current !== confidence) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 400);
      prevConfidenceRef.current = confidence;
      return () => clearTimeout(timer);
    }
  }, [confidence]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        boxShadow: isFlashing 
          ? `0 0 0 1.5px ${signalColor}` 
          : "0 0 0 0px transparent",
        borderLeftColor: signalColor,
      }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      whileHover={isBlurred ? {} : { y: -2, transition: { duration: 0.2 } }}
      onClick={isBlurred ? undefined : handleClick}
      className={`relative w-full rounded-[6px] bg-surface border border-border-dark overflow-hidden ${
        isBlurred ? '' : 'cursor-pointer'
      }`}
      style={{
        borderLeftWidth: '3px',
        borderLeftStyle: 'solid',
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
          <div className="flex items-center gap-2">
            {onWatchToggle && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onWatchToggle(e);
                }}
                className="text-muted hover:text-[#F59E0B] transition-colors focus:outline-none flex items-center justify-center p-0.5"
                style={{ color: isWatched ? '#F59E0B' : '#374151' }}
              >
                <Star size={13} fill={isWatched ? '#F59E0B' : 'transparent'} />
              </button>
            )}
            <span className="font-sans font-medium text-[14px] text-frost leading-none">
              {ticker}
            </span>
          </div>
          <div className="flex items-center gap-1 font-sans" style={{ color: signalColor }}>
            {signalType === 'BUY' && (
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-[6px] h-[6px] rounded-full inline-block mr-1.5"
                style={{ background: signalColor }}
              />
            )}
            <span className="font-mono text-[13px] font-medium leading-none flex items-center">
              <FlipNumber value={confidence} />%
              {previousConfidence !== undefined && 
               previousConfidence !== confidence && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontSize: 10,
                    marginLeft: 4,
                    color: confidence > previousConfidence 
                      ? "#22C55E" : "#EF4444",
                  }}
                >
                  {confidence > previousConfidence ? "▲" : "▼"}
                  {Math.abs(confidence - previousConfidence)}
                </motion.span>
              )}
            </span>
            <span className="text-[11px] leading-none">&middot;</span>
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
            <div className="font-sans text-[11px] text-[#94A3B8] font-normal mb-0.5 leading-none">Entry</div>
            <div className="font-mono text-[13px] text-frost font-medium leading-none">
              {entry.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="font-sans text-[11px] text-[#94A3B8] font-normal mb-0.5 leading-none">Stop loss</div>
            <div className="font-mono text-[13px] text-frost font-medium leading-none">
              {stopLoss.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="font-sans text-[11px] text-[#94A3B8] font-normal mb-0.5 leading-none">Target</div>
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
          <div className="flex flex-col items-end gap-1 select-none">
            <span className="font-mono text-[11px] font-normal text-dim leading-none">
              {formatAge(ageSeconds)}
            </span>
            {(() => {
              const expiryDuration = 900; // 15 mins
              const remaining = Math.max(0, expiryDuration - ageSeconds);
              const m = Math.floor(remaining / 60);
              const s = remaining % 60;
              const text = remaining === 0 ? 'Expired' : `${m}m ${s}s left`;
              const colorClass = remaining > 300 ? 'text-[#6B7280]' : remaining > 60 ? 'text-[#F59E0B] animate-pulse' : 'text-[#EF4444] animate-pulse';
              return (
                <span className={`font-mono text-[9px] font-bold leading-none ${colorClass}`}>
                  ⏳ {text}
                </span>
              );
            })()}
          </div>
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

      {/* Ripple Effect Animation */}
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          style={{
            position: "absolute",
            left: ripple.x,
            top: ripple.y,
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: signalColor,
            opacity: 0.4,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 5,
          }}
          animate={{
            scale: [0, 40],
            opacity: [0.4, 0],
          }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      ))}
    </motion.div>
  );
}

export default SignalCard;
