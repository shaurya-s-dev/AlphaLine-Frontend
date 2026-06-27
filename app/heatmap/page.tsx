'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useSidebar } from '@/components/SidebarProvider';
import { Menu } from 'lucide-react';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { RefreshCw, LayoutGrid, AlertCircle, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { InfoPanel } from '@/components/InfoPanel';

export default function HeatmapPage() {
  const { collapsed } = useSidebar();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const router = useRouter();
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('N/A');

  const sectors = [
    { name: "Technology", tickers: ["TCS.NS", "INFY.NS", "WIPRO.NS", "HCLTECH.NS", "TECHM.NS"] },
    { name: "Banking", tickers: ["HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "AXISBANK.NS", "KOTAKBANK.NS"] },
    { name: "Energy", tickers: ["RELIANCE.NS", "ONGC.NS", "BPCL.NS"] },
    { name: "FMCG", tickers: ["HINDUNILVR.NS", "ITC.NS", "NESTLEIND.NS"] },
    { name: "Auto", tickers: ["MARUTI.NS", "TATAMOTORS.NS", "EICHERMOT.NS"] },
    { name: "Pharma", tickers: ["SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS"] }
  ];

  const usTickers = [
    "AAPL", "NVDA", "MSFT", "GOOGL", "TSLA",
    "META", "AMZN", "AMD", "NFLX", "CRM",
    "ORCL", "INTC", "QCOM", "SHOP", "COIN"
  ];

  const allIndiaTickers = sectors.flatMap(s => s.tickers);

  const fetchSignals = async () => {
    try {
      setIsLoading(true);
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
    document.title = "Alphaline — Market Heatmap";
    fetchSignals();
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
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-dark)',
        textColor: 'var(--text-muted)',
      };
    }
    const color = getSignalColor(signal.signalType);
    let bgColor = 'var(--bg-surface)';
    if (signal.signalType === 'BUY') bgColor = 'rgba(34, 197, 94, 0.08)';
    else if (signal.signalType === 'SELL') bgColor = 'rgba(239, 68, 68, 0.08)';
    else if (signal.signalType === 'HOLD') bgColor = 'rgba(245, 158, 11, 0.04)';

    return {
      backgroundColor: bgColor,
      borderColor: `${color}33`,
      textColor: color,
    };
  };

  const findSignal = (ticker: string) => {
    return signals.find(s => 
      s.ticker === ticker || 
      s.ticker === ticker + '.NS' ||
      s.ticker.replace('.NS','').replace('.BO','') 
        === ticker.replace('.NS','').replace('.BO','')
    );
  };

  const handleTileClick = (ticker: string) => {
    const signal = findSignal(ticker);
    if (signal) {
      router.push(`/analyze/${signal.ticker}?signal=${signal.signalType}&confidence=${signal.confidence}&entry=${signal.entry}`);
    } else {
      toast.error(`No signal data available to analyze ${ticker}`);
    }
  };

  // Dominant Signal Calculator for sectors
  const getDominantSignal = (tickers: string[]) => {
    let buy = 0, sell = 0, hold = 0;
    tickers.forEach(t => {
      const sig = findSignal(t);
      if (sig) {
        if (sig.signalType === 'BUY') buy++;
        else if (sig.signalType === 'SELL') sell++;
        else if (sig.signalType === 'HOLD') hold++;
      }
    });

    if (buy > sell && buy > hold) return { label: 'BUY', styles: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20' };
    if (sell > buy && sell > hold) return { label: 'SELL', styles: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20' };
    return { label: 'HOLD', styles: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20' };
  };

  // Market sentiment logic
  const getMarketSentiment = (tickers: string[]) => {
    let buy = 0, sell = 0, total = 0;
    tickers.forEach(t => {
      const sig = findSignal(t);
      if (sig) {
        total++;
        if (sig.signalType === 'BUY') buy++;
        else if (sig.signalType === 'SELL') sell++;
      }
    });

    if (total === 0) return { sentiment: 'Mixed', color: 'text-[#F59E0B]', buyCount: 0, total };
    const buyPct = (buy / total) * 100;
    const sellPct = (sell / total) * 100;

    if (buyPct > 45) return { sentiment: 'Bullish', color: 'text-[#22C55E]', buyCount: buy, total };
    if (sellPct > 40) return { sentiment: 'Bearish', color: 'text-[#EF4444]', buyCount: buy, total };
    return { sentiment: 'Mixed', color: 'text-[#F59E0B]', buyCount: buy, total };
  };

  // Stats Calculations
  const totalAnalyzed = signals.length;
  const buyCount = signals.filter(s => s.signalType === 'BUY').length;
  const sellCount = signals.filter(s => s.signalType === 'SELL').length;
  const holdCount = signals.filter(s => s.signalType === 'HOLD').length;

  const indiaSummary = getMarketSentiment(allIndiaTickers);
  const usSummary = getMarketSentiment(usTickers);

  return (
    <div className="min-h-screen bg-void text-frost flex flex-col font-sans">
      <Sidebar activeTab="Heatmap" isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />
      <AnimatedBackground />

      <main className={`flex-1 transition-all duration-300 ${collapsed ? 'md:pl-[64px]' : 'md:pl-[220px]'} p-6 pb-24 md:pb-6 max-w-5xl w-full mx-auto relative z-10`}>
        
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6 select-none">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 mb-1.5">
              <button 
                onClick={() => setIsMobileSidebarOpen(true)} 
                className="md:hidden p-1.5 bg-raised border border-border-dark rounded-[6px] text-muted hover:text-frost"
              >
                <Menu className="w-4 h-4" />
              </button>
              <h1 className="text-[20px] font-medium text-frost font-sans leading-none mb-0">Market Heatmap</h1>
            </div>
            <p className="text-[13px] text-muted font-sans font-normal leading-normal">
              Visual map of predictive confluence ratings across global sectors.
            </p>
          </div>
          <button 
            onClick={fetchSignals}
            className="flex items-center gap-1.5 text-muted hover:text-frost font-sans text-[12px] bg-surface/50 border border-border-dark px-3 py-1.5 rounded-[6px] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Feed
          </button>
        </div>

        <InfoPanel title="How This Works">
          <p>
            <strong>Sector heatmap:</strong> Each cell shows a stock's 1-day % price change. Green = positive, Red = negative. Intensity of color = magnitude of move. Sector groupings follow SEBI/NSE sector classifications. Use this to identify which sectors are leading or lagging the market on any given day.
          </p>
        </InfoPanel>

        {/* Stats Row */}
        <div className="bg-[#111318]/50 backdrop-blur-md border border-border-dark p-4 rounded-[12px] flex flex-wrap gap-x-6 gap-y-2 mb-6 text-[12px] text-muted select-none">
          <div><span className="font-semibold text-frost">{totalAnalyzed}</span> stocks analyzed</div>
          <div><span className="font-semibold text-[#22C55E]">{buyCount}</span> BUY signals</div>
          <div><span className="font-semibold text-[#EF4444]">{sellCount}</span> SELL signals</div>
          <div><span className="font-semibold text-[#F59E0B]">{holdCount}</span> HOLD signals</div>
          <div className="ml-auto font-mono text-[10px]">LAST UPDATED: {lastUpdated}</div>
        </div>

        {/* Sector Summary Bar */}
        <div className="mb-6 space-y-2 select-none">
          <div className="font-brand text-[10px] text-muted tracking-widest uppercase">India Sectors Dominance</div>
          <div className="flex flex-wrap gap-2">
            {sectors.map(sec => {
              const dom = getDominantSignal(sec.tickers);
              return (
                <div 
                  key={sec.name}
                  className={`px-3 py-1 rounded-[6px] border text-[11px] font-sans font-medium flex items-center gap-1.5 ${dom.styles}`}
                >
                  <span>{sec.name}</span>
                  <span className="opacity-40 font-normal">|</span>
                  <span className="font-bold">{dom.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Market Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 select-none">
          {/* India Card */}
          <div className="bg-surface/30 backdrop-blur-md border border-border-dark p-4 rounded-[12px] space-y-1">
            <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">India Confluence Health</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-[24px] font-brand font-bold ${indiaSummary.color}`}>{indiaSummary.sentiment}</span>
              <span className="text-[12px] text-muted">({indiaSummary.buyCount} of {indiaSummary.total} showing BUY)</span>
            </div>
          </div>
          {/* US Card */}
          <div className="bg-surface/30 backdrop-blur-md border border-border-dark p-4 rounded-[12px] space-y-1">
            <span className="text-[10px] text-muted uppercase tracking-wider font-semibold">US Confluence Health</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-[24px] font-brand font-bold ${usSummary.color}`}>{usSummary.sentiment}</span>
              <span className="text-[12px] text-muted">({usSummary.buyCount} of {usSummary.total} showing BUY)</span>
            </div>
          </div>
        </div>

        {/* Heatmap Grid Split Section */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* India Grid Grouped by Sector */}
          <div className="flex-1 min-w-[320px] bg-surface/30 backdrop-blur-md border border-border-dark p-5 rounded-[12px] space-y-6">
            <h3 className="text-[13px] font-brand font-semibold text-muted tracking-wider uppercase select-none border-b border-border-dark/60 pb-2 flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5 text-indigo" /> India (NSE/BSE)
            </h3>
            
            {isLoading ? (
              <div className="grid grid-cols-2 xs:grid-cols-3 gap-3">
                {allIndiaTickers.map((t) => (
                  <div key={t} className="h-[80px] rounded-[6px] bg-[#1C1F28]/50 border border-border-dark/60 animate-pulse flex items-center justify-center">
                    <span className="font-brand text-[10px] text-dim">{t}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {sectors.map(sector => (
                  <div key={sector.name} className="space-y-2">
                    <span className="text-[10px] font-sans font-medium text-muted uppercase tracking-widest block">{sector.name}</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {sector.tickers.map(ticker => {
                        const signal = findSignal(ticker);
                        const styles = getTileStyles(signal);
                        return (
                          <div
                            key={ticker}
                            onClick={() => handleTileClick(ticker)}
                            className="group relative h-[80px] rounded-[6px] border flex flex-col justify-between p-3 select-none transition-all duration-150 cursor-pointer bg-surface/80 hover:bg-[#1C1F28]"
                            style={{
                              borderColor: styles.borderColor,
                              backgroundColor: styles.backgroundColor
                            }}
                          >
                            {/* Top: Ticker name */}
                            <div className="font-brand font-medium text-[11px] text-[#E2E8F0] tracking-wider truncate flex justify-between items-center w-full">
                              <span>{ticker}</span>
                              <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo" />
                            </div>

                            {/* Middle: Confidence */}
                            <div className="font-mono font-bold text-[18px] leading-none" style={{ color: styles.textColor }}>
                              {signal ? `${signal.confidence}%` : '–'}
                            </div>

                            {/* Bottom: Signal type and arrow */}
                            <div className="font-sans font-medium text-[9px] tracking-widest uppercase flex items-center gap-1 leading-none" style={{ color: styles.textColor }}>
                              <span>{signal ? getSignalArrow(signal.signalType) : '–'}</span>
                              <span>{signal ? signal.signalType : 'NO DATA'}</span>
                            </div>

                            {/* HOVER TOOLTIP CARD */}
                            {signal && (
                              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-[#1C1F28] border border-border-dark p-3 rounded-[6px] shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 space-y-1 text-left text-[11px] font-sans text-muted">
                                <div className="font-semibold text-frost mb-1 font-brand border-b border-border-dark/40 pb-1">{signal.ticker} Stats</div>
                                <div className="flex justify-between"><span>Entry:</span> <span className="font-mono text-frost">${signal.entry}</span></div>
                                <div className="flex justify-between"><span>Stop Loss:</span> <span className="font-mono text-sig-red">${signal.stopLoss}</span></div>
                                <div className="flex justify-between"><span>Target:</span> <span className="font-mono text-sig-green">${signal.target}</span></div>
                                <div className="flex justify-between"><span>R:R Ratio:</span> <span className="font-mono text-indigo">{signal.riskReward || '2.0'}</span></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* US Markets Grid */}
          <div className="flex-1 min-w-[320px] bg-surface/30 backdrop-blur-md border border-border-dark p-5 rounded-[12px] space-y-6">
            <h3 className="text-[13px] font-brand font-semibold text-muted tracking-wider uppercase select-none border-b border-border-dark/60 pb-2 flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5 text-indigo" /> US Markets
            </h3>
            
            {isLoading ? (
              <div className="grid grid-cols-2 xs:grid-cols-3 gap-3">
                {usTickers.map((t) => (
                  <div key={t} className="h-[80px] rounded-[6px] bg-[#1C1F28]/50 border border-border-dark/60 animate-pulse flex items-center justify-center">
                    <span className="font-brand text-[10px] text-dim">{t}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {usTickers.map(ticker => {
                  const signal = findSignal(ticker);
                  const styles = getTileStyles(signal);
                  return (
                    <div
                      key={ticker}
                      onClick={() => handleTileClick(ticker)}
                      className="group relative h-[80px] rounded-[6px] border flex flex-col justify-between p-3 select-none transition-all duration-150 cursor-pointer bg-surface/80 hover:bg-[#1C1F28]"
                      style={{
                        borderColor: styles.borderColor,
                        backgroundColor: styles.backgroundColor
                      }}
                    >
                      {/* Top: Ticker name */}
                      <div className="font-brand font-medium text-[11px] text-[#E2E8F0] tracking-wider truncate flex justify-between items-center w-full">
                        <span>{ticker}</span>
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo" />
                      </div>

                      {/* Middle: Confidence */}
                      <div className="font-mono font-bold text-[18px] leading-none" style={{ color: styles.textColor }}>
                        {signal ? `${signal.confidence}%` : '–'}
                      </div>

                      {/* Bottom: Signal type and arrow */}
                      <div className="font-sans font-medium text-[9px] tracking-widest uppercase flex items-center gap-1 leading-none" style={{ color: styles.textColor }}>
                        <span>{signal ? getSignalArrow(signal.signalType) : '–'}</span>
                        <span>{signal ? signal.signalType : 'NO DATA'}</span>
                      </div>

                      {/* HOVER TOOLTIP CARD */}
                      {signal && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-[#1C1F28] border border-border-dark p-3 rounded-[6px] shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 space-y-1 text-left text-[11px] font-sans text-muted">
                          <div className="font-semibold text-frost mb-1 font-brand border-b border-border-dark/40 pb-1">{signal.ticker} Stats</div>
                          <div className="flex justify-between"><span>Entry:</span> <span className="font-mono text-frost">${signal.entry}</span></div>
                          <div className="flex justify-between"><span>Stop Loss:</span> <span className="font-mono text-sig-red">${signal.stopLoss}</span></div>
                          <div className="flex justify-between"><span>Target:</span> <span className="font-mono text-sig-green">${signal.target}</span></div>
                          <div className="flex justify-between"><span>R:R Ratio:</span> <span className="font-mono text-indigo">{signal.riskReward || '2.0'}</span></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
        </div>

      </main>
    </div>
  );
}
