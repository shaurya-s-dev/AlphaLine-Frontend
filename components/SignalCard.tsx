'use client';

import React, { useEffect, useState } from 'react';

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
}: SignalCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const colorMap = {
    BUY: {
      text: 'text-sig-green',
      bg: 'bg-sig-green',
      border: 'border-l-sig-green',
      hex: '#22C55E',
      glowColor: 'rgba(34, 197, 94, 0.4)',
      hoverGlow: 'rgba(34, 197, 94, 0.2)',
    },
    SELL: {
      text: 'text-sig-red',
      bg: 'bg-sig-red',
      border: 'border-l-sig-red',
      hex: '#EF4444',
      glowColor: 'rgba(239, 68, 68, 0.4)',
      hoverGlow: 'rgba(239, 68, 68, 0.2)',
    },
    HOLD: {
      text: 'text-sig-amber',
      bg: 'bg-sig-amber',
      border: 'border-l-sig-amber',
      hex: '#F59E0B',
      glowColor: 'rgba(245, 158, 11, 0.4)',
      hoverGlow: 'rgba(245, 158, 11, 0.2)',
    },
  };

  const colors = colorMap[signalType] || colorMap.BUY;

  // Calculate dynamic Risk-Reward Ratio
  const stopDistance = Math.abs(entry - stopLoss);
  const rewardDistance = Math.abs(target - entry);
  const rrRatio = stopDistance > 0 ? rewardDistance / stopDistance : 2.1;

  return (
    <div
      className={`signal-card relative w-full rounded-[6px] bg-surface border border-border-dark overflow-hidden border-l-[3px] ${colors.border} ${
        isBlurred
          ? ''
          : 'hover:border-t-[#2A2F3E] hover:border-r-[#2A2F3E] hover:border-b-[#2A2F3E] hover:bg-[#131720]'
      }`}
      style={{
        animation: 'cardSlideIn 400ms ease-out forwards',
        animationDelay: `${index * 60}ms`,
        opacity: 0,
        ['--glow-color' as any]: colors.hoverGlow,
      }}
    >
      {/* Self-contained CSS animations and hover effects */}
      <style jsx>{`
        @keyframes cardSlideIn {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes cardLivePulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.8);
          }
        }
        .signal-card {
          transition: box-shadow 200ms ease-in-out, border-color 200ms ease-in-out, background-color 200ms ease-in-out;
        }
        .signal-card:hover {
          box-shadow: inset 3px 0 12px var(--glow-color);
        }
      `}</style>

      {/* Live pulse dot in top-right */}
      {!isBlurred && (
        <div
          className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: colors.hex,
            animation: 'cardLivePulse 2s ease infinite',
          }}
        />
      )}

      {/* Blurred content wrapper */}
      <div className={`p-[14px_16px] transition-all duration-150 ${isBlurred ? 'blur-[4px] select-none pointer-events-none' : ''}`}>
        {/* Row 1: Ticker and Confidence/Signal */}
        <div className="flex justify-between items-center mb-2">
          <span className="font-sans font-medium text-[14px] text-frost leading-none">{ticker}</span>
          <div className="flex items-center gap-1 font-sans" style={{ color: colors.hex }}>
            <span className="font-mono text-[13px] font-medium leading-none">{confidence}%</span>
            <span className="text-[11px] leading-none">·</span>
            <span className="text-[11px] font-medium uppercase tracking-widest leading-none">{signalType}</span>
          </div>
        </div>

        {/* Row 2: Confidence Bar with Glow */}
        <div className="h-[2px] w-full bg-raised rounded-full overflow-hidden mb-3">
          <div
            className={`h-full ${colors.bg}`}
            style={{
              width: `${mounted ? confidence : 0}%`,
              transition: 'width 600ms ease',
              boxShadow: mounted ? `0 0 6px ${colors.glowColor}` : 'none',
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
        <div className="absolute inset-0 bg-[#0D0F14]/85 flex flex-col items-center justify-center gap-2 z-10 pointer-events-auto">
          <span className="font-sans font-medium text-[13px] text-frost">Upgrade to Pro</span>
          <button className="bg-indigo text-white text-[12px] font-medium px-4 py-1.5 rounded-[6px] hover:bg-[#5254DE] transition-all duration-150">
            Unlock Now
          </button>
        </div>
      )}
    </div>
  );
}

export default SignalCard;
