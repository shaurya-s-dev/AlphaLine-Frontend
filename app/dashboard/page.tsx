'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Activity, ShieldAlert, Terminal, LayoutDashboard, Star } from 'lucide-react';
import { toast } from 'sonner';

import Sidebar from '@/components/Sidebar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { StatsBar } from '@/components/StatsBar';
import { SignalCard } from '@/components/SignalCard';
import { SignalDrawer } from '@/components/SignalDrawer';
import { TickerTape } from '@/components/TickerTape';
import * as Slider from '@radix-ui/react-slider';

const CORE_TICKERS = [
  "RELIANCE.NS", "TCS.NS", "INFY.NS", "WIPRO.NS",
  "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "BAJFINANCE.NS",
  "HINDUNILVR.NS", "MARUTI.NS", "SUNPHARMA.NS", "TATAMOTORS.NS",
  "ADANIENT.NS", "LTIM.NS", "AXISBANK.NS", "KOTAKBANK.NS",
  "TITAN.NS", "ULTRACEMCO.NS", "ASIANPAINT.NS", "NESTLEIND.NS",
  "AAPL", "NVDA", "MSFT", "GOOGL", "TSLA",
  "META", "AMZN", "AMD", "NFLX", "CRM",
  "ORCL", "INTC", "QCOM", "SHOP", "COIN"
];

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [selectedMarket, setSelectedMarket] = useState<'All' | 'NSE' | 'BSE' | 'US'>('All');
  const [minConfidence, setMinConfidence] = useState(50);
  
  // Signals data states
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time states
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('N/A');
  const [isGenerating, setIsGenerating] = useState(false);

  // Market hours status
  const [marketStatus, setMarketStatus] = useState({ nseOpen: false, usOpen: false });

  // Mobile sidebar collapse state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Drawer selected signal state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedSignalForDrawer, setSelectedSignalForDrawer] = useState<any | null>(null);

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
  
  // URL tab syncing on mount
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

  // Market status checker effect
  useEffect(() => {
    const checkMarketStatus = () => {
      const now = new Date();
      
      const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const istDay = istTime.getDay();
      const istHour = istTime.getHours();
      const istMin = istTime.getMinutes();
      const istMinOfDay = istHour * 60 + istMin;
      const isNseOpen = (istDay >= 1 && istDay <= 5) && 
                         (istMinOfDay >= (9 * 60 + 15) && istMinOfDay <= (15 * 60 + 30));

      const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const estDay = estTime.getDay();
      const estHour = estTime.getHours();
      const estMin = estTime.getMinutes();
      const estMinOfDay = estHour * 60 + estMin;
      const isUsOpen = (estDay >= 1 && estDay <= 5) && 
                        (estMinOfDay >= (9 * 60 + 30) && estMinOfDay <= (16 * 60));

      setMarketStatus({ nseOpen: isNseOpen, usOpen: isUsOpen });
    };

    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Keyboard Navigation shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'd') {
        router.push('/dashboard');
      } else if (key === 'w') {
        router.push('/dashboard?tab=Watchlist');
      } else if (key === 'b') {
        router.push('/backtest');
      } else if (key === 'r') {
        router.push('/risk');
      } else if (key === 'a') {
        router.push('/api-docs');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

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
      setLastUpdated(new Date().toLocaleTimeString('en-US', { hour12: false }));
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

  // Show Toast when filters change
  useEffect(() => {
    if (!isLoading) {
      toast.success(`Filter updated: Market: ${selectedMarket} · Min Confidence: ${minConfidence}%`, {
        duration: 2000,
      });
    }
  }, [selectedMarket, minConfidence]);

  // Trigger POST /generate-batch to update DB signals via backend
  const handleGenerateSignals = async () => {
    setIsGenerating(true);
    const toastId = toast.loading("Invoking ML pipeline to calculate indicators...");

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/generate-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: CORE_TICKERS })
      });

      if (!response.ok) {
        throw new Error("API call error");
      }

      const data = await response.json();
      toast.dismiss(toastId);

      if (data.success) {
        toast.success("Batch signal calculation finished. Updating feed...", {
          icon: '●',
          duration: 3000,
        });
        fetchSignals(selectedMarket, false);
      } else {
        toast.error("ML seeding completed with exceptions.");
      }
    } catch (err: any) {
      console.error("Error generating signals:", err);
      toast.dismiss(toastId);
      toast.error(`ML seeding failed: ${err.message || "Network Error"}`);
    } finally {
      setIsGenerating(false);
    }
  };

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

  return (
    <div className="h-screen w-screen overflow-hidden bg-void text-frost flex relative">
      {/* Background (z-0) */}
      <AnimatedBackground />

      {/* Sidebar (desktop and mobile collapsible / z-20) */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={handleNavClick} 
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        onGenerateSignals={handleGenerateSignals}
        isGenerating={isGenerating}
      />

      {/* Main Content Pane (z-10) */}
      <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden md:pl-[220px]">
        
        {/* Upgraded Top Bar Header */}
        <header className="h-[52px] border-b border-border-dark bg-[#111318]/50 backdrop-blur-md flex items-center justify-between px-6 gap-4 z-20">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger menu */}
            <button 
              onClick={() => setIsMobileSidebarOpen(true)} 
              className="md:hidden p-1.5 bg-raised border border-border-dark rounded-[6px] text-muted hover:text-frost"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="font-brand text-[11px] text-[#374151] tracking-widest uppercase select-none font-semibold">
              DASHBOARD
            </span>
          </div>

          {/* TickerTape component in the center */}
          <div className="flex-1 hidden lg:block max-w-[450px] border border-border-dark rounded-[6px] overflow-hidden">
            <TickerTape signals={signals} />
          </div>

          {/* Right Area: Market status pills + Live/Demo indicator */}
          <div className="flex items-center gap-4 select-none">
            {/* Market Status Pills */}
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border border-border-dark bg-[#111318]/50">
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: marketStatus.nseOpen ? '#22C55E' : '#374151' }} 
                />
                <span className="font-sans font-normal text-[11px] text-[#E2E8F0]">
                  NSE: {marketStatus.nseOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border border-border-dark bg-[#111318]/50">
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: marketStatus.usOpen ? '#22C55E' : '#374151' }} 
                />
                <span className="font-sans font-normal text-[11px] text-[#E2E8F0]">
                  US: {marketStatus.usOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
            </div>

            {/* LIVE / DEMO Indicator */}
            {isDemoMode ? (
              <span className="font-sans font-medium text-[11px] text-[#F59E0B] flex items-center gap-1">
                <span>○</span> DEMO
              </span>
            ) : (
              <span className="font-sans font-medium text-[11px] text-[#22C55E] flex items-center gap-1">
                <span className="animate-pulse">●</span> LIVE
              </span>
            )}
          </div>
        </header>

        {/* Scrollable grid content area */}
        <div className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6">
          {activeTab === 'Dashboard' && (
            <div className="space-y-6">
              {/* Header Title Section */}
              <div className="flex flex-col gap-1">
                <h1 className="text-[20px] font-medium text-frost font-sans leading-none flex items-center gap-2">
                  Confluence Signals
                </h1>
                <p className="text-[13px] text-muted font-sans font-normal leading-normal">
                  Real-time indicator values, optimized entry points, and protective levels.
                </p>
              </div>

              {/* Control Panel: Pill Filters and slider */}
              <div className="bg-[#111318]/50 backdrop-blur-md border border-border-dark p-4 rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                
                {/* Market Filter Pills (with active layoutId slide animation) */}
                <div className="flex items-center gap-1 bg-void p-1 rounded-[6px] border border-border-dark max-w-max">
                  {(['All', 'NSE', 'BSE', 'US'] as const).map((market) => {
                    const isActive = selectedMarket === market;
                    return (
                      <button
                        key={market}
                        onClick={() => setSelectedMarket(market)}
                        className="px-3 py-1 text-[12px] font-medium rounded-[4px] transition-colors duration-150 font-sans leading-none relative overflow-hidden"
                        style={{ color: isActive ? '#FFFFFF' : '#6B7280' }}
                      >
                        {isActive && (
                          <motion.div 
                            layoutId="active-pill" 
                            className="absolute inset-0 bg-indigo rounded-[4px] z-0"
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                          />
                        )}
                        <span className="relative z-10">{market}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Radix UI Slider for confidence range */}
                <div className="flex items-center gap-4 flex-1 max-w-[320px] justify-end">
                  <span className="text-[12px] font-sans text-muted select-none">
                    Min Conf: <span className="font-mono text-frost font-medium">{minConfidence}%</span>
                  </span>
                  
                  <Slider.Root
                    className="relative flex items-center select-none touch-none w-full max-w-[200px] h-5"
                    value={[minConfidence]}
                    onValueChange={(val) => setMinConfidence(val[0])}
                    min={50}
                    max={90}
                    step={1}
                  >
                    <Slider.Track className="bg-raised relative flex-grow rounded-full h-[2px]">
                      <Slider.Range className="absolute bg-indigo rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb 
                      className="block w-3.5 h-3.5 bg-frost border border-indigo rounded-full shadow-md hover:scale-125 focus:scale-125 focus:outline-none transition-transform cursor-grab active:cursor-grabbing z-10" 
                      aria-label="Min Confidence"
                    />
                  </Slider.Root>
                </div>
              </div>

              {/* Dynamic Stats Row (staggered entrance) */}
              <StatsBar
                activeCount={displayedCount}
                buyCount={buyCount}
                sellCount={sellCount}
                holdCount={holdCount}
                avgConfidence={avgConfidence}
              />

              {/* Card List / Grid area */}
              {isLoading ? (
                /* Shimmer loading layout */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i} 
                      className="relative w-full rounded-[6px] bg-surface border border-border-dark p-4 overflow-hidden h-[130px] animate-pulse"
                    >
                      <div className="h-4 bg-raised w-20 rounded mb-4" />
                      <div className="h-2 bg-raised w-full rounded mb-3" />
                      <div className="h-3 bg-raised w-32 rounded" />
                    </div>
                  ))}
                </div>
              ) : filteredSignals.length > 0 ? (
                /* Staggered load list */
                <motion.div 
                  variants={{
                    show: { transition: { staggerChildren: 0.06 } }
                  }}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {filteredSignals.map((signal, index) => (
                    <SignalCard
                      key={signal.id}
                      ticker={signal.ticker}
                      market={signal.market}
                      signalType={signal.signalType}
                      confidence={signal.confidence}
                      entry={signal.entry}
                      stopLoss={signal.stopLoss}
                      target={signal.target}
                      timestamp={signal.timestamp}
                      index={index}
                      onClick={() => {
                        setSelectedSignalForDrawer(signal);
                        setIsDrawerOpen(true);
                      }}
                    />
                  ))}
                </motion.div>
              ) : (
                /* Empty state with fade transition */
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center p-12 min-h-[220px] w-full border border-border-dark bg-[#111318]/30 rounded-[6px]"
                >
                  <p className="text-[14px] font-sans font-normal text-muted">
                    No signals match your filters
                  </p>
                </motion.div>
              )}
            </div>
          )}

          {/* Render Watchlist Tab */}
          {activeTab === 'Watchlist' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-[20px] font-medium text-frost font-sans leading-none">Your Watchlist</h1>
                <p className="text-[13px] text-muted font-sans font-normal leading-normal">
                  Monitor your selected assets and receive alerts on confluences.
                </p>
              </div>
              <div className="border border-border-dark bg-surface p-12 text-center rounded-[6px]">
                <Star className="w-8 h-8 text-dim mx-auto mb-3" />
                <h3 className="text-[14px] font-medium text-frost mb-1 font-sans">No Watchlist Items</h3>
                <p className="text-[12px] text-muted font-sans max-w-sm mx-auto">
                  Click on card options to monitor active signals on your watchlist.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Signal Details drawer popup overlay */}
      <SignalDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        signal={selectedSignalForDrawer}
      />
    </div>
  );
}
