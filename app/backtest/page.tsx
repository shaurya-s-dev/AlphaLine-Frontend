'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';

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

    try {
      const response = await fetch(`/api/backtest?ticker=${ticker}&from=${from}&to=${to}`);
      if (!response.ok) {
        throw new Error("Failed to execute backtest query");
      }
      const data = await response.json();
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

  // Mobile Bottom Nav items list
  const navItems = [
    { name: 'Dashboard', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
      </svg>
    )},
    { name: 'Watchlist', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.237.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    )},
    { name: 'Backtest', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )},
    { name: 'Risk', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )},
    { name: 'API', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )},
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
                className="w-full bg-indigo text-white text-[13px] font-medium py-2 rounded-[6px] hover:bg-[#5254DE] transition-colors duration-150 leading-none mt-2 disabled:opacity-50"
              >
                {isLoading ? "Running..." : "Run backtest"}
              </button>
            </form>
          </div>

          {/* Right Panel: Results View */}
          <div className="lg:col-span-2 space-y-6">
            {isLoading ? (
              /* Loading Indicator */
              <div className="border border-border-dark bg-surface p-12 text-center rounded-[6px] animate-pulse">
                <div className="h-6 w-32 bg-raised rounded-[6px] mx-auto mb-4" />
                <div className="h-4 w-48 bg-raised rounded-[6px] mx-auto" />
              </div>
            ) : error ? (
              /* Error Display */
              <div className="border border-sig-red/20 bg-sig-red/5 p-8 text-center rounded-[6px]">
                <p className="text-[13px] text-sig-red font-sans font-medium">{error}</p>
              </div>
            ) : results ? (
              /* Backtesting Results */
              <div className="space-y-6">
                
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Accuracy Card */}
                  <div className="bg-surface border border-border-dark p-4 rounded-[6px]">
                    <div className="text-[12px] text-dim font-sans mb-1.5 font-normal leading-none">Signal accuracy</div>
                    <div className="text-[32px] font-mono font-medium text-frost leading-none">
                      {results.accuracy}%
                    </div>
                  </div>

                  {/* Win Rate Card */}
                  <div className="bg-surface border border-border-dark p-4 rounded-[6px]">
                    <div className="text-[12px] text-dim font-sans mb-1.5 font-normal leading-none">Win rate</div>
                    <div className="text-[32px] font-mono font-medium text-frost leading-none">
                      {results.winRate}%
                    </div>
                  </div>

                  {/* Avg RR Card */}
                  <div className="bg-surface border border-border-dark p-4 rounded-[6px]">
                    <div className="text-[12px] text-dim font-sans mb-1.5 font-normal leading-none">Avg R:R</div>
                    <div className="text-[32px] font-mono font-medium text-frost leading-none">
                      {results.avgRR}x
                    </div>
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
              /* Initial Empty State */
              <div className="border border-border-dark bg-surface p-12 text-center rounded-[6px] flex flex-col items-center justify-center min-h-[220px]">
                <svg className="w-8 h-8 text-dim mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-[14px] font-medium text-frost mb-1 leading-none">Ready to Analyze</h3>
                <p className="text-[12px] text-muted max-w-xs mx-auto leading-normal">
                  Configure a ticker and date range in the parameter panel to compute strategy performance metrics.
                </p>
              </div>
            )}
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
    </div>
  );
}
