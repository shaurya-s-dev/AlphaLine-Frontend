'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Star, Activity, ShieldAlert, Terminal } from 'lucide-react';

// Count-up helper component using requestAnimationFrame
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
  
  // Default dates: last 30 days
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
  
  const [from, setFrom] = useState(thirtyDaysAgoStr);
  const [to, setTo] = useState(todayStr);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any | null>(null);

  // Set page title on mount
  useEffect(() => {
    document.title = "Alphaline — Strategy Backtesting";
  }, []);

  const handleNavClick = (tabName: string) => {
    if (tabName === 'Dashboard') {
      router.push('/dashboard');
    } else if (tabName === 'Watchlist') {
      router.push('/dashboard?tab=Watchlist');
    } else if (tabName === 'Backtest') {
      router.push('/backtest');
    } else if (tabName === 'Risk') {
      router.push('/risk');
    } else if (tabName === 'API') {
      router.push('/api-docs');
    }
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
      
      // Enforce premium simulated computation delay of 1200ms
      const elapsed = Date.now() - startTime;
      const remaining = 1200 - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      if (data.success) {
        setResults(data);
      } else {
        setError(data.error || "Failed to load backtest data");
      }
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      const remaining = 1200 - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setError(err.message || "Failed to execute backtest query");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate dynamic equity curve paths from results signals
  const getEquityCurvePaths = () => {
    if (!results || !results.signals || results.signals.length === 0) {
      // Fallback premium curve path
      const line = "M 0 85 L 100 75 L 200 90 L 300 50 L 400 65 L 500 35 L 600 20";
      const fill = `${line} L 600 120 L 0 120 Z`;
      return { line, fill };
    }

    const trades = [...results.signals].reverse(); // cronological order
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

  // Mobile Bottom Nav items list
  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Watchlist', icon: <Star className="w-5 h-5" /> },
    { name: 'Backtest', icon: <Activity className="w-5 h-5" /> },
    { name: 'Risk', icon: <ShieldAlert className="w-5 h-5" /> },
    { name: 'API', icon: <Terminal className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-void text-frost flex flex-col font-sans">
      <Sidebar activeTab="Backtest" />

      <main className="flex-1 md:pl-[220px] p-6 pb-24 md:pb-6 max-w-5xl w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[20px] font-medium text-frost mb-1.5 font-sans leading-none">Strategy Backtesting</h1>
          <p className="text-[13px] text-muted font-sans font-normal leading-normal">
            Validate the accuracy and performance of confluence signals on historical records.
          </p>
        </div>

        {/* Backtest Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Panel: Query Inputs */}
          <div className="bg-surface border border-border-dark p-5 rounded-[6px] lg:col-span-1">
            <h3 className="text-[14px] font-medium text-frost mb-4 leading-none">Parameters</h3>
            
            <form onSubmit={handleRunBacktest} className="space-y-4">
              <div>
                <label className="block text-[11px] text-dim font-sans mb-1.5">Ticker Symbol</label>
                <input
                  type="text"
                  required
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder="e.g. RELIANCE.NS, AAPL"
                  className="w-full bg-raised border border-border-dark text-[13px] text-frost p-2 rounded-[6px] font-mono focus:outline-none focus:border-indigo uppercase placeholder:text-dim"
                />
              </div>

              <div>
                <label className="block text-[11px] text-dim font-sans mb-1.5">Start Date</label>
                <input
                  type="date"
                  required
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full bg-raised border border-border-dark text-[13px] text-frost p-2 rounded-[6px] font-sans focus:outline-none focus:border-indigo"
                />
              </div>

              <div>
                <label className="block text-[11px] text-dim font-sans mb-1.5">End Date</label>
                <input
                  type="date"
                  required
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full bg-raised border border-border-dark text-[13px] text-frost p-2 rounded-[6px] font-sans focus:outline-none focus:border-indigo"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo text-white text-[13px] font-medium py-2 rounded-[6px] hover:bg-[#5254DE] transition-colors duration-150 leading-none mt-2 disabled:opacity-50 flex items-center justify-center min-h-[36px]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="spinner" />
                    <span>Running...</span>
                  </div>
                ) : (
                  "Run backtest"
                )}
              </button>
            </form>
          </div>

          {/* Right Panel: Results View */}
          <div className="lg:col-span-2 space-y-6">
            {isLoading ? (
              /* Loading Skeleton state when running */
              <div className="border border-border-dark bg-surface p-6 rounded-[6px] space-y-6">
                <div className="h-[120px] bg-[#111318] border border-border-dark rounded-[6px] p-4 flex flex-col justify-center space-y-3 relative overflow-hidden">
                  <div className="h-3 bg-raised rounded-[6px] w-[55%] shimmer-line" />
                  <div className="h-3 bg-raised rounded-[6px] w-[75%] shimmer-line" />
                  <div className="h-3 bg-raised rounded-[6px] w-[40%] shimmer-line" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-surface border border-border-dark p-4 rounded-[6px] space-y-2 relative overflow-hidden">
                      <div className="h-3 bg-raised rounded-[6px] w-[45%] shimmer-line" />
                      <div className="h-8 bg-raised rounded-[6px] w-[70%] shimmer-line" />
                    </div>
                  ))}
                </div>
              </div>
            ) : error ? (
              /* Error Display */
              <div className="border border-sig-red/20 bg-sig-red/5 p-8 text-center rounded-[6px]">
                <p className="text-[13px] text-sig-red font-sans font-medium">{error}</p>
              </div>
            ) : results && curve ? (
              /* Backtesting Results (with fadeIn animation class) */
              <div className="space-y-6 animate-fade-in">
                
                {/* Stats Row with CountUp animation */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Accuracy Card */}
                  <div className="bg-surface border border-border-dark p-4 rounded-[6px]">
                    <div className="text-[12px] text-dim font-sans mb-1.5 font-normal leading-none">Signal accuracy</div>
                    <div className="text-[32px] font-mono font-medium text-frost leading-none">
                      <CountUp value={parseFloat(results.accuracy) || 0} decimalPlaces={0} suffix="%" />
                    </div>
                  </div>

                  {/* Win Rate Card */}
                  <div className="bg-surface border border-border-dark p-4 rounded-[6px]">
                    <div className="text-[12px] text-dim font-sans mb-1.5 font-normal leading-none">Win rate</div>
                    <div className="text-[32px] font-mono font-medium text-frost leading-none">
                      <CountUp value={parseFloat(results.winRate) || 0} decimalPlaces={0} suffix="%" />
                    </div>
                  </div>

                  {/* Avg RR Card */}
                  <div className="bg-surface border border-border-dark p-4 rounded-[6px]">
                    <div className="text-[12px] text-dim font-sans mb-1.5 font-normal leading-none">Avg R:R</div>
                    <div className="text-[32px] font-mono font-medium text-frost leading-none">
                      <CountUp value={parseFloat(results.avgRR) || 0} decimalPlaces={1} suffix="x" />
                    </div>
                  </div>
                </div>

                {/* Equity Curve SVG Chart */}
                <div className="bg-[#111318] border border-border-dark rounded-[6px] p-4 flex flex-col justify-between h-[180px] overflow-hidden">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-normal text-dim uppercase tracking-wider font-sans">Portfolio Equity Growth</span>
                    <span className="text-[11px] font-mono text-sig-green font-medium">+{((results.winRate * results.avgRR) - ((100 - results.winRate) * 0.5)).toFixed(1)}% Est. Gain</span>
                  </div>
                  
                  <div className="flex-1 relative w-full h-[120px]">
                    <svg viewBox="0 0 600 120" width="100%" height="100%" preserveAspectRatio="none" className="block">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25"/>
                          <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0"/>
                        </linearGradient>
                      </defs>
                      {/* Gradient Fill under path */}
                      <path 
                        d={curve.fill} 
                        fill="url(#chartGradient)" 
                        className="animate-fill" 
                      />
                      {/* Stroke Line */}
                      <path 
                        d={curve.line} 
                        fill="none" 
                        stroke="#6366F1" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-path" 
                      />
                    </svg>
                  </div>
                </div>

                {/* Signals Table */}
                <div className="bg-surface border border-border-dark rounded-[6px] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-void border-b border-border-dark">
                          <th className="p-3 text-[11px] font-normal text-dim uppercase tracking-wide font-sans">Date</th>
                          <th className="p-3 text-[11px] font-normal text-dim uppercase tracking-wide font-sans">Signal</th>
                          <th className="p-3 text-[11px] font-normal text-dim uppercase tracking-wide font-sans text-right">Entry</th>
                          <th className="p-3 text-[11px] font-normal text-dim uppercase tracking-wide font-sans text-right">Exit</th>
                          <th className="p-3 text-[11px] font-normal text-dim uppercase tracking-wide font-sans text-center">Result</th>
                          <th className="p-3 text-[11px] font-normal text-dim uppercase tracking-wide font-sans text-right">P&L%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E2230]/50 font-sans text-[13px] text-frost">
                        {results.signals.map((trade: any, idx: number) => (
                          <tr
                            key={trade.id || idx}
                            className={`transition-colors duration-150 hover:bg-raised ${
                              idx % 2 === 0 ? 'bg-transparent' : 'bg-void'
                            }`}
                          >
                            <td className="p-3 font-normal whitespace-nowrap">{trade.date}</td>
                            <td className="p-3 font-medium whitespace-nowrap">
                              <span className={trade.signal === 'BUY' ? 'text-sig-green' : 'text-sig-red'}>
                                {trade.signal}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-right whitespace-nowrap">{trade.entry.toFixed(2)}</td>
                            <td className="p-3 font-mono text-right whitespace-nowrap">{trade.exit.toFixed(2)}</td>
                            <td className="p-3 font-medium text-center whitespace-nowrap">
                              <span className={trade.result === 'WIN' ? 'text-sig-green' : 'text-sig-red'}>
                                {trade.result}
                              </span>
                            </td>
                            <td className={`p-3 font-mono text-right whitespace-nowrap ${
                              trade.pnl > 0 ? 'text-sig-green' : 'text-sig-red'
                            }`}>
                              {trade.pnl > 0 ? `+${trade.pnl.toFixed(2)}` : `${trade.pnl.toFixed(2)}`}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              /* Initial Empty state: Premium chart shimmer skeleton + side-by-side card skeletons */
              <div className="border border-border-dark bg-surface p-6 rounded-[6px] space-y-6">
                {/* Skeleton Chart */}
                <div className="h-[120px] bg-[#111318] border border-border-dark rounded-[6px] p-4 flex flex-col justify-center space-y-3 relative overflow-hidden">
                  <div className="h-3 bg-raised rounded-[6px] w-[45%] shimmer-line" />
                  <div className="h-3 bg-raised rounded-[6px] w-[70%] shimmer-line" />
                  <div className="h-3 bg-raised rounded-[6px] w-[30%] shimmer-line" />
                </div>
                
                {/* Skeletons Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-surface border border-border-dark p-4 rounded-[6px] space-y-2 relative overflow-hidden">
                      <div className="h-3 bg-raised rounded-[6px] w-[50%] shimmer-line" />
                      <div className="h-8 bg-raised rounded-[6px] w-[75%] shimmer-line" />
                    </div>
                  ))}
                </div>

                {/* Guiding Helper Text */}
                <div className="text-center pt-2">
                  <h3 className="text-[14px] font-medium text-frost mb-1 font-sans">Ready to Analyze</h3>
                  <p className="text-[12px] text-muted max-w-xs mx-auto font-sans leading-normal">
                    Configure a ticker and date range in the parameter panel to compute strategy performance metrics.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Signal Accuracy Section */}
        <div className="mt-8 pt-8 border-t border-border-dark/60 select-none">
          <div className="flex flex-col sm:flex-row justify-between sm:items-start md:items-center gap-4 mb-5">
            <div>
              <h2 className="text-[15px] font-brand font-semibold text-frost uppercase tracking-wider">
                Signal Accuracy Tracker
              </h2>
              <p className="text-[12px] text-muted font-sans mt-0.5">
                Historical win-rate performance breakdown across major tickers.
              </p>
            </div>
            {/* Accuracy Summary */}
            <div className="font-sans font-normal text-[13px] text-[#6B7280]">
              Avg accuracy 74% &middot; Best: NVDA 82% &middot; Most signals: AAPL (15)
            </div>
          </div>

          <div className="bg-surface border border-border-dark rounded-[6px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-void border-b border-border-dark text-[11px] font-normal text-dim uppercase tracking-wide font-sans">
                    <th className="p-3">Ticker</th>
                    <th className="p-3 text-center">Total Signals</th>
                    <th className="p-3 text-right">BUY Acc%</th>
                    <th className="p-3 text-right">SELL Acc%</th>
                    <th className="p-3 text-right">Overall</th>
                    <th className="p-3 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2230]/40 font-sans text-[13px] text-frost">
                  {[
                    { ticker: 'RELIANCE.NS', total: 12, buyAcc: '75%', sellAcc: '68%', overall: 72, grade: 'B+' },
                    { ticker: 'TCS.NS', total: 8, buyAcc: '80%', sellAcc: '72%', overall: 76, grade: 'A-' },
                    { ticker: 'AAPL', total: 15, buyAcc: '82%', sellAcc: '70%', overall: 77, grade: 'A-' },
                    { ticker: 'NVDA', total: 11, buyAcc: '88%', sellAcc: '75%', overall: 82, grade: 'A' },
                    { ticker: 'INFY.NS', total: 9, buyAcc: '71%', sellAcc: '65%', overall: 68, grade: 'B' },
                    { ticker: 'MSFT', total: 14, buyAcc: '85%', sellAcc: '78%', overall: 81, grade: 'A' },
                    { ticker: 'GOOGL', total: 10, buyAcc: '80%', sellAcc: '70%', overall: 75, grade: 'B+' },
                    { ticker: 'TSLA', total: 18, buyAcc: '72%', sellAcc: '60%', overall: 66, grade: 'B-' },
                    { ticker: 'HDFCBANK.NS', total: 13, buyAcc: '77%', sellAcc: '69%', overall: 73, grade: 'B+' },
                    { ticker: 'WIPRO.NS', total: 7, buyAcc: '70%', sellAcc: '62%', overall: 65, grade: 'C+' },
                  ].map((row, idx) => {
                    const getGradeColor = (g: string) => {
                      if (g.startsWith('A')) {
                        if (g === 'A-') return '#6366F1';
                        return '#22C55E';
                      }
                      if (g.startsWith('B')) {
                        if (g === 'B+') return '#6366F1';
                        return '#F59E0B';
                      }
                      return '#EF4444';
                    };
                    const color = getGradeColor(row.grade);

                    return (
                      <tr 
                        key={row.ticker}
                        className={`transition-colors duration-100 hover:bg-raised ${
                          idx % 2 === 0 ? 'bg-transparent' : 'bg-void/30'
                        }`}
                      >
                        <td className="p-3 font-brand font-medium">{row.ticker}</td>
                        <td className="p-3 text-center font-mono">{row.total}</td>
                        <td className="p-3 text-right font-mono">{row.buyAcc}</td>
                        <td className="p-3 text-right font-mono">{row.sellAcc}</td>
                        <td className="p-3 text-right whitespace-nowrap min-w-[120px]">
                          <div className="flex flex-col gap-1 items-end justify-center">
                            <span className="font-mono">{row.overall}%</span>
                            <div className="w-16 h-1 bg-raised rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500" 
                                style={{ width: `${row.overall}%`, backgroundColor: color }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center font-semibold">
                          <span style={{ color: color }}>{row.grade}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 border-t border-border-dark bg-surface flex justify-around items-center md:hidden z-20">
        {navItems.map((item) => {
          const isActive = item.name === 'Backtest';
          return (
            <button
              key={item.name}
              onClick={() => handleNavClick(item.name)}
              className={`flex flex-col items-center justify-center w-12 h-full transition-colors duration-150 ${
                isActive ? 'text-indigo' : 'text-muted hover:text-frost'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-sans mt-0.5 font-medium">{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Global CSS keyframes for custom animations */}
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinner {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid #1E2230;
          border-top-color: #6366F1;
          animation: spin 700ms linear infinite;
        }

        @keyframes shimmer {
          from { background-position: -200% 0; }
          to { background-position: 200% 0; }
        }
        .shimmer-line {
          background: linear-gradient(90deg, #1C1F28 25%, #252836 50%, #1C1F28 75%);
          background-size: 200% auto;
          animation: shimmer 1.5s infinite linear;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 400ms ease-out forwards;
        }

        @keyframes drawPath {
          to { stroke-dashoffset: 0; }
        }
        .animate-path {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawPath 1200ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes fadeInFill {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fill {
          animation: fadeInFill 800ms ease-out forwards;
          animation-delay: 400ms;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
