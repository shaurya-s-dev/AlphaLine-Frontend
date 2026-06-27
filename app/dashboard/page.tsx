'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Activity, ShieldAlert, Terminal, LayoutDashboard, Star, Search, Download } from 'lucide-react';
import { toast } from 'sonner';

import Sidebar from '@/components/Sidebar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { StatsBar } from '@/components/StatsBar';
import { SignalCard } from '@/components/SignalCard';
import { SignalCardSkeleton } from '@/components/SignalCardSkeleton';
import { SignalDrawer } from '@/components/SignalDrawer';
import { TickerTape } from '@/components/TickerTape';
import { MarketCountdown } from '@/components/MarketCountdown';
import * as Slider from '@radix-ui/react-slider';

const CORE_TICKERS = [
  // NSE Large Cap
  "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", 
  "BHARTIARTL.NS", "KOTAKBANK.NS", "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS", "TITAN.NS", 
  "BAJFINANCE.NS", "WIPRO.NS", "ULTRACEMCO.NS", "NESTLEIND.NS", "POWERGRID.NS", "NTPC.NS", "SUNPHARMA.NS", 
  "TECHM.NS", "HCLTECH.NS", "DIVISLAB.NS", "DRREDDY.NS", "CIPLA.NS", "BRITANNIA.NS", "EICHERMOT.NS", 
  "BAJAJFINSV.NS", "TATAMOTORS.BO", "TATASTEEL.NS", "JSWSTEEL.NS", "COALINDIA.NS", "ONGC.NS", 
  "BPCL.NS", "IOC.NS", "GRASIM.NS", "ADANIPORTS.NS", "INDUSINDBK.NS",
  // US Markets
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B", "JPM", "V", 
  "JNJ", "WMT", "PG", "MA", "HD", "BAC", "XOM", "ABBV", "PFE", "AVGO",
  "AMD", "NFLX", "CRM", "COST", "TMO", "ACN", "DHR", "NEE", "UNH", "LIN",
  "SHOP", "SQ", "PLTR", "RBLX", "SNAP", "UBER", "LYFT", "ABNB", "COIN", "HOOD",
  // Index
  "^NSEI"
];

function exportToCSV(signalsToExport: any[]) {
  const headers = [
    "Ticker","Market","Signal","Confidence",
    "Entry","Stop Loss","Target","R:R","Timestamp"
  ];
  const rows = signalsToExport.map(s => [
    s.ticker, s.market, s.signalType, 
    s.confidence + "%",
    s.entry, s.stopLoss, s.target,
    s.riskReward + "x",
    s.timestamp
  ]);
  const csv = [headers, ...rows]
    .map(row => row.join(","))
    .join("\n");
  
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alphaline-signals-${
    new Date().toISOString().split("T")[0]
  }.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [selectedMarket, setSelectedMarket] = useState<'All' | 'NSE' | 'BSE' | 'US'>('All');
  const [minConfidence, setMinConfidence] = useState(50);
  const [search, setSearch] = useState("");
  
  // Signals data states
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Real-time states
  const [fetchSuccess, setFetchSuccess] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('N/A');
  const [isGenerating, setIsGenerating] = useState(false);

  // Watchlist states
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [watchlistSearch, setWatchlistSearch] = useState("");
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  // Load watchlist on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('alphaline_watchlist');
      if (stored) {
        setWatchlist(JSON.parse(stored));
      } else {
        const defaults = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "AAPL", "MSFT", "GOOGL", "TSLA", "^NSEI"];
        setWatchlist(defaults);
        localStorage.setItem('alphaline_watchlist', JSON.stringify(defaults));
      }
    }
  }, []);

  const handleWatchlistToggle = (ticker: string) => {
    const isCurrentlyWatched = watchlist.includes(ticker);
    const updated = isCurrentlyWatched
      ? watchlist.filter(t => t !== ticker)
      : [...watchlist, ticker];
    setWatchlist(updated);
    localStorage.setItem('alphaline_watchlist', JSON.stringify(updated));
    
    if (isCurrentlyWatched) {
      toast.success(`Removed ${ticker} from watchlist`);
    } else {
      toast.success(`Added ${ticker} to watchlist`);
    }
  };

  const [watchlistSignals, setWatchlistSignals] = useState<any[]>([]);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(false);

  const fetchWatchlistSignals = async (showLoading = false) => {
    if (watchlist.length === 0) {
      setWatchlistSignals([]);
      return;
    }
    try {
      if (showLoading) setIsLoadingWatchlist(true);
      const tickersQuery = watchlist.join(',');
      const res = await fetch(`/api/signals?tickers=${tickersQuery}`);
      if (!res.ok) throw new Error("Watchlist fetch failed");
      const data = await res.json();
      if (data.success && data.signals) {
        setWatchlistSignals(data.signals);
      }
    } catch (e) {
      console.warn("Failed to fetch watchlist signals:", e);
    } finally {
      setIsLoadingWatchlist(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Watchlist') {
      fetchWatchlistSignals(watchlistSignals.length === 0);
    }
  }, [activeTab, watchlist]);

  // Mobile sidebar collapse state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Drawer selected signal state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedSignalForDrawer, setSelectedSignalForDrawer] = useState<any | null>(null);

  // Track previous signals for confidence trend indicator
  const prevSignalsRef = useRef<Record<string, number>>({});

  // Fallback mock signals if API is empty or offline
  const fallbackMockSignals = [
    { id:'m1', ticker:'RELIANCE.NS', market:'NSE', signalType:'BUY', confidence:81, entry:2847.50, stopLoss:2790.00, target:2960.00, riskReward:2.1, timestamp:'2m ago' },
    { id:'m2', ticker:'TCS.NS', market:'NSE', signalType:'SELL', confidence:67, entry:3850.00, stopLoss:3920.00, target:3710.00, riskReward:2.0, timestamp:'5m ago' },
    { id:'m3', ticker:'AAPL', market:'US', signalType:'BUY', confidence:74, entry:189.20, stopLoss:185.00, target:198.00, riskReward:2.2, timestamp:'8m ago' },
    { id:'m4', ticker:'NVDA', market:'US', signalType:'BUY', confidence:88, entry:125.50, stopLoss:120.00, target:135.00, riskReward:1.9, timestamp:'11m ago' },
    { id:'m5', ticker:'INFY.NS', market:'NSE', signalType:'HOLD', confidence:54, entry:1420.00, stopLoss:1450.00, target:1360.00, riskReward:1.0, timestamp:'14m ago' },
    { id:'m6', ticker:'MSFT', market:'US', signalType:'BUY', confidence:79, entry:415.00, stopLoss:406.00, target:432.00, riskReward:1.9, timestamp:'17m ago' },
    { id:'m7', ticker:'HDFCBANK.NS', market:'NSE', signalType:'SELL', confidence:71, entry:1640.00, stopLoss:1695.00, target:1570.00, riskReward:1.3, timestamp:'21m ago' },
    { id:'m8', ticker:'GOOGL', market:'US', signalType:'BUY', confidence:76, entry:172.50, stopLoss:168.00, target:181.00, riskReward:2.1, timestamp:'24m ago' },
    { id:'m9', ticker:'WIPRO.NS', market:'NSE', signalType:'BUY', confidence:63, entry:458.00, stopLoss:448.00, target:475.00, riskReward:1.7, timestamp:'28m ago' },
    { id:'m10', ticker:'TSLA', market:'US', signalType:'SELL', confidence:69, entry:248.00, stopLoss:258.00, target:232.00, riskReward:1.6, timestamp:'31m ago' },
    { id:'m11', ticker:'ICICIBANK.NS', market:'NSE', signalType:'BUY', confidence:82, entry:1285.00, stopLoss:1260.00, target:1340.00, riskReward:2.2, timestamp:'35m ago' },
    { id:'m12', ticker:'META', market:'US', signalType:'BUY', confidence:85, entry:582.00, stopLoss:568.00, target:608.00, riskReward:1.9, timestamp:'38m ago' },
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
        // Save previous map first before updating
        const prevMap: Record<string, number> = {};
        signals.forEach(s => { prevMap[s.ticker] = s.confidence; });
        prevSignalsRef.current = prevMap;

        setSignals(data.signals);
        setIsDemoMode(false);
        setFetchSuccess(true);
      } else {
        const prevMap: Record<string, number> = {};
        signals.forEach(s => { prevMap[s.ticker] = s.confidence; });
        prevSignalsRef.current = prevMap;

        setSignals(fallbackMockSignals);
        setIsDemoMode(true);
        setFetchSuccess(false);
      }
    } catch (err: any) {
      console.warn("Signal feed API error, using fallback mock data:", err);
      const prevMap: Record<string, number> = {};
      signals.forEach(s => { prevMap[s.ticker] = s.confidence; });
      prevSignalsRef.current = prevMap;

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

  // Confidence slider + search filters client-side on the returned data
  const filteredSignals = signals.filter((sig) => {
    const matchesMarket = selectedMarket === 'All' || sig.market === selectedMarket;
    const matchesSearch = sig.ticker.toLowerCase().includes(search.toLowerCase());
    return matchesMarket && matchesSearch && sig.confidence >= minConfidence;
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
        
        {/* Upgraded Top Bar Header with Search & Export */}
        <header className="h-[52px] border-b border-border-dark bg-[#111318]/50 backdrop-blur-md flex items-center justify-between px-6 gap-4 z-20 select-none">
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

          {/* Search input in the top bar area */}
          <div className="flex items-center gap-3 flex-1 justify-center max-w-sm hidden md:flex">
            <div style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}>
              <Search 
                size={13} 
                style={{ 
                  position: "absolute", 
                  left: 10, 
                  color: "#374151",
                  pointerEvents: "none"
                }} 
              />
              <motion.input
                type="text"
                placeholder="Search ticker..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                whileFocus={{ width: 180 }}
                initial={{ width: 140 }}
                transition={{ duration: 0.2 }}
                style={{
                  background: "#1C1F28",
                  border: "1px solid #1E2230",
                  borderRadius: 6,
                  height: 32,
                  paddingLeft: 30,
                  paddingRight: 12,
                  fontFamily: "var(--font-inter)",
                  fontSize: 12,
                  color: "#E2E8F0",
                  outline: "none",
                }}
                onFocus={e => e.target.style.borderColor = "#6366F1"}
                onBlur={e => e.target.style.borderColor = "#1E2230"}
              />
              {search && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    background: "none",
                    border: "none",
                    color: "#374151",
                    cursor: "pointer",
                    fontSize: 12,
                    padding: 0,
                  }}
                >
                  &times;
                </motion.button>
              )}
            </div>
          </div>

          {/* Right Area: Market Status, Export & Indicator */}
          <div className="flex items-center gap-4 select-none">
            {/* Market Countdown */}
            <div className="hidden xs:block">
              <MarketCountdown />
            </div>

            {/* Export CSV Button */}
            <motion.button
              onClick={() => exportToCSV(signals)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "transparent",
                border: "1px solid #1E2230",
                borderRadius: 6,
                height: 32,
                padding: "0 12px",
                cursor: "pointer",
                fontFamily: "var(--font-inter)",
                fontSize: 12,
                color: "#6B7280",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "#374151";
                e.currentTarget.style.color = "#E2E8F0";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "#1E2230";
                e.currentTarget.style.color = "#6B7280";
              }}
            >
              <Download size={12} />
              <span className="hidden sm:inline">Export CSV</span>
            </motion.button>

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

        {/* TickerTape banner below header */}
        <div className="w-full border-b border-border-dark overflow-hidden bg-void/50 z-10 select-none hidden lg:block">
          <TickerTape signals={signals} />
        </div>

        {/* Scrollable grid content area */}
        <div className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6">
          {activeTab === 'Dashboard' && (
            <div className="space-y-6">
              {/* Header Title Section */}
              <div className="flex flex-col gap-1 select-none">
                <h1 className="text-[20px] font-medium text-frost font-sans leading-none flex items-center gap-2">
                  Confluence Signals
                </h1>
                <p className="text-[13px] text-muted font-sans font-normal leading-normal">
                  Real-time indicator values, optimized entry points, and protective levels.
                </p>
              </div>

              {/* Control Panel: Pill Filters and slider */}
              <div className="bg-[#111318]/50 backdrop-blur-md border border-border-dark p-4 rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-6 select-none">
                
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
                /* Mirrored loading skeleton structure */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SignalCardSkeleton key={i} index={i} />
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
                      previousConfidence={prevSignalsRef.current[signal.ticker]}
                      isWatched={watchlist.includes(signal.ticker)}
                      onWatchToggle={() => handleWatchlistToggle(signal.ticker)}
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
                  <p className="text-[13px] font-sans font-normal text-muted text-[#374151]">
                    {search ? `No signals found for "${search}"` : "No signals match your filters"}
                  </p>
                </motion.div>
              )}
            </div>
          )}

          {/* Render Watchlist Tab */}
          {activeTab === 'Watchlist' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
                <div className="flex flex-col gap-1">
                  <h1 className="text-[20px] font-medium text-frost font-sans leading-none">Your Watchlist</h1>
                  <p className="text-[13px] text-muted font-sans font-normal leading-normal">
                    Monitor your selected assets and receive alerts on confluences.
                  </p>
                </div>
                
                {/* Autocomplete Add Stock Input */}
                <div className="relative w-full max-w-[280px]">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search ticker (e.g. RELIANCE.NS, AAPL)"
                      value={watchlistSearch}
                      onChange={(e) => {
                        setWatchlistSearch(e.target.value.toUpperCase());
                      }}
                      onFocus={() => setIsSuggestionsOpen(true)}
                      onBlur={() => setTimeout(() => setIsSuggestionsOpen(false), 200)}
                      className="flex-1 bg-[#1C1F28] border border-border-dark text-[13px] text-frost p-2 rounded-[6px] font-mono focus:outline-none focus:border-indigo uppercase placeholder:text-dim"
                    />
                    <button
                      onClick={() => {
                        if (watchlistSearch && !watchlist.includes(watchlistSearch)) {
                          handleWatchlistToggle(watchlistSearch);
                          setWatchlistSearch("");
                        }
                      }}
                      className="bg-indigo text-white px-3 text-[12px] font-medium rounded-[6px] hover:bg-[#5254DE] transition-colors leading-none"
                    >
                      Add
                    </button>
                  </div>
                  
                  {/* Suggestions Dropdown */}
                  {watchlistSearch && isSuggestionsOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-dark rounded-[6px] shadow-lg z-50 overflow-hidden">
                      {CORE_TICKERS.filter(t => 
                        t.toLowerCase().includes(watchlistSearch.toLowerCase()) && 
                        !watchlist.includes(t)
                      ).slice(0, 5).map(ticker => (
                        <button
                          key={ticker}
                          onMouseDown={() => {
                            handleWatchlistToggle(ticker);
                            setWatchlistSearch("");
                          }}
                          className="w-full text-left px-3 py-2 text-[12px] font-mono text-frost hover:bg-[#1C1F28] transition-colors border-b border-[#1E2230]/40 last:border-0"
                        >
                          {ticker}
                        </button>
                      ))}
                      {CORE_TICKERS.filter(t => 
                        t.toLowerCase().includes(watchlistSearch.toLowerCase()) && 
                        !watchlist.includes(t)
                      ).length === 0 && (
                        <div className="px-3 py-2 text-[11px] text-muted text-center font-sans bg-surface">
                          No matches (press Enter/Add to force add)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {watchlist.length > 0 ? (
                <motion.div 
                  variants={{
                    show: { transition: { staggerChildren: 0.06 } }
                  }}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {watchlist.map((ticker, index) => {
                    const signal = watchlistSignals.find(s => s.ticker === ticker) || 
                                   signals.find(s => s.ticker === ticker) || {
                      id: `watchlist_mock_${ticker}`,
                      ticker: ticker,
                      market: ticker.endsWith('.NS') || ticker.endsWith('.BO') || ticker === '^NSEI' ? 'NSE' : 'US',
                      signalType: ticker === '^NSEI' ? 'BUY' : (ticker.charCodeAt(0) % 2 === 0 ? 'BUY' : 'SELL'),
                      confidence: 65 + (ticker.charCodeAt(0) % 25),
                      entry: ticker === '^NSEI' ? 22450.00 : (ticker.endsWith('.NS') || ticker.endsWith('.BO') ? 1200.00 : 150.00),
                      stopLoss: ticker === '^NSEI' ? 22200.00 : (ticker.endsWith('.NS') || ticker.endsWith('.BO') ? 1176.00 : 147.00),
                      target: ticker === '^NSEI' ? 22950.00 : (ticker.endsWith('.NS') || ticker.endsWith('.BO') ? 1248.00 : 156.00),
                      timestamp: 'Just now'
                    };
                    return (
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
                        isWatched={true}
                        onWatchToggle={() => handleWatchlistToggle(ticker)}
                        previousConfidence={prevSignalsRef.current[ticker]}
                        onClick={() => {
                          setSelectedSignalForDrawer(signal);
                          setIsDrawerOpen(true);
                        }}
                      />
                    );
                  })}
                </motion.div>
              ) : (
                <div className="border border-border-dark bg-surface p-12 text-center rounded-[6px] select-none">
                  <Star className="w-8 h-8 text-dim mx-auto mb-3" />
                  <h3 className="text-[14px] font-medium text-frost mb-1 font-sans">No Watchlist Items</h3>
                  <p className="text-[12px] text-muted font-sans max-w-sm mx-auto">
                    Search and add tickers above or star card confluences to monitor them here.
                  </p>
                </div>
              )}
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
