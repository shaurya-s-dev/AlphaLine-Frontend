'use client';

import React from 'react';

export interface TickerTapeSignal {
  ticker: str;
  confidence: number;
  signalType: 'BUY' | 'SELL' | 'HOLD';
  market?: string;
}

export interface TickerTapeProps {
  signals: TickerTapeSignal[];
}

export function TickerTape({ signals }: TickerTapeProps) {
  const getSignalColor = (type: 'BUY' | 'SELL' | 'HOLD') => {
    if (type === 'BUY') return '#22C55E';
    if (type === 'SELL') return '#EF4444';
    return '#F59E0B';
  };

  const getSignalArrow = (type: 'BUY' | 'SELL' | 'HOLD') => {
    if (type === 'BUY') return '▲';
    if (type === 'SELL') return '▼';
    return '–';
  };

  // Safe fallback if signals array is empty or undefined
  const displaySignals = signals && signals.length > 0 ? signals : [
    { ticker: 'RELIANCE.NS', confidence: 81, signalType: 'BUY' },
    { ticker: 'TCS.NS', confidence: 67, signalType: 'SELL' },
    { ticker: 'NVDA', confidence: 88, signalType: 'BUY' },
    { ticker: 'AAPL', confidence: 74, signalType: 'BUY' },
    { ticker: 'INFY.NS', confidence: 54, signalType: 'HOLD' },
    { ticker: 'HDFC.NS', confidence: 71, signalType: 'SELL' }
  ];

  return (
    <div className="w-full flex flex-col bg-[#0D0F14]/80 backdrop-blur-md border-b border-[#1E2230] select-none overflow-hidden">
      {/* Row 1: Scrolls Left */}
      <div className="overflow-hidden border-b border-[#1E2230]">
        <div 
          className="flex whitespace-nowrap"
          style={{
            animation: 'scroll-left 30s linear infinite',
            width: 'max-content',
          }}
        >
          {/* Duplicate list twice for seamless scroll loop */}
          {[...displaySignals, ...displaySignals].map((s, i) => (
            <div 
              key={`r1-${i}`} 
              className="flex items-center gap-2 px-6 py-2 border-r border-[#1E2230] font-sans text-[12px]"
            >
              <span className="font-brand text-[11px] tracking-widest text-[#E2E8F0] font-semibold">
                {s.ticker}
              </span>
              <span 
                className="font-mono text-[11px] font-medium"
                style={{ color: getSignalColor(s.signalType) }}
              >
                {s.confidence}% {s.signalType}
              </span>
              <span className="text-[#374151] font-mono text-[10px]">
                {getSignalArrow(s.signalType)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Scrolls Right */}
      <div className="overflow-hidden">
        <div 
          className="flex whitespace-nowrap"
          style={{
            animation: 'scroll-right 30s linear infinite',
            width: 'max-content',
          }}
        >
          {/* Reverse list and duplicate twice for visual variation and opposite direction */}
          {[...[...displaySignals].reverse(), ...[...displaySignals].reverse()].map((s, i) => (
            <div 
              key={`r2-${i}`} 
              className="flex items-center gap-2 px-6 py-2 border-r border-[#1E2230] font-sans text-[12px]"
            >
              <span className="font-brand text-[11px] tracking-widest text-[#E2E8F0] font-semibold">
                {s.ticker}
              </span>
              <span 
                className="font-mono text-[11px] font-medium"
                style={{ color: getSignalColor(s.signalType) }}
              >
                {s.confidence}% {s.signalType}
              </span>
              <span className="text-[#374151] font-mono text-[10px]">
                {getSignalArrow(s.signalType)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
