'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

export interface SignalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  signal: {
    ticker: string;
    market: string;
    signalType: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    entry: number;
    stopLoss: number;
    target: number;
    timestamp: string;
  } | null;
}

export function SignalDrawer({ isOpen, onClose, signal }: SignalDrawerProps) {
  if (!signal) return null;

  const signalColors = {
    BUY: '#22C55E',
    SELL: '#EF4444',
    HOLD: '#F59E0B',
  };
  const signalColor = signalColors[signal.signalType] || signalColors.BUY;

  // SVG Circular progress ring calculation
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (signal.confidence / 100) * circumference;

  // Percent variations for entry indicators
  const stopLossChange = ((signal.stopLoss - signal.entry) / signal.entry) * 100;
  const targetChange = ((signal.target - signal.entry) / signal.entry) * 100;

  // Recharts 20 points mock trend data aligned with signal type
  const mockSparklineData = Array.from({ length: 20 }, (_, i) => {
    let price = signal.entry;
    if (signal.signalType === 'BUY') {
      price = signal.entry * (0.97 + (i / 19) * 0.05 + Math.sin(i * 1.5) * 0.006);
    } else if (signal.signalType === 'SELL') {
      price = signal.entry * (1.03 - (i / 19) * 0.05 + Math.sin(i * 1.5) * 0.006);
    } else {
      price = signal.entry * (0.99 + Math.sin(i * 1.8) * 0.012);
    }
    return { time: i, value: parseFloat(price.toFixed(2)) };
  });

  // Calculate technical indicators based on signalType for "Why this signal"
  const rsiVal = signal.signalType === 'BUY' ? 34 : signal.signalType === 'SELL' ? 71 : 52;
  const volumeVal = signal.signalType === 'BUY' ? 1.48 : signal.signalType === 'SELL' ? 1.32 : 0.98;
  const momentumVal = signal.signalType === 'BUY' ? 0.07 : signal.signalType === 'SELL' ? -0.05 : 0.01;

  // Calculate bar fill widths (0 to 100%)
  const rsiBarWidth = `${rsiVal}%`;
  const volumeBarWidth = `${Math.min(100, (volumeVal / 2) * 100)}%`;
  const momentumBarWidth = `${Math.min(100, ((momentumVal + 0.15) / 0.3) * 100)}%`;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            {/* Backdrop Overlay */}
            <Dialog.Overlay forceMount asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 pointer-events-auto"
              />
            </Dialog.Overlay>

            {/* Content Drawer Panel */}
            <Dialog.Content forceMount asChild>
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] bg-surface border-l border-border-dark p-6 z-50 flex flex-col justify-between overflow-y-auto text-frost font-sans shadow-2xl focus:outline-none"
              >
                <div>
                  {/* Header Row */}
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2.5">
                      <span className="font-brand text-[18px] font-semibold tracking-wider text-frost">
                        {signal.ticker}
                      </span>
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] border uppercase tracking-widest font-sans"
                        style={{ 
                          color: signalColor, 
                          borderColor: `${signalColor}33`, 
                          backgroundColor: `${signalColor}10` 
                        }}
                      >
                        {signal.signalType}
                      </span>
                    </div>
                    
                    {/* Close Button */}
                    <Dialog.Close asChild>
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="text-muted hover:text-frost p-1 bg-raised hover:bg-[#252836] border border-border-dark rounded-[6px] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </Dialog.Close>
                  </div>

                  {/* Confidence SVG Progress circle */}
                  <div className="flex flex-col items-center justify-center p-4 bg-void border border-border-dark rounded-[6px] mb-6 relative">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r={radius}
                          className="stroke-[#1E2230]"
                          strokeWidth="5"
                          fill="transparent"
                        />
                        <motion.circle
                          cx="64"
                          cy="64"
                          r={radius}
                          className="stroke-current"
                          style={{ stroke: signalColor }}
                          strokeWidth="5"
                          fill="transparent"
                          strokeDasharray={circumference}
                          initial={{ strokeDashoffset: circumference }}
                          animate={{ strokeDashoffset }}
                          transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="font-mono text-[32px] font-bold leading-none text-frost">
                          {signal.confidence}%
                        </span>
                        <span className="text-[9px] text-muted font-sans uppercase tracking-widest mt-1">
                          CONFLUENCE
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2x2 Price Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Entry Price */}
                    <div className="bg-raised/40 border border-border-dark p-3.5 rounded-[6px] flex flex-col justify-between">
                      <span className="text-[10px] text-muted font-sans uppercase tracking-wider mb-1">Entry Price</span>
                      <span className="font-mono text-[16px] font-semibold text-frost">
                        {signal.entry.toFixed(2)}
                      </span>
                      <span className="text-[9px] text-muted font-mono mt-1">Base Level</span>
                    </div>

                    {/* Risk Reward Ratio */}
                    <div className="bg-raised/40 border border-border-dark p-3.5 rounded-[6px] flex flex-col justify-between">
                      <span className="text-[10px] text-muted font-sans uppercase tracking-wider mb-1">R:R Ratio</span>
                      <span className="font-mono text-[16px] font-semibold text-frost">
                        {((signal.target - signal.entry) / Math.abs(signal.entry - signal.stopLoss) || 2.1).toFixed(1)}x
                      </span>
                      <span className="text-[9px] text-sig-green font-medium font-sans mt-1">Optimized</span>
                    </div>

                    {/* Stop Loss Price */}
                    <div className="bg-raised/40 border border-border-dark p-3.5 rounded-[6px] flex flex-col justify-between">
                      <span className="text-[10px] text-muted font-sans uppercase tracking-wider mb-1">Stop Loss</span>
                      <span className="font-mono text-[16px] font-semibold text-sig-red">
                        {signal.stopLoss.toFixed(2)}
                      </span>
                      <span className="text-[9px] text-sig-red font-mono font-medium mt-1 flex items-center gap-0.5">
                        <ArrowDownRight className="w-3 h-3" />
                        {stopLossChange.toFixed(1)}%
                      </span>
                    </div>

                    {/* Target Price */}
                    <div className="bg-raised/40 border border-border-dark p-3.5 rounded-[6px] flex flex-col justify-between">
                      <span className="text-[10px] text-muted font-sans uppercase tracking-wider mb-1">Target Price</span>
                      <span className="font-mono text-[16px] font-semibold text-sig-green">
                        {signal.target.toFixed(2)}
                      </span>
                      <span className="text-[9px] text-sig-green font-mono font-medium mt-1 flex items-center gap-0.5">
                        <ArrowUpRight className="w-3 h-3" />
                        +{targetChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Sparkline AreaChart Section */}
                  <div className="bg-void border border-border-dark rounded-[6px] p-4 mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] text-muted font-sans uppercase tracking-wider">15m Trend Sparkline</span>
                      <span className="text-[10px] font-mono text-dim">20 Intervals</span>
                    </div>
                    <div className="h-[120px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mockSparklineData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <defs>
                            <linearGradient id="drawerChartGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={signalColor} stopOpacity={0.25} />
                              <stop offset="100%" stopColor={signalColor} stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke={signalColor} 
                            strokeWidth={1.5}
                            fill="url(#drawerChartGrad)"
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* "Why this signal" Section */}
                  <div className="space-y-3.5">
                    <h4 className="text-[11px] text-muted font-sans uppercase tracking-wider">Why This Signal</h4>
                    
                    {/* RSI Row */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-dim">Relative Strength Index (RSI)</span>
                        <span className="font-mono text-frost font-medium">{rsiVal}</span>
                      </div>
                      <div className="h-1 bg-raised rounded-full overflow-hidden w-full">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: rsiBarWidth, backgroundColor: signalColor }}
                        />
                      </div>
                    </div>

                    {/* Volume Row */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-dim">Volume Spike Ratio</span>
                        <span className="font-mono text-frost font-medium">{volumeVal.toFixed(2)}x</span>
                      </div>
                      <div className="h-1 bg-raised rounded-full overflow-hidden w-full">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: volumeBarWidth, backgroundColor: signalColor }}
                        />
                      </div>
                    </div>

                    {/* Momentum Row */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-dim">Momentum Velocity</span>
                        <span className="font-mono text-frost font-medium">{momentumVal > 0 ? `+${momentumVal.toFixed(2)}` : momentumVal.toFixed(2)}</span>
                      </div>
                      <div className="h-1 bg-raised rounded-full overflow-hidden w-full">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: momentumBarWidth, backgroundColor: signalColor }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Age Details */}
                <div className="mt-8 pt-4 border-t border-border-dark flex justify-between items-center text-[11px] text-muted font-mono">
                  <span>AGE: {signal.timestamp}</span>
                  <span className="uppercase text-[10px] tracking-wider font-sans">15m Bar Confluence</span>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export default SignalDrawer;
