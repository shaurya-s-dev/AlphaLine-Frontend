'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import SignalCard from '@/components/SignalCard';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Star, Activity, ShieldAlert, Terminal } from 'lucide-react';

export function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [selectedMarket, setSelectedMarket] = useState<'All' | 'NSE' | 'BSE' | 'US'>('All');
  const [minConfidence, setMinConfidence] = useState(50);
  
  // Dynamic signals data state
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time states
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Risk Calculator State
  const [portfolioSize, setPortfolioSize] = useState('50000');
  const [riskPercent, setRiskPercent] = useState('2');
  const [selectedRiskTicker, setSelectedRiskTicker] = useState('RELIANCE.NS');

  // Fallback mock signals if API is empty or offline
  const fallbackMockSignals = [
    { id: 'mock_1', ticker: 'RELIANCE.NS', market: 'NSE', signalType: 'BUY', confidence: 81, entry: 2847.50, stopLoss: 2790.00, target: 2960.00, timestamp: 'Just now' },
    { id: 'mock_2', ticker: 'TCS.NS', market: 'NSE', signalType: 'SELL', confidence: 67, entry: 3850.00, stopLoss: 3920.00, target: 3710.00, timestamp: 'Just now' },
    { id: 'mock_3', ticker: 'AAPL', market: 'US', signalType: 'BUY', confidence: 74, entry: 189.20, stopLoss: 185.00, target: 198.00, timestamp: 'Just now' },
    { id: 'mock_4', ticker: 'INFY.NS', market: 'NSE', signalType: 'HOLD', confidence: 54, entry: 1420.00, stopLoss: 1450.00, target: 1360.00, timestamp: 'Just now' },
    { id: 'mock_5', ticker: 'NVDA', market: 'US', signalType: 'BUY', confidence: 88, entry: 125.50, stopLoss: 120.00, target: 135.00, timestamp: 'Just now' },
    { id: 'mock_6', ticker: 'HDFC.NS', market: 'NSE', signalType: 'SELL', confidence: 71, entry: 1650.00, stopLoss: 1680.00, target: 1590.00, timestamp: 'Just now' }
  ];

  // Set page title tag on mount
  useEffect(() => {
    document.title = "Alphaline — Signal Feed";
  }, []);
  
  // URL tab syncing on mount and query changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'Watchlist') {
        setActiveTab('Watchlist');
      } else {
        setActiveTab('Dashboard');
      }
    }
  }, []);

  const handleNavClick = (tabName: string) => {
    if (tabName === 'Dashboard') {
      setActiveTab('Dashboard');
      router.push('/dashboard');
    } else if (tabName === 'Watchlist') {
      setActiveTab('Watchlist');
      router.push('/dashboard?tab=Watchlist');
    } else if (tabName === 'Backtest') {
      router.push('/backtest');
    } else if (tabName === 'Risk') {
      router.push('/risk');
    } else if (tabName === 'API') {
      router.push('/api-docs');
    }
  };

  // Fetch signals from our Next.js API route
  const fetchSignals = async (market: string, showLoadingIndicator = false) => {
    try {
      if (showLoadingIndicator) {
        setIsLoading(true);
      }
      setError(null);
      
      const marketParam = market.toLowerCase() === 'all' ? 'all' : market;
      const response = await fetch(`/api/signals?market=${marketParam}`);
      if (!response.ok) {
        throw new Error("Signal feed unavailable");
      }
      
      const data = await response.json();
      if (data.success && data.signals && data.signals.length > 0) {
        setSignals(data.signals);
        setIsDemoMode(false);
        setFetchSuccess(true);
      } else {
        setSignals(fallbackMockSignals);
        setIsDemoMode(true);
        setFetchSuccess(false);
      }
    } catch (err: any) {
      console.warn("Signal feed API error, using fallback mock data:", err);
      setSignals(fallbackMockSignals);
      setIsDemoMode(true);
      setFetchSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch signals when selectedMarket changes, and set up 30s polling loop
  useEffect(() => {
    fetchSignals(selectedMarket, true);

    const interval = setInterval(() => {
      fetchSignals(selectedMarket, false);
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [selectedMarket]);

  // Confidence slider filters client-side on the returned data
  const filteredSignals = signals.filter((sig) => {
    const matchesMarket = selectedMarket === 'All' || sig.market === selectedMarket;
    return matchesMarket && sig.confidence >= minConfidence;
  });

  // Calculate dynamic stats
  const displayedCount = filteredSignals.length;
  const avgConfidence = displayedCount > 0 
    ? Math.round(filteredSignals.reduce((acc, s) => acc + s.confidence, 0) / displayedCount) 
    : 0;
  const buyCount = filteredSignals.filter(s => s.signalType === 'BUY').length;
  const sellCount = filteredSignals.filter(s => s.signalType === 'SELL').length;
  const holdCount = filteredSignals.filter(s => s.signalType === 'HOLD').length;

  // Render proper top status pill
  const renderStatusPill = () => {
    if (isDemoMode) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] border border-border-dark bg-[#111318] text-muted text-[11px] font-medium font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-dim" />
          DEMO MODE
        </span>
      );
    }
    if (fetchSuccess) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] border border-sig-green/20 bg-sig-green/10 text-sig-green text-[11px] font-medium font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-sig-green animate-pulse" />
          LIVE
        </span>
      );
    }
    return null;
  };

  // Navigation items for mobile bottom nav
  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Watchlist', icon: <Star className="w-5 h-5" /> },
    { name: 'Backtest', icon: <Activity className="w-5 h-5" /> },
    { name: 'Risk', icon: <ShieldAlert className="w-5 h-5" /> },
    { name: 'API', icon: <Terminal className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-void text-frost flex flex-col font-sans">
      {/* Sidebar for desktop */}
      <Sidebar activeTab={activeTab} setActiveTab={handleNavClick} />

      {/* Main Content Area */}
      <main className="flex-1 md:pl-[220px] p-6 pb-24 md:pb-6 max-w-5xl w-full mx-auto">
        
        {/* Render Dashboard tab */}
        {activeTab === 'Dashboard' && (
          <div>
            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-[20px] font-medium text-frost mb-1.5 font-sans leading-none flex items-center gap-2.5">
                  Confluence Signals
                  {renderStatusPill()}
                </h1>
                <p className="text-[13px] text-muted font-sans font-normal leading-normal">
                  Real-time AI-generated entry, stop-loss, and target levels.
                </p>
              </div>

              {/* Demo Mode Banner */}
              {isDemoMode && (
                <div className="bg-[#1C1F28] border border-[#F59E0B]/20 text-[#F59E0B] text-[11px] font-normal px-3 py-1.5 rounded-[6px] max-w-max">
                  ● Demo mode — connect backend for live signals
                </div>
              )}
            </div>

            {/* Scrolling Ticker Tape */}
            <div className="ticker-wrap w-full relative z-10 select-none mb-6 rounded-[6px] border border-border-dark">
              <div className="ticker flex items-center h-full">
                {/* First Set */}
                <div className="flex items-center whitespace-nowrap">
                  <span className="px-6 text-frost font-sans">RELIANCE.NS <span className="text-sig-green font-medium">▲ 81% BUY</span></span>
                  <span className="text-border-dark font-mono">·</span>
                  <span className="px-6 text-frost font-sans">TCS.NS <span className="text-sig-red font-medium">▼ 67% SELL</span></span>
                  <span className="text-border-dark font-mono">·</span>
                  <span className="px-6 text-frost font-sans">NVDA <span className="text-sig-green font-medium">▲ 88% BUY</span></span>
                  <span className="text-border-dark font-mono">·</span>
                  <span className="px-6 text-frost font-sans">AAPL <span className="text-sig-green font-medium">▲ 74% BUY</span></span>
                  <span className="text-border-dark font-mono">·</span>
                  <span className="px-6 text-frost font-sans">INFY.NS <span className="text-sig-amber font-medium">■ 54% HOLD</span></span>
                  <span className="text-border-dark font-mono">·</span>
                  <span className="px-6 text-frost font-sans">HDFC.NS <span className="text-sig-red font-medium">▼ 71% SELL</span></span>
                  <span className="text-border-dark font-mono">·</span>
                </div>
                {/* Duplicate Set for Seamless Loop */}
                <div className="flex items-center whitespace-nowrap">
                  <span className="px-6 text-frost font-sans">RELIANCE.NS <span className="text-sig-green font-medium">▲ 81% BUY</span></span>
                  <span className="text-border-dark font-mono">·</span>
                  <span className="px-6 text-frost font-sans">TCS.NS <span className="text-sig-red font-medium">▼ 67% SELL</span></span>
                  <span className="text-border-dark font-mono">·</span>
                  <span className="px-6 text-frost font-sans">NVDA <span className="text-sig-green font-medium">▲ 88% BUY</span></span>
                  <span className="text-border-dark font-mono">·</span>
                  <span className="px-6 text-frost font-sans">AAPL <span className="text-sig-green font-medium">▲ 74% BUY</span></span>
                  <span className="text-border-dark font-mono">·</span>
                  <span className="px-6 text-frost font-sans">INFY.NS <span className="text-sig-amber font-medium">■ 54% HOLD</span></span>
                  <span className="text-border-dark font-mono">·</span>
                  <span className="px-6 text-frost font-sans">HDFC.NS <span className="text-sig-red font-medium">▼ 71% SELL</span></span>
                  <span className="text-border-dark font-mono">·</span>
                </div>
              </div>
              <style jsx>{`
                @keyframes marquee {
                  0% {
                    transform: translate3d(0, 0, 0);
                  }
                  100% {
                    transform: translate3d(-50%, 0, 0);
                  }
                }
                .ticker-wrap {
                  overflow: hidden;
                  height: 32px;
                  background-color: #0d0f14;
                  display: flex;
                  align-items: center;
                }
                .ticker {
                  display: flex;
                  width: max-content;
                  animation: marquee 35s linear infinite;
                }
                .ticker:hover {
                  animation-play-state: paused;
                }
              `}</style>
            </div>

            {/* Filter and Control Panel */}
            <div className="bg-surface border border-border-dark p-4 rounded-[6px] mb-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Market Filter Pills */}
              <div className="flex items-center gap-1.5">
                {(['All', 'NSE', 'BSE', 'US'] as const).map((market) => (
                  <button
                    key={market}
                    onClick={() => setSelectedMarket(market)}
                    className={`px-3 py-1 text-[12px] font-medium rounded-[6px] transition-all duration-150 font-sans leading-none border ${
                      selectedMarket === market
                        ? 'bg-indigo border-indigo text-white'
                        : 'bg-surface border-border-dark text-muted hover:text-frost hover:bg-raised'
                    }`}
                  >
                    {market}
                  </button>
                ))}
              </div>

              {/* Confidence Filter Slider */}
              <div className="flex flex-col gap-1.5 min-w-[200px] w-full md:w-auto">
                <div className="flex justify-between items-center text-[12px] font-sans text-muted leading-none">
                  <span>Min Confidence</span>
                  <span className="font-mono font-medium text-frost">{minConfidence}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="90"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="w-full h-1 bg-raised rounded-[6px] appearance-none cursor-pointer accent-indigo"
                  style={{
                    WebkitAppearance: 'none',
                  }}
                />
              </div>
            </div>

            {/* Stats Bar */}
            <div className="flex flex-wrap items-center gap-2 text-[12px] font-sans font-normal text-dim mb-6 select-none border-b border-border-dark/30 pb-3">
              <span>{displayedCount} active setup{displayedCount !== 1 ? 's' : ''}</span>
              <span className="text-border-dark font-mono">·</span>
              <span>Avg confidence {avgConfidence}%</span>
              <span className="text-border-dark font-mono">·</span>
              <span>
                <span className="text-sig-green font-medium">{buyCount} BUY</span>
                {' · '}
                <span className="text-sig-red font-medium">{sellCount} SELL</span>
                {' · '}
                <span className="text-sig-amber font-medium">{holdCount} HOLD</span>
              </span>
            </div>

            {/* Signals Content Area */}
            {isLoading ? (
              /* Loading Skeleton: 4 shimmer sweep card placeholders */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((idx) => (
                  <div
                    key={idx}
                    className="relative w-full rounded-[6px] bg-surface border border-border-dark p-[14px_16px] overflow-hidden"
                  >
                    {/* Shimmer overlay element */}
                    <div className="absolute inset-0 shimmer-bg opacity-40 animate-pulse" />
                    
                    <div className="relative z-10 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="h-4 w-20 bg-raised rounded-[6px]" />
                        <div className="h-3.5 w-16 bg-raised rounded-[6px]" />
                      </div>
                      <div className="h-[2px] w-full bg-raised rounded-full" />
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1.5">
                          <div className="h-2 w-8 bg-raised rounded-[6px]" />
                          <div className="h-3 w-12 bg-raised rounded-[6px]" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-2 w-10 bg-raised rounded-[6px]" />
                          <div className="h-3 w-14 bg-raised rounded-[6px]" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-2 w-8 bg-raised rounded-[6px]" />
                          <div className="h-3 w-12 bg-raised rounded-[6px]" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <div className="h-3.5 w-10 bg-raised rounded-[6px]" />
                        <div className="h-3 w-14 bg-raised rounded-[6px]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error && signals.length === 0 ? (
              /* Error State */
              <div className="border border-sig-red/20 bg-sig-red/5 p-8 text-center rounded-[6px]">
                <p className="text-[13px] text-sig-red font-sans font-medium">{error}</p>
              </div>
            ) : filteredSignals.length > 0 ? (
              /* Signals Grid with Staggered Load */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredSignals.map((signal, index) => (
                  <div
                    key={signal.id}
                    className={signal.isNew ? "animate-slide-in" : ""}
                  >
                    <SignalCard
                      ticker={signal.ticker}
                      market={signal.market}
                      signalType={signal.signalType}
                      confidence={signal.confidence}
                      entry={signal.entry}
                      stopLoss={signal.stopLoss}
                      target={signal.target}
                      timestamp={signal.timestamp}
                      isBlurred={index >= 4} // Cards beyond index 4 get blurred
                      index={index}
                    />
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="flex items-center justify-center p-8 min-h-[200px] w-full border border-border-dark bg-surface rounded-[6px]">
                <p className="text-[14px] font-sans font-normal text-dim">No signals match your filters</p>
              </div>
            )}
          </div>
        )}

        {/* Render Watchlist Tab */}
        {activeTab === 'Watchlist' && (
          <div>
            <div className="mb-8">
              <h1 className="text-[20px] font-medium text-frost mb-1.5 font-sans leading-none">Your Watchlist</h1>
              <p className="text-[13px] text-muted font-sans font-normal leading-normal">
                Monitor your selected assets and receive alerts on confluences.
              </p>
            </div>
            <div className="border border-border-dark bg-surface p-12 text-center rounded-[6px]">
              <svg className="w-8 h-8 text-dim mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.961 0 1.36 1.237.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <h3 className="text-[14px] font-medium text-frost mb-1 font-sans">No Watchlist Items</h3>
              <p className="text-[12px] text-muted font-sans max-w-sm mx-auto">
                Tap monitor on active signal cards to add tickers to your personal watchlist.
              </p>
            </div>
          </div>
        )}

        {/* Render Mock tabs for Dashboard (since actual tabs route elsewhere now) */}
        {activeTab === 'Backtest' && (
          <div className="border border-border-dark bg-surface p-12 text-center rounded-[6px]">
            <p className="text-[13px] text-muted font-sans">Redirecting to Strategy Backtesting...</p>
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 border-t border-border-dark bg-surface flex justify-around items-center md:hidden z-20">
        {navItems.map((item) => {
          const isActive = activeTab === item.name;
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

export default DashboardPage;
