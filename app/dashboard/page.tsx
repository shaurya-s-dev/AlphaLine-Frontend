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
  "BAJAJFINSV.NS", "TATASTEEL.NS", "JSWSTEEL.NS", "COALINDIA.NS", "ONGC.NS", 
  "BPCL.NS", "IOC.NS", "GRASIM.NS", "ADANIPORTS.NS", "INDUSINDBK.NS",
  // BSE Large Cap
  "TATASTEEL.BO", "TATAMOTORS.BO", "WIPRO.BO", "RELIANCE.BO", "TCS.BO", 
  "INFY.BO", "ICICIBANK.BO", "HDFCBANK.BO", "SBIN.BO", "BAJFINANCE.BO", 
  "ADANIENT.BO", "MARUTI.BO", "SUNPHARMA.BO", "AXISBANK.BO", "KOTAKBANK.BO", 
  "TITAN.BO", "HINDUNILVR.BO", "ULTRACEMCO.BO", "NESTLEIND.BO", "POWERGRID.BO",
  // US Markets
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B", "JPM", "V", 
  "JNJ", "WMT", "PG", "MA", "HD", "BAC", "XOM", "ABBV", "PFE", "AVGO",
  "AMD", "NFLX", "CRM", "COST", "TMO", "ACN", "DHR", "NEE", "UNH", "LIN",
  "SHOP", "SQ", "PLTR", "RBLX", "SNAP", "UBER", "LYFT", "ABNB", "COIN", "HOOD",
  # Index
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
    .join("
");
  
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

  const fallbackMockSignals = [
    { id:'m1', ticker:'RELIANCE.NS', market:'NSE', 
      signalType:'BUY', confidence:81, entry:2847.50, 
      stopLoss:2790.00, target:2960.00, 
      riskReward:2.1, timestamp:'2m ago' },
    { id:'m2', ticker:'TCS.NS', market:'NSE', 
      signalType:'SELL', confidence:67, entry:3850.00, 
      stopLoss:3920.00, target:3710.00, 
      riskReward:1.9, timestamp:'4m ago' },
    { id:'m3', ticker:'AAPL', market:'US', 
      signalType:'BUY', confidence:74, entry:189.20, 
      stopLoss:185.00, target:198.00, 
      riskReward:2.1, timestamp:'6m ago' },
    { id:'m4', ticker:'NVDA', market:'US', 
      signalType:'BUY', confidence:88, entry:125.50, 
      stopLoss:120.00, target:135.00, 
      riskReward:1.7, timestamp:'9m ago' },
    { id:'m5', ticker:'TATASTEEL.BO', market:'BSE', 
      signalType:'BUY', confidence:62, entry:148.50, 
      stopLoss:144.00, target:158.00, 
      riskReward:2.1, timestamp:'12m ago' }
  ];

  const fetchSignals = async (marketFilter = 'All', showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);

      let url = `/api/signals?market=${marketFilter.toLowerCase()}&limit=40`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.signals) {
        // Map confidence trend indicators
        const prevMap: Record<string, number> = {};
        signals.forEach(s => {
          prevMap[s.ticker] = s.confidence;
        });
        prevSignalsRef.current = prevMap;

        setSignals(data.signals);
        setFetchSuccess(true);
        setIsDemoMode(false);
      } else {
        throw new Error(data.error || "Malformed signals response");
      }
    } catch (e: any) {
      console.warn("REST API fetching failed. Reverting to local Demo dataset.");
      const prevMap: Record<string, number> = {};
      signals.forEach(s => {
        prevMap[s.ticker] = s.confidence;
      });
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
      const response = await fetch(`/api/proxy/generate-batch`, {
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
    const matchesMarket = selectedMarket === 'All' 
      || sig.market === selectedMarket
      || (selectedMarket === 'BSE' 
          && sig.ticker.endsWith('.BO'));
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

  // Calculate Sentiment percentages for active market overview
  const getMarketSentimentStats = () => {
    if (filteredSignals.length === 0) return { bullish: 0, bearish: 0, neutral: 0 };
    const buy = filteredSignals.filter(s => s.signalType === 'BUY').length;
    const sell = filteredSignals.filter(s => s.signalType === 'SELL').length;
    const hold = filteredSignals.filter(s => s.signalType === 'HOLD').length;
    const total = filteredSignals.length;
    return {
      bullish: Math.round((buy / total) * 100),
      bearish: Math.round((sell / total) * 100),
      neutral: Math.round((hold / total) * 100)
    };
  };

  const sentimentStats = getMarketSentimentStats();

  const handleNavClick = (tab: string) => {
    if (tab === 'Backtest') router.push('/backtest');
    else if (tab === 'Heatmap') router.push('/heatmap');
    else if (tab === 'Risk') router.push('/risk');
    else if (tab === 'API') router.push('/api-docs');
    else if (tab === 'Simulator') router.push('/simulator');
    else if (tab === 'Settings') router.push('/settings');
    else setActiveTab(tab);
  };

  // Nav counts badges for Sidebar
  const sidebarCounts = {
    'Dashboard': signals.length,
    'Watchlist': watchlist.length
  };

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
        counts={sidebarCounts}
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

            {/* Live Indicator with Pulse Dot */}
            <div className="flex items-center gap-1.5 text-[11px] font-sans font-semibold tracking-wider text-muted">
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-block text-[#22C55E]"
              >
                ●
              </motion.span>{' '}
              LIVE
            </div>
          </div>
        </header>

        {/* Dynamic content scroll frame (PAGE ENTRANCE ANIMATION WRAPPER) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-y-auto p-4 pb-24 md:pb-6"
        >
          
          {/* Render Dashboard signals list Tab */}
          {activeTab === 'Dashboard' && (
            <div className="space-y-6">
              
              {/* Filter controls row */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#111318]/30 border border-border-dark p-4 rounded-[12px] select-none">
                
                {/* Market Buttons */}
                <div className="flex gap-1.5 flex-wrap">
                  {(['All', 'NSE', 'BSE', 'US'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedMarket(m)}
                      className={`text-[12px] font-sans font-medium px-3.5 py-1.5 rounded-[6px] border transition-all ${
                        selectedMarket === m 
                          ? 'bg-[#6366F1] border-[#6366F1] text-white' 
                          : 'bg-[#1C1F28]/60 border-border-dark text-[#6B7280] hover:text-frost hover:border-[#1E2230]'
                      }`}
                    >
                      {m} Markets
                    </button>
                  ))}
                </div>

                {/* Min Confidence Slider */}
                <div className="flex items-center gap-4 w-full md:w-auto max-w-[280px]">
                  <span className="text-[11px] text-muted uppercase tracking-wider font-semibold whitespace-nowrap">
                    Min Confidence: <span className="font-mono text-indigo font-bold">{minConfidence}%</span>
                  </span>
                  <Slider.Root
                    value={[minConfidence]}
                    onValueChange={(val) => setMinConfidence(val[0])}
                    min={50}
                    max={95}
                    step={5}
                    className="relative flex items-center select-none touch-none w-32 h-5"
                  >
                    <Slider.Track className="bg-[#1C1F28] relative flex-grow rounded-full h-1 border border-border-dark">
                      <Slider.Range className="absolute bg-[#6366F1] rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb 
                      className="block w-3.5 h-3.5 bg-frost rounded-full hover:bg-white focus:outline-none focus:ring-2 focus:ring-indigo transition-colors cursor-pointer border border-[#111318]" 
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

              {/* MARKET OVERVIEW section */}
              {selectedMarket !== 'All' && filteredSignals.length > 0 && (
                <div className="flex items-center gap-3 text-[12px] font-sans text-muted pb-2 select-none border-b border-border-dark mb-4">
                  <span className="font-semibold text-frost">{selectedMarket} OVERVIEW:</span>
                  <span className="text-[#22C55E]">Bullish: {sentimentStats.bullish}%</span>
                  <span className="text-dim">|</span>
                  <span className="text-[#EF4444]">Bearish: {sentimentStats.bearish}%</span>
                  <span className="text-dim">|</span>
                  <span className="text-[#F59E0B]">Neutral: {sentimentStats.neutral}%</span>
                </div>
              )}

              {/* Card List / Grid area (AUTO-FILL RESPONSIVE GRID) */}
              {isLoading ? (
                <div 
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 12,
                  }}
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SignalCardSkeleton key={i} index={i} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSignals.length > 0 && (
                    <motion.div 
                      variants={{
                        show: { transition: { staggerChildren: 0.06 } }
                      }}
                      initial="hidden"
                      animate="show"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                        gap: 12,
                      }}
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
                  )}

                  {/* Empty state or few items scanner panel coverage */}
                  {filteredSignals.length < 4 && (
                    <div style={{
                      gridColumn: "1 / -1",
                      background: "#111318",
                      border: "1px solid #1E2230",
                      borderRadius: 6,
                      padding: "32px 24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}>
                      <div>
                        <div className="font-sans font-normal text-[14px] text-muted">Generating more signals...</div>
                        <div className="font-sans font-normal text-[12px] text-[#374151] mt-1">Our AI scans {CORE_TICKERS.length} tickers every 30 minutes</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-[10px] text-muted uppercase font-semibold">TICKER COVERAGE</div>
                          <div className="text-[14px] font-mono font-bold text-frost">35 / 50</div>
                        </div>
                        <button 
                          onClick={handleGenerateSignals}
                          disabled={isGenerating}
                          className="bg-[#6366F1] hover:bg-[#8183F4] text-white text-[12px] font-sans font-medium px-4 py-2 rounded-[6px] transition-colors leading-none disabled:opacity-50"
                        >
                          {isGenerating ? "Generating..." : "Generate Now"}
                        </button>
                      </div>
                    </div>
                  )}

                  {filteredSignals.length === 0 && (
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
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 12,
                  }}
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
                <div className="flex items-center justify-center p-12 min-h-[220px] w-full border border-border-dark bg-[#111318]/30 rounded-[6px]">
                  <p className="text-[13px] font-sans font-normal text-muted text-[#374151]">
                    Your watchlist is empty. Add tickers above to start tracking.
                  </p>
                </div>
              )}
            </div>
          )}

        </motion.div>
      </div>

      {/* Slide-out drawer details */}
      <SignalDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        signal={selectedSignalForDrawer}
      />
    </div>
  );
}
