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
}: SignalCardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const colorMap = {
    BUY: {
      text: 'text-sig-green',
      bg: 'bg-sig-green',
      border: 'border-l-sig-green',
      hex: '#22C55E',
    },
    SELL: {
      text: 'text-sig-red',
      bg: 'bg-sig-red',
      border: 'border-l-sig-red',
      hex: '#EF4444',
    },
    HOLD: {
      text: 'text-sig-amber',
      bg: 'bg-sig-amber',
      border: 'border-l-sig-amber',
      hex: '#F59E0B',
    },
  };

  const colors = colorMap[signalType] || colorMap.BUY;

  return (
    <div
      className={`relative w-full rounded-[6px] bg-surface border border-border-dark overflow-hidden transition-all duration-150 ease-in-out border-l-[3px] ${colors.border} ${
        isBlurred
          ? ''
          : 'hover:border-t-[#2A2F3E] hover:border-r-[#2A2F3E] hover:border-b-[#2A2F3E] hover:bg-[#131720]'
      }`}
    >
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

        {/* Row 2: Confidence Bar */}
        <div className="h-[2px] w-full bg-raised rounded-full overflow-hidden mb-3">
          <div
            className={`h-full ${colors.bg}`}
            style={{
              width: `${mounted ? confidence : 0}%`,
              transition: 'width 600ms ease',
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

        {/* Row 4: Market Tag and Timestamp */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-normal text-dim bg-raised px-2 py-0.5 border border-border-dark rounded-[6px] font-sans leading-none">
            {market}
          </span>
          <span className="font-sans text-[11px] font-normal text-dim leading-none">
            {timestamp}
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
