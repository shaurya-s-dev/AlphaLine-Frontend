'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { useRouter } from 'next/navigation';
import { Activity, Play, TrendingUp, Award, Calendar, BarChart2, List } from 'lucide-react';
import { toast } from 'sonner';

// Count-up helper component
function CountUp({ 
  value, 
  duration = 800, 
  decimalPlaces = 0, 
  suffix = '' 
}: { 
  value: number; 
  duration?: number; 
  decimalPlaces?: number; 
  suffix?: string; 
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCurrent(progress * value);
      
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  return <span className="font-mono">{current.toFixed(decimalPlaces)}{suffix}</span>;
}

export default function BacktestPage() {
  const router = useRouter();
  const [ticker, setTicker] = useState('RELIANCE.NS');
  
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
  
  const [from, setFrom] = useState(thirtyDaysAgoStr);
  const [to, setTo] = useState(todayStr);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any | null>(null);
  
  // Results view sub-tab
  const [activeTab, setActiveTab] = useState<'chart' | 'trades'>('chart');
  const [activePreset, setActivePreset] = useState('1M');

  useEffect(() => {
    document.title = "Alphaline — Strategy Backtesting";
  }, []);

  // Quick Ticker handler
  const handleQuickTicker = (sym: string) => {
    setTicker(sym);
    toast.success(`Ticker set to ${sym}`);
  };

  // Date Presets handler
  const handlePreset = (preset: string) => {
    setActivePreset(preset);
    const end = new Date();
    let start = new Date();

    if (preset === '7D') start.setDate(end.getDate() - 7);
    else if (preset === '1M') start.setDate(end.getDate() - 30);
    else if (preset === '3M') start.setDate(end.getDate() - 90);
    else if (preset === '6M') start.setDate(end.getDate() - 180);
    else if (preset === '1Y') start.setDate(end.getDate() - 365);

    setFrom(start.toISOString().split('T')[0]);
    setTo(end.toISOString().split('T')[0]);
    toast.success(`Date range set to last ${preset}`);
  };

  const handleRunBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResults(null);

    const startTime = Date.now();

    try {
      const response = await fetch(`/api/backtest?ticker=${ticker}&from=${from}&to=${to}`);
      if (!response.ok) {
        throw new Error("Failed to execute backtest query");
      }
      const data = await response.json();
      
      const elapsed = Date.now() - startTime;
      const remaining = 1000 - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      if (data.success) {
        setResults(data);
      } else {
        setError(data.error || "Failed to load backtest data");
      }
    } catch (err: any) {
      setError(err.message || "Failed to execute backtest query");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate SVG Equity curves
  const getEquityCurvePaths = () => {
    if (!results || !results.signals || results.signals.length === 0) {
      const line = "M 0 85 L 100 75 L 200 90 L 300 50 L 400 65 L 500 35 L 600 20";
      const fill = `${line} L 600 120 L 0 120 Z`;
      return { line, fill };
    }

    const trades = [...results.signals].reverse();
    let cumulative = 100;
    const equityValues = [cumulative];
    
    trades.forEach((trade: any) => {
      cumulative += trade.pnl;
      equityValues.push(cumulative);
    });

    const min = Math.min(...equityValues);
    const max = Math.max(...equityValues);
    const range = (max - min) || 1;

    const width = 600;
    const height = 120;
    const padding = 15;
    const graphHeight = height - padding * 2;

    const points = equityValues.map((val, idx) => {
      const x = (idx / (equityValues.length - 1)) * width;
      const y = height - padding - ((val - min) / range) * graphHeight;
      return { x, y };
    });

    const linePath = points.map((p, idx) => 
      `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    ).join(' ');

    const fillPath = `${linePath} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`;

    return { line: linePath, fill: fillPath };
  };

  const curve = results ? getEquityCurvePaths() : null;

  // Signal Strategy Performance logic
  const getStrategyBadge = (winRate: number) => {
    if (winRate > 70) {
      return { label: "Strong Strategy ✓", styles: "bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]" };
    }
    if (winRate >= 50) {
      return { label: "Moderate Strategy", styles: "bg-[#F59E0B]/15 border-[#F59E0B]/30 text-[#F59E0B]" };
    }
    return { label: "Weak Strategy", styles: "bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]" };
  };

  return (
    <div className="min-h-screen bg-void text-frost flex flex-col font-sans">
      <Sidebar activeTab="Backtest" />
      <AnimatedBackground />

      <main className="flex-1 md:pl-[220px] p-6 pb-24 md:pb-6 max-w-5xl w-full mx-auto relative z-10">
        
        {/* Header */}
        <div className="mb-6 select-none">
          <h1 className="text-[20px] font-medium text-frost mb-1.5 font-sans leading-none">Strategy Backtesting</h1>
          <p className="text-[13px] text-muted font-sans font-normal leading-normal">
            Test how our AI signals would have performed on historical price data. Enter a ticker and date range to see simulated trade outcomes.
          </p>
        </div>

        {/* Backtest Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Column Parameters */}
          <div className="bg-[#111318]/50 border border-border-dark p-5 rounded-[12px] lg:col-span-1 space-y-4">
            <h3 className="text-[14px] font-brand font-semibold text-frost uppercase tracking-wider">Parameters</h3>
            
            <form onSubmit={handleRunBacktest} className="space-y-4">
              {/* Ticker Input */}
              <div className="space-y-2">
                <label className="block text-[11px] text-muted font-sans uppercase tracking-wider">Ticker Symbol</label>
                <input
                  type="text"
                  required
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder="e.g. RELIANCE.NS, AAPL"
                  className="w-full bg-void border border-border-dark text-[13px] text-frost p-2 rounded-[6px] font-mono focus:outline-none focus:border-indigo uppercase placeholder:text-dim"
                />
                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1 select-none">
                  {["RELIANCE.NS", "TCS.NS", "AAPL", "NVDA", "MSFT"].map((sym) => (
                    <button
                      type="button"
                      key={sym}
                      onClick={() => handleQuickTicker(sym)}
                      className="bg-[#1C1F28] border border-[#1E2230] hover:border-indigo/50 text-[#6B7280] hover:text-frost px-2 py-0.5 rounded text-[10px] font-mono transition-colors"
                    >
                      {sym.replace('.NS', '')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date */}
              <div className="space-y-1">
                <label className="block text-[11px] text-muted font-sans uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  required
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full bg-void border border-border-dark text-[13px] text-frost p-2 rounded-[6px] font-sans focus:outline-none focus:border-indigo"
                />
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <label className="block text-[11px] text-muted font-sans uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  required
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full bg-void border border-border-dark text-[13px] text-frost p-2 rounded-[6px] font-sans focus:outline-none focus:border-indigo"
                />
              </div>

              {/* Date Presets */}
              <div className="space-y-2 select-none">
                <label className="block text-[11px] text-muted font-sans uppercase tracking-wider">Preset Range</label>
                <div className="flex gap-1 bg-void p-1 rounded-[6px] border border-border-dark">
                  {['7D', '1M', '3M', '6M', '1Y'].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => handlePreset(preset)}
                      className={`flex-1 py-1 rounded text-[11px] font-sans font-medium transition-all ${
                        activePreset === preset ? 'bg-[#6366F1] text-white' : 'text-muted hover:text-frost'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#6366F1] hover:bg-[#8183F4] text-white text-[13px] font-medium py-2 rounded-[6px] transition-colors leading-none disabled:opacity-50 flex items-center justify-center min-h-[38px] shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Executing Strategy...</span>
                  </div>
                ) : (
                  <span className="flex items-center gap-1"><Play className="w-3.5 h-3.5 fill-current" /> Run Backtest</span>
                )}
              </button>
            </form>
          </div>

          {/* Right Column Results */}
          <div className="lg:col-span-2 space-y-6">
            {isLoading ? (
              <div className="border border-border-dark bg-surface/50 p-6 rounded-[12px] space-y-6">
                <div className="h-[120px] bg-[#111318]/50 border border-border-dark rounded-[6px] p-4 flex flex-col justify-center space-y-3 relative overflow-hidden animate-pulse" />
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-[#111318]/50 border border-border-dark rounded-[6px] animate-pulse" />
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="border border-sig-red/20 bg-sig-red/5 p-8 text-center rounded-[12px]">
                <p className="text-[13px] text-sig-red font-sans font-medium">{error}</p>
              </div>
            ) : results && curve ? (
              <div className="space-y-6 animate-slide-in">
                
                {/* Accuracy cards and win rates */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#111318]/50 border border-border-dark p-4 rounded-[12px] flex flex-col justify-between">
                    <span className="text-[11px] text-muted font-sans uppercase tracking-wider block mb-1">accuracy</span>
                    <span className="text-[28px] font-mono font-bold text-frost">
                      <CountUp value={parseFloat(results.accuracy) || 0} suffix="%" />
                    </span>
                  </div>

                  <div className="bg-[#111318]/50 border border-border-dark p-4 rounded-[12px] flex flex-col justify-between">
                    <span className="text-[11px] text-muted font-sans uppercase tracking-wider block mb-1">win rate</span>
                    <span className="text-[28px] font-mono font-bold text-frost">
                      <CountUp value={parseFloat(results.winRate) || 0} suffix="%" />
                    </span>
                  </div>

                  <div className="bg-[#111318]/50 border border-border-dark p-4 rounded-[12px] flex flex-col justify-between">
                    <span className="text-[11px] text-muted font-sans uppercase tracking-wider block mb-1">avg r:r</span>
                    <span className="text-[28px] font-mono font-bold text-frost">
                      <CountUp value={parseFloat(results.avgRR) || 0} decimalPlaces={1} suffix="x" />
                    </span>
                  </div>
                </div>

                {/* Strategy Rating Badge */}
                {results.winRate && (
                  <div className={`p-3 rounded-[8px] border text-center text-[12px] font-sans font-semibold flex items-center justify-center gap-1.5 ${getStrategyBadge(results.winRate).styles}`}>
                    <Award className="w-4 h-4" /> {getStrategyBadge(results.winRate).label}
                  </div>
                )}

                {/* Tab Switcher */}
                <div className="flex border-b border-border-dark select-none">
                  <button
                    onClick={() => setActiveTab('chart')}
                    className={`pb-2 px-4 text-[13px] font-medium font-sans border-b-2 transition-colors flex items-center gap-1.5 ${
                      activeTab === 'chart' ? 'border-[#6366F1] text-indigo' : 'border-transparent text-muted hover:text-frost'
                    }`}
                  >
                    <BarChart2 className="w-4 h-4" /> Equity Curve
                  </button>
                  <button
                    onClick={() => setActiveTab('trades')}
                    className={`pb-2 px-4 text-[13px] font-medium font-sans border-b-2 transition-colors flex items-center gap-1.5 ${
                      activeTab === 'trades' ? 'border-[#6366F1] text-indigo' : 'border-transparent text-muted hover:text-frost'
                    }`}
                  >
                    <List className="w-4 h-4" /> Trade Log ({results.signals.length})
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'chart' ? (
                  <div className="bg-[#111318]/50 border border-border-dark rounded-[12px] p-4 flex flex-col justify-between h-[200px] overflow-hidden">
                    <div className="flex justify-between items-center mb-2 select-none">
                      <span className="text-[10px] font-medium text-muted uppercase tracking-wider font-sans">Portfolio Equity Growth</span>
                      <span className="text-[11px] font-mono text-sig-green font-medium">+{((results.winRate * results.avgRR) - ((100 - results.winRate) * 0.5)).toFixed(1)}% Est. Gain</span>
                    </div>
                    
                    <div className="flex-1 relative w-full h-[120px]">
                      <svg viewBox="0 0 600 120" width="100%" height="100%" preserveAspectRatio="none" className="block">
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.2"/>
                            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0"/>
                          </linearGradient>
                        </defs>
                        <path d={curve.fill} fill="url(#chartGradient)" />
                        <path d={curve.line} fill="none" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface/30 border border-border-dark rounded-[12px] overflow-hidden">
                    <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-void border-b border-border-dark select-none">
                            <th className="p-3 text-[10px] font-normal text-muted uppercase tracking-wider font-sans">Date</th>
                            <th className="p-3 text-[10px] font-normal text-muted uppercase tracking-wider font-sans">Signal</th>
                            <th className="p-3 text-[10px] font-normal text-muted uppercase tracking-wider font-sans text-right">Entry</th>
                            <th className="p-3 text-[10px] font-normal text-muted uppercase tracking-wider font-sans text-right">Exit</th>
                            <th className="p-3 text-[10px] font-normal text-muted uppercase tracking-wider font-sans text-center">Result</th>
                            <th className="p-3 text-[10px] font-normal text-muted uppercase tracking-wider font-sans text-right">P&L%</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E2230]/40 font-sans text-[12px] text-[#E2E8F0]">
                          {results.signals.map((trade: any, idx: number) => (
                            <tr key={trade.id || idx} className={`hover:bg-[#1C1F28]/30 ${idx % 2 === 0 ? 'bg-transparent' : 'bg-void/40'}`}>
                              <td className="p-3 whitespace-nowrap">{trade.date}</td>
                              <td className="p-3 whitespace-nowrap font-medium">
                                <span className={trade.signal === 'BUY' ? 'text-[#22C55E]' : 'text-[#EF4444]'}>{trade.signal}</span>
                              </td>
                              <td className="p-3 font-mono text-right whitespace-nowrap">{trade.entry.toFixed(2)}</td>
                              <td className="p-3 font-mono text-right whitespace-nowrap">{trade.exit.toFixed(2)}</td>
                              <td className="p-3 text-center whitespace-nowrap font-medium">
                                <span className={trade.result === 'WIN' ? 'text-[#22C55E]' : 'text-[#EF4444]'}>{trade.result}</span>
                              </td>
                              <td className={`p-3 font-mono text-right whitespace-nowrap ${trade.pnl > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                                {trade.pnl > 0 ? `+${trade.pnl.toFixed(2)}` : `${trade.pnl.toFixed(2)}`}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              // Empty/Default Shimmer Skeleton
              <div className="border border-border-dark bg-[#111318]/50 p-6 rounded-[12px] space-y-6 select-none">
                <div className="h-[120px] bg-[#111318] border border-border-dark rounded-[6px] p-4 flex flex-col justify-center space-y-3 relative overflow-hidden">
                  <div className="h-3 bg-raised rounded-[6px] w-[45%]" />
                  <div className="h-3 bg-raised rounded-[6px] w-[70%]" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-[#111318] border border-border-dark rounded-[6px]" />
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
