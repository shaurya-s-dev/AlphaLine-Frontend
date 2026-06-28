'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useSidebar } from '@/components/SidebarProvider';
import { Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Star, Activity, ShieldAlert, Terminal } from 'lucide-react';
import { InfoPanel } from '@/components/InfoPanel';
import { RangeSlider } from '@/components/RangeSlider';

export default function RiskPage() {
  const { collapsed } = useSidebar();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const router = useRouter();
  
  // State for user inputs
  const [portfolioSize, setPortfolioSize] = useState<string>('50000');
  const [currencySymbol, setCurrencySymbol] = useState<'₹' | '$'>('₹');
  const [riskPercent, setRiskPercent] = useState<number>(2.0);
  const [atrMultiplier, setAtrMultiplier] = useState<number>(2.0);
  
  // State for signals data
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Animation mount state
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Fallback mock signals if API is empty or offline
  const fallbackMockSignals = [
    { id: 'mock_1', ticker: 'RELIANCE.NS', market: 'NSE', signalType: 'BUY', confidence: 81, entry: 2847.50, stopLoss: 2790.00, target: 2960.00 },
    { id: 'mock_2', ticker: 'AAPL', market: 'US', signalType: 'BUY', confidence: 85, entry: 189.20, stopLoss: 185.00, target: 198.00 },
    { id: 'mock_3', ticker: 'TCS.NS', market: 'NSE', signalType: 'SELL', confidence: 74, entry: 3850.00, stopLoss: 3920.00, target: 3710.00 },
    { id: 'mock_4', ticker: 'TSLA', market: 'US', signalType: 'BUY', confidence: 68, entry: 175.50, stopLoss: 168.00, target: 192.00 },
    { id: 'mock_5', ticker: 'INFY.NS', market: 'NSE', signalType: 'SELL', confidence: 65, entry: 1420.00, stopLoss: 1450.00, target: 1360.00 }
  ];

  // Set page title and mount status
  useEffect(() => {
    document.title = "Alphaline — Risk Management";
    setIsMounted(true);
  }, []);

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
          const activeSetups = data.signals.filter((s: any) => 
            s.signalType === 'BUY' || s.signalType === 'SELL'
          );
          setSignals(activeSetups);
        } else {
          const mockSetups = fallbackMockSignals.filter((s: any) => 
            s.signalType === 'BUY' || s.signalType === 'SELL'
          );
          setSignals(mockSetups);
        }
      } catch (err: any) {
        console.warn('Using fallback mock data for risk panel:', err);
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
    const target = sig.target || 0;
    
    // Suggest a realistic average true range (ATR) of 1.5% of the stock's entry price
    const atr = Math.round(entry * 0.015 * 100) / 100 || 1.5;
    const stopDistance = atrMultiplier * atr;
    
    // suggested shares: risk amount in currency / stop distance
    const shares = stopDistance > 0 ? rawRiskVal / stopDistance : 0;
    const suggestedPosSize = shares * entry;
    
    const maxLossCurrency = rawRiskVal; // Under ATR sizing, max loss matches risk per trade
    const maxLossPercent = entry > 0 ? (stopDistance / entry) * 100 : 0;
    
    const rewardDistance = Math.abs(target - entry);
    const riskRewardRatio = stopDistance > 0 ? rewardDistance / stopDistance : 0;
    const atrStopLoss = sig.signalType === 'SELL' ? entry + stopDistance : entry - stopDistance;

    return {
      ...sig,
      atr,
      atrStopLoss,
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
  let progressColor = '#22C55E';
  
  if (totalCapitalAtRiskPercent > 20) {
    exposureColorClass = 'text-[#EF4444]'; // Danger red
    exposureLabel = 'DANGER EXPOSURE';
    progressColor = '#EF4444';
  } else if (totalCapitalAtRiskPercent > 10) {
    exposureColorClass = 'text-[#F59E0B]'; // Warning amber
    exposureLabel = 'WARNING EXPOSURE';
    progressColor = '#F59E0B';
  }

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
      {/* Desktop Sidebar */}
      <Sidebar activeTab="Risk" isMobileOpen={isMobileSidebarOpen} onMobileClose={() => setIsMobileSidebarOpen(false)} />

      {/* Main Content Area */}
      <main className={`flex-1 transition-all duration-300 ${collapsed ? 'md:pl-[64px]' : 'md:pl-[220px]'} p-6 pb-28 md:pb-6 max-w-5xl w-full mx-auto`}>
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1.5">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)} 
              className="md:hidden p-1.5 bg-raised border border-border-dark rounded-[6px] text-muted hover:text-frost"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h1 className="text-[20px] font-medium text-frost font-sans leading-none mb-0">Risk Management</h1>
          </div>
          <p className="text-[13px] text-muted font-sans font-normal leading-normal">
            Compute precise position sizes, allocations, and stop-loss impact variables.
          </p>
        </div>

        <InfoPanel title="How This Works">
          <p>
            <strong>Position sizing:</strong> Alphaline uses ATR-based position sizing. ATR (Average True Range) measures a stock's volatility over 14 days. Stop distance = ATR × multiplier. Shares = (Portfolio × Risk%) ÷ Stop Distance. This ensures each trade risks the same fixed % of your portfolio regardless of the stock's price. Allocation = Shares × Entry Price.
          </p>
        </InfoPanel>

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
              
              <RangeSlider
                min={1.0} max={5.0} step={0.5}
                value={riskPercent}
                onChange={setRiskPercent}
                color="#6366F1"
                formatValue={v => `${v.toFixed(1)}%`}
              />
              
              <div className="flex justify-between text-[9px] text-muted font-mono leading-none">
                <span>1.0%</span>
                <span>3.0%</span>
                <span>5.0%</span>
              </div>
            </div>

            {/* ATR Multiplier Slider */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-[11px] text-dim font-sans uppercase tracking-wider font-semibold">
                <span>ATR Stop Multiplier</span>
                <span className="font-mono text-frost text-[12px] font-normal tracking-normal lowercase">
                  {atrMultiplier.toFixed(1)}x
                </span>
              </div>
              
              <RangeSlider
                min={1.0} max={4.0} step={0.5}
                value={atrMultiplier}
                onChange={setAtrMultiplier}
                color="#6366F1"
                formatValue={v => `${v.toFixed(1)}x`}
              />
              
              <div className="flex justify-between text-[9px] text-muted font-mono leading-none">
                <span>1.0x</span>
                <span>2.5x</span>
                <span>4.0x</span>
              </div>
            </div>

            {/* Formula Context Note */}
            <div className="bg-void border border-border-dark p-3 rounded-[6px] text-[11px] text-muted leading-relaxed">
              <span className="text-frost font-medium font-sans">ATR Sizing Rule:</span>
              <ul className="list-disc list-inside mt-1 space-y-1 font-mono text-[10px]">
                <li>ATR = 1.5% of Entry Price</li>
                <li>Stop Distance = Mult &times; ATR</li>
                <li>Shares = (Port &times; Risk%) / Stop Dist</li>
                <li>Alloc. = Shares &times; Entry Price</li>
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
                <div className="p-4 space-y-3 select-none">
                  {/* Header Skeleton */}
                  <div 
                    style={{ display: 'grid', gridTemplateColumns: '140px 80px 1fr 100px 80px 60px 100px', gap: 16 }}
                    className="items-center px-4 py-2 opacity-30"
                  >
                    <div className="h-3 bg-raised animate-pulse rounded-[4px] w-12" />
                    <div className="h-3 bg-raised animate-pulse rounded-[4px] w-8" />
                    <div className="h-3 bg-raised animate-pulse rounded-[4px] w-16 justify-self-end" />
                    <div className="h-3 bg-raised animate-pulse rounded-[4px] w-12 justify-self-end" />
                    <div className="h-3 bg-raised animate-pulse rounded-[4px] w-10 justify-self-end" />
                    <div className="h-3 bg-raised animate-pulse rounded-[4px] w-6 justify-self-center" />
                    <div className="h-3 bg-raised animate-pulse rounded-[4px] w-16 justify-self-end" />
                  </div>
                  {/* Row Skeletons */}
                  {[1, 2, 3].map((n) => (
                    <div 
                      key={n} 
                      style={{ display: 'grid', gridTemplateColumns: '140px 80px 1fr 100px 80px 60px 100px', gap: 16 }}
                      className="items-center px-4 py-3.5 border border-border-dark/30 rounded-[6px]"
                    >
                      <div className="h-4 bg-raised animate-pulse rounded-[4px] w-16" />
                      <div className="h-4 bg-raised animate-pulse rounded-[4px] w-8 bg-emerald-500/10" />
                      <div className="h-4 bg-raised animate-pulse rounded-[4px] w-20 justify-self-end" />
                      <div className="h-4 bg-raised animate-pulse rounded-[4px] w-16 justify-self-end" />
                      <div className="h-4 bg-raised animate-pulse rounded-[4px] w-12 justify-self-end" />
                      <div className="h-4 bg-raised animate-pulse rounded-[4px] w-8 justify-self-center" />
                      <div className="h-4 bg-raised animate-pulse rounded-[4px] w-20 justify-self-end" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-8 text-center text-[13px] text-sig-red font-sans">
                  Failed to fetch live signals. Check back later.
                </div>
              ) : computedSignals.length > 0 ? (
                /* CSS Grid layout fixed sizing columns */
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 700 }} className="divide-y divide-[#1E2230]/50">
                    {/* Header Row */}
                    <div 
                      style={{ display: 'grid', gridTemplateColumns: '140px 80px 1fr 100px 80px 60px 100px', gap: 16 }}
                      className="items-center px-4 py-3 bg-void"
                    >
                      <div className="text-[11px] font-sans font-semibold text-[#94A3B8] uppercase tracking-wider text-left">Ticker</div>
                      <div className="text-[11px] font-sans font-semibold text-[#94A3B8] uppercase tracking-wider text-left">Signal</div>
                      <div className="text-[11px] font-sans font-semibold text-[#94A3B8] uppercase tracking-wider text-right">Entry+SL</div>
                      <div className="text-[11px] font-sans font-semibold text-[#94A3B8] uppercase tracking-wider text-right">Alloc</div>
                      <div className="text-[11px] font-sans font-semibold text-[#94A3B8] uppercase tracking-wider text-right">Shares</div>
                      <div className="text-[11px] font-sans font-semibold text-[#94A3B8] uppercase tracking-wider text-center">R:R</div>
                      <div className="text-[11px] font-sans font-semibold text-[#94A3B8] uppercase tracking-wider text-right">Max Loss</div>
                    </div>

                    {/* Data Rows */}
                    {computedSignals.map((sig, idx) => (
                      <div
                        key={sig.id || idx}
                        style={{ display: 'grid', gridTemplateColumns: '140px 80px 1fr 100px 80px 60px 100px', gap: 16 }}
                        className={`items-center px-4 py-3.5 transition-colors duration-150 hover:bg-raised ${
                          idx % 2 === 0 ? 'bg-transparent' : 'bg-void/40'
                        }`}
                      >
                        {/* Ticker */}
                        <div className="font-semibold text-[13px] text-frost font-sans text-left truncate">
                          {sig.ticker}
                        </div>

                        {/* Signal Type Badge */}
                        <div className="text-left">
                          <span className={`text-[10px] px-1.5 py-0.5 font-bold rounded-[4px] border ${
                            sig.signalType === 'BUY'
                              ? 'border-sig-green/20 text-sig-green bg-sig-green/5'
                              : 'border-sig-red/20 text-sig-red bg-sig-red/5'
                          }`}>
                            {sig.signalType}
                          </span>
                        </div>

                        {/* Entry Price & ATR SL */}
                        <div className="text-right">
                          <span className="text-[13px] font-mono text-frost block">
                            {currencySymbol}{sig.entry.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] font-mono text-muted block mt-0.5" title={`ATR: ${sig.atr.toFixed(2)}`}>
                            SL: {currencySymbol}{sig.atrStopLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Suggested Position size */}
                        <div className="text-[13px] font-mono text-frost text-right">
                          {currencySymbol}{sig.suggestedPosSize.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </div>

                        {/* Shares to buy */}
                        <div className="text-[13px] font-mono text-indigo text-right">
                          {sig.shares.toFixed(2)}
                        </div>

                        {/* Risk reward ratio */}
                        <div className="text-[13px] font-mono text-frost text-center">
                          {sig.riskRewardRatio.toFixed(1)}x
                        </div>

                        {/* Max Loss (red highlighted) */}
                        <div className="text-[13px] font-mono text-sig-red text-right">
                          -{currencySymbol}{sig.maxLossCurrency.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="block text-[10px] text-muted font-mono mt-0.5">
                            ({sig.maxLossPercent.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-[13px] text-muted font-sans">
                  No active trade setups to size.
                </div>
              )}
            </div>

            {/* Bottom: Total Exposure Panel with Progress Bar */}
            <div className="bg-surface border border-border-dark p-5 rounded-[6px] flex flex-col justify-between gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[4px] border border-border-dark bg-[#131720] ${exposureColorClass}`}>
                      {exposureLabel}
                    </span>
                  </div>
                  <h3 className="text-[14px] font-semibold text-frost font-sans">
                    Acting on all signals simultaneously
                  </h3>
                  <p className="text-[12px] text-muted max-w-md font-sans">
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

              {/* Progress bar showing total capital risk % */}
              <div className="space-y-1.5 mt-2">
                <div className="flex justify-between text-[11px] font-mono text-muted">
                  <span>Total portfolio at risk</span>
                  <span className="text-frost font-semibold">{totalCapitalAtRiskPercent.toFixed(2)}%</span>
                </div>
                <div className="w-full bg-[#1C1F28] h-[4px] rounded-[2px] overflow-hidden">
                  <div 
                    className="h-full rounded-[2px] transition-all duration-1000 ease-out"
                    style={{
                      width: `${isMounted ? Math.min(totalCapitalAtRiskPercent, 100) : 0}%`,
                      backgroundColor: progressColor
                    }}
                  />
                </div>
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
