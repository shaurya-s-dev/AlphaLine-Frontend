'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';

export default function RiskPage() {
  const router = useRouter();
  
  // State for user inputs
  const [portfolioSize, setPortfolioSize] = useState<string>('50000');
  const [currencySymbol, setCurrencySymbol] = useState<'₹' | '$'>('₹');
  const [riskPercent, setRiskPercent] = useState<number>(2.0);
  
  // State for signals data
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fallback mock signals if API is empty or offline
  const fallbackMockSignals = [
    { id: 'mock_1', ticker: 'RELIANCE.NS', market: 'NSE', signalType: 'BUY', confidence: 81, entry: 2847.50, stopLoss: 2790.00, target: 2960.00 },
    { id: 'mock_2', ticker: 'AAPL', market: 'US', signalType: 'BUY', confidence: 85, entry: 189.20, stopLoss: 185.00, target: 198.00 },
    { id: 'mock_3', ticker: 'TCS.NS', market: 'NSE', signalType: 'SELL', confidence: 74, entry: 3850.00, stopLoss: 3920.00, target: 3710.00 },
    { id: 'mock_4', ticker: 'TSLA', market: 'US', signalType: 'BUY', confidence: 68, entry: 175.50, stopLoss: 168.00, target: 192.00 },
    { id: 'mock_5', ticker: 'INFY.NS', market: 'NSE', signalType: 'SELL', confidence: 65, entry: 1420.00, stopLoss: 1450.00, target: 1360.00 }
  ];

  // Fetch signals on mount
  useEffect(() => {
    const fetchSignals = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/signals?market=All');
        if (!response.ok) {
          throw new Error('API failed');
        }
        
        const data = await response.json();
        if (data.success && data.signals && data.signals.length > 0) {
          // Filter to only include active BUY or SELL signals
          const activeSetups = data.signals.filter((s: any) => 
            s.signalType === 'BUY' || s.signalType === 'SELL'
          );
          setSignals(activeSetups);
        } else {
          // Fall back to mock setups for rendering if DB is empty
          const mockSetups = fallbackMockSignals.filter((s: any) => 
            s.signalType === 'BUY' || s.signalType === 'SELL'
          );
          setSignals(mockSetups);
        }
      } catch (err: any) {
        console.warn('Using fallback mock data for risk panel:', err);
        // Safely use fallbacks on network error
        setSignals(fallbackMockSignals);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSignals();
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

  // Perform Calculations client-side in React
  const parsedPortfolio = parseFloat(portfolioSize) || 0;
  const rawRiskVal = parsedPortfolio * (riskPercent / 100);

  // Map each signal to its computed risk metrics
  const computedSignals = signals.map((sig) => {
    const entry = sig.entry || 0;
    const stopLoss = sig.stopLoss || 0;
    const target = sig.target || 0;
    
    // Suggested position size is portfolio * risk%
    const suggestedPosSize = rawRiskVal;
    
    // Number of shares: position size / entry price
    const shares = entry > 0 ? suggestedPosSize / entry : 0;
    
    // Max loss: shares * entry-to-stopLoss difference
    const stopDistance = Math.abs(entry - stopLoss);
    const maxLossCurrency = shares * stopDistance;
    const maxLossPercent = entry > 0 ? (stopDistance / entry) * 100 : 0;
    
    // Risk to Reward ratio
    const rewardDistance = Math.abs(target - entry);
    const riskRewardRatio = stopDistance > 0 ? rewardDistance / stopDistance : 0;

    return {
      ...sig,
      suggestedPosSize,
      shares,
      maxLossCurrency,
      maxLossPercent,
      riskRewardRatio
    };
  });

  // Exposure metrics
  const totalCapitalAtRisk = computedSignals.reduce((acc, sig) => acc + sig.maxLossCurrency, 0);
  const totalCapitalAtRiskPercent = parsedPortfolio > 0 ? (totalCapitalAtRisk / parsedPortfolio) * 100 : 0;

  // Determine warning/danger color
  let exposureColorClass = 'text-sig-green';
  let exposureLabel = 'Safe Exposure';
  if (totalCapitalAtRiskPercent > 20) {
    exposureColorClass = 'text-[#EF4444]'; // Danger red
    exposureLabel = 'DANGER EXPOSURE';
  } else if (totalCapitalAtRiskPercent > 10) {
    exposureColorClass = 'text-[#F59E0B]'; // Warning amber
    exposureLabel = 'WARNING EXPOSURE';
  }

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
      {/* Desktop Sidebar */}
      <Sidebar activeTab="Risk" />

      {/* Main Content Area */}
      <main className="flex-1 md:pl-[220px] p-6 pb-28 md:pb-6 max-w-5xl w-full mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[20px] font-medium text-frost mb-1.5 font-sans leading-none">Risk Management</h1>
          <p className="text-[13px] text-muted font-sans font-normal leading-normal">
            Compute precise position sizes, allocations, and stop-loss impact variables.
          </p>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Panel: Inputs */}
          <div className="bg-surface border border-border-dark p-5 rounded-[6px] lg:col-span-1 space-y-5">
            <h3 className="text-[14px] font-medium text-frost mb-3 leading-none">Parameters</h3>
            
            {/* Portfolio Size Input & Toggle */}
            <div className="space-y-2">
              <label className="block text-[11px] text-dim font-sans uppercase tracking-wider font-semibold">
                Portfolio Size
              </label>
              
              <div className="flex gap-2">
                {/* Number Input */}
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-mono text-[13px]">
                    {currencySymbol}
                  </span>
                  <input
                    type="text"
                    value={portfolioSize}
                    onChange={(e) => {
                      // Allow only digits
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setPortfolioSize(val);
                    }}
                    className="w-full bg-raised border border-border-dark text-[13px] text-frost p-2 pl-7 rounded-[6px] font-mono focus:outline-none focus:border-indigo"
                  />
                </div>
                
                {/* Currency Toggle Buttons */}
                <div className="flex border border-border-dark rounded-[6px] overflow-hidden">
                  {(['₹', '$'] as const).map((sym) => (
                    <button
                      key={sym}
                      onClick={() => setCurrencySymbol(sym)}
                      className={`px-3 text-[13px] font-mono font-medium transition-colors duration-150 ${
                        currencySymbol === sym
                          ? 'bg-indigo text-white'
                          : 'bg-surface text-muted hover:text-frost'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk Per Trade Slider */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-[11px] text-dim font-sans uppercase tracking-wider font-semibold">
                <span>Risk Per Trade</span>
                <span className="font-mono text-frost text-[12px] font-normal tracking-normal lowercase">
                  {riskPercent.toFixed(1)}%
                </span>
              </div>
              
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.5"
                value={riskPercent}
                onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
                className="w-full h-1 bg-raised rounded-[6px] appearance-none cursor-pointer accent-indigo"
                style={{ WebkitAppearance: 'none' }}
              />
              
              <div className="flex justify-between text-[9px] text-muted font-mono leading-none">
                <span>1.0%</span>
                <span>3.0%</span>
                <span>5.0%</span>
              </div>
            </div>

            {/* Formula Context Note */}
            <div className="bg-void border border-border-dark p-3 rounded-[6px] text-[11px] text-muted leading-relaxed">
              <span className="text-frost font-medium">Calculation Rule:</span>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Alloc. = Portfolio &times; Risk%</li>
                <li>Shares = Alloc. / Entry Price</li>
                <li>Max Loss = Shares &times; distance to Stop-Loss</li>
              </ul>
            </div>
          </div>

          {/* Right Panel: Risk Rows Grid */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface border border-border-dark rounded-[6px] overflow-hidden">
              <div className="border-b border-border-dark p-3.5 bg-[#131720]">
                <h3 className="text-[12px] font-semibold text-frost font-sans uppercase tracking-wider">
                  Active Setup Sizing Grid
                </h3>
              </div>

              {isLoading ? (
                /* Loading Skeleton */
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-14 bg-raised animate-pulse rounded-[6px]" />
                  ))}
                </div>
              ) : error ? (
                <div className="p-8 text-center text-[13px] text-sig-red">
                  Failed to fetch live signals. Check back later.
                </div>
              ) : computedSignals.length > 0 ? (
                /* Risk Rows Table/List */
                <div className="divide-y divide-[#1E2230]/50">
                  {computedSignals.map((sig, idx) => (
                    <div
                      key={sig.id || idx}
                      className={`p-4 transition-colors duration-150 hover:bg-raised flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        idx % 2 === 0 ? 'bg-transparent' : 'bg-void/40'
                      }`}
                    >
                      {/* Left: Ticker & Signal Badge */}
                      <div className="flex items-center gap-3 min-w-[120px]">
                        <span className="font-semibold text-[14px] text-frost font-sans">
                          {sig.ticker}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 font-bold rounded-[4px] border ${
                          sig.signalType === 'BUY'
                            ? 'border-sig-green/20 text-sig-green bg-sig-green/5'
                            : 'border-sig-red/20 text-sig-red bg-sig-red/5'
                        }`}>
                          {sig.signalType}
                        </span>
                      </div>

                      {/* Middle Grid of Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                        {/* Entry Price */}
                        <div>
                          <span className="block text-[10px] text-dim font-sans uppercase">Entry</span>
                          <span className="text-[13px] font-mono font-medium text-frost">
                            {currencySymbol}{sig.entry.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Position size suggested */}
                        <div>
                          <span className="block text-[10px] text-dim font-sans uppercase">Suggested Size</span>
                          <span className="text-[13px] font-mono font-medium text-frost">
                            {currencySymbol}{sig.suggestedPosSize.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </span>
                        </div>

                        {/* Shares to buy */}
                        <div>
                          <span className="block text-[10px] text-dim font-sans uppercase">Shares</span>
                          <span className="text-[13px] font-mono font-medium text-indigo">
                            {sig.shares.toFixed(2)}
                          </span>
                        </div>

                        {/* Risk reward */}
                        <div>
                          <span className="block text-[10px] text-dim font-sans uppercase">R:R Ratio</span>
                          <span className="text-[13px] font-mono font-medium text-frost">
                            {sig.riskRewardRatio.toFixed(1)}x
                          </span>
                        </div>
                      </div>

                      {/* Right: Max Loss */}
                      <div className="text-right min-w-[120px] bg-raised/40 p-2 border border-border-dark/60 rounded-[6px]">
                        <span className="block text-[9px] text-muted font-sans uppercase tracking-wider">Max Loss</span>
                        <span className="text-[13px] font-mono font-semibold text-sig-red">
                          -{currencySymbol}{sig.maxLossCurrency.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="block text-[10px] text-muted font-mono">
                          ({sig.maxLossPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-[13px] text-muted">
                  No active trade setups to size.
                </div>
              )}
            </div>

            {/* Bottom: Total Exposure Panel */}
            <div className="bg-surface border border-border-dark p-5 rounded-[6px] flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[4px] border border-border-dark bg-[#131720] ${exposureColorClass}`}>
                    {exposureLabel}
                  </span>
                </div>
                <h3 className="text-[14px] font-semibold text-frost font-sans">
                  Acting on all signals simultaneously
                </h3>
                <p className="text-[12px] text-muted max-w-md">
                  Calculates aggregate drawdown exposure assuming all stop-losses are hit in consecutive sessions. Keep exposure under 10%.
                </p>
              </div>

              <div className="text-right min-w-[180px] bg-[#131720] border border-border-dark p-4 rounded-[6px]">
                <span className="block text-[10px] text-muted uppercase font-semibold tracking-wider font-sans">
                  Combined Capital Risk
                </span>
                <span className={`text-[24px] font-mono font-bold leading-tight block ${exposureColorClass}`}>
                  {currencySymbol}{totalCapitalAtRisk.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`text-[12px] font-mono font-medium ${exposureColorClass}`}>
                  {totalCapitalAtRiskPercent.toFixed(2)}% of Portfolio
                </span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 border-t border-border-dark bg-surface flex justify-around items-center md:hidden z-20">
        {navItems.map((item) => {
          const isActive = item.name === 'Risk';
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
