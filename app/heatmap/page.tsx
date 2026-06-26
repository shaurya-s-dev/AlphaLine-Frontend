'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { SignalDrawer } from '@/components/SignalDrawer';
import { motion } from 'framer-motion';

export default function HeatmapPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('N/A');
  const [selectedSignal, setSelectedSignal] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const indiaTickers = [
    "RELIANCE", "TCS", "INFY", "WIPRO", "HDFCBANK",
    "ICICIBANK", "SBIN", "BAJFINANCE", "HINDUNILVR", "MARUTI",
    "SUNPHARMA", "TATAMOTORS", "ADANIENT", "AXISBANK", "KOTAKBANK", "TITAN"
  ];

  const usTickers = [
    "AAPL", "NVDA", "MSFT", "GOOGL", "TSLA",
    "META", "AMZN", "AMD", "NFLX", "CRM",
    "ORCL", "INTC", "QCOM", "SHOP", "COIN"
  ];

  useEffect(() => {
    document.title = "Alphaline — Market Heatmap";
  }, []);

  const fetchSignals = async () => {
    try {
      const response = await fetch('/api/signals?market=all&limit=50');
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && data.signals) {
        setSignals(data.signals);
      }
    } catch (e) {
      console.error("Heatmap fetching error:", e);
    } finally {
      setIsLoading(false);
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSignalColor = (type: string) => {
    if (type === 'BUY') return '#22C55E';
    if (type === 'SELL') return '#EF4444';
    if (type === 'HOLD') return '#F59E0B';
    return '#374151';
  };

  const getSignalArrow = (type: string) => {
    if (type === 'BUY') return '▲';
    if (type === 'SELL') return '▼';
    return '–';
  };

  const getTileStyles = (signal: any) => {
    if (!signal) {
      return {
        backgroundColor: '#16181F50', // dark overlay
        borderColor: '#1E2230',
        textColor: '#374151',
        arrowColor: '#374151'
      };
    }
    const color = getSignalColor(signal.signalType);
    let bgColor = '#1C1F28';
    if (signal.signalType === 'BUY') bgColor = 'rgba(34, 197, 94, 0.15)';
    else if (signal.signalType === 'SELL') bgColor = 'rgba(239, 68, 68, 0.15)';
    else if (signal.signalType === 'HOLD') bgColor = 'rgba(245, 158, 11, 0.08)';

    return {
      backgroundColor: bgColor,
      borderColor: `${color}40`, // 25% opacity
      textColor: color,
      arrowColor: color
    };
  };

  const findSignal = (baseTicker: string) => {
    return signals.find(s => {
      const dbBase = s.ticker.replace(/\.(NS|BO)$/, '');
      return dbBase.toUpperCase() === baseTicker.toUpperCase();
    });
  };

  const handleTileClick = (ticker: string) => {
    const signal = findSignal(ticker);
    if (signal) {
      setSelectedSignal(signal);
      setIsDrawerOpen(true);
    }
  };

  const renderGridSection = (title: string, tickers: string[]) => (
    <div className="flex-1 min-w-[280px] bg-surface/30 backdrop-blur-md border border-border-dark p-5 rounded-[12px] flex flex-col gap-4">
      <h3 className="text-[13px] font-brand font-semibold text-muted tracking-wider uppercase select-none border-b border-border-dark/60 pb-2">
        {title}
      </h3>
      
      {isLoading ? (
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-3">
          {tickers.map((t) => (
            <div 
              key={t}
              className="h-[80px] rounded-[6px] bg-[#1C1F28]/50 border border-border-dark/60 animate-pulse flex items-center justify-center"
            >
              <span className="font-brand text-[10px] text-dim">{t}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-3">
          {tickers.map((ticker, index) => {
            const signal = findSignal(ticker);
            const styles = getTileStyles(signal);
            return (
              <motion.div
                key={ticker}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.02, duration: 0.3 }}
                whileHover={{ 
                  scale: signal ? 1.04 : 1.0,
                  borderColor: signal ? `${getSignalColor(signal.signalType)}99` : '#1E2230' // 60% opacity on hover
                }}
                onClick={() => handleTileClick(ticker)}
                className={`h-[80px] rounded-[6px] border flex flex-col justify-between p-3 select-none transition-all duration-150 ${
                  signal ? 'cursor-pointer' : 'cursor-default'
                }`}
                style={{
                  backgroundColor: styles.backgroundColor,
                  borderColor: styles.borderColor,
                }}
              >
                {/* Top: Ticker name */}
                <div className="font-brand font-medium text-[11px] text-[#E2E8F0] tracking-wider truncate">
                  {ticker}
                </div>

                {/* Middle: Confidence */}
                <div 
                  className="font-mono font-bold text-[20px] leading-none"
                  style={{ color: styles.textColor }}
                >
                  {signal ? `${signal.confidence}%` : '–'}
                </div>

                {/* Bottom: Signal type and arrow */}
                <div 
                  className="font-sans font-medium text-[9px] tracking-widest uppercase flex items-center gap-1 leading-none"
                  style={{ color: styles.textColor }}
                >
                  <span>{signal ? getSignalArrow(signal.signalType) : '–'}</span>
                  <span>{signal ? signal.signalType : 'NO DATA'}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-void text-frost flex flex-col font-sans">
      <Sidebar activeTab="Heatmap" />
      <AnimatedBackground />

      <main className="flex-1 md:pl-[220px] p-6 pb-24 md:pb-6 max-w-5xl w-full mx-auto relative z-10">
        
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6 select-none">
          <div className="flex flex-col gap-1">
            <h1 className="text-[20px] font-medium text-frost font-sans leading-none">Market Heatmap</h1>
            <p className="text-[13px] text-muted font-sans font-normal leading-normal">
              Visual map of predictive confluence ratings across global sectors.
            </p>
          </div>
          <div className="font-mono text-[10px] text-muted tracking-wider">
            LAST FETCH: {lastUpdated}
          </div>
        </div>

        {/* Control & Legend Row */}
        <div className="bg-[#111318]/50 backdrop-blur-md border border-border-dark p-4 rounded-[6px] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 select-none">
          <div className="font-brand font-semibold text-[13px] text-indigo tracking-wider uppercase">
            SECTOR STRENGTH
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 text-[12px] font-sans font-normal text-muted">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sig-green" />
              <span>▲ BUY</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sig-red" />
              <span>▼ SELL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sig-amber" />
              <span>– HOLD</span>
            </div>
          </div>
        </div>

        {/* Heatmap Grid Split Section */}
        <div className="flex flex-col lg:flex-row gap-6">
          {renderGridSection("India (NSE/BSE)", indiaTickers)}
          {renderGridSection("US Markets", usTickers)}
        </div>

      </main>

      {/* Signal Details drawer popup overlay */}
      <SignalDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        signal={selectedSignal}
      />
    </div>
  );
}
