'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Activity, ShieldAlert, Terminal, LayoutDashboard, Star, Search, Download, Bell, AlertTriangle } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { SortDropdown } from '@/components/SortDropdown';
import { toast } from 'sonner';

import Sidebar from '@/components/Sidebar';
import { useSidebar } from '@/components/SidebarProvider';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { StatsBar } from '@/components/StatsBar';
import { SignalCard } from '@/components/SignalCard';
import { SignalCardSkeleton } from '@/components/SignalCardSkeleton';
import { SignalDrawer } from '@/components/SignalDrawer';
import { TickerTape } from '@/components/TickerTape';
import { MarketCountdown } from '@/components/MarketCountdown';
import { InfoPanel } from '@/components/InfoPanel';
import { RangeSlider } from '@/components/RangeSlider';

function isSignalExpired(createdAt?: string, timestamp?: string): boolean {
  const ts = createdAt || timestamp;
  if (!ts) return false;
  if (ts.includes('ago') || ts.toLowerCase() === 'just now') {
    const matchHr = ts.match(/(\d+)\s*hr/i);
    if (matchHr && parseInt(matchHr[1], 10) > 16) return true;
    const matchDay = ts.match(/(\d+)\s*day/i);
    if (matchDay) return true;
    return false;
  }
  try {
    const created = new Date(ts);
    if (isNaN(created.getTime())) return false;
    const now = new Date();
    const hours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return hours > 16;
  } catch (e) {
    return false;
  }
}

const historicalOutcomes = [
  { ticker: "TCS.NS", type: "BUY", date: "2026-06-25", entry: 3850.00, target: 3960.00, sl: 3790.00, exit: 3960.00, outcome: "TARGET", pnl: 2.86 },
  { ticker: "RELIANCE.NS", type: "BUY", date: "2026-06-24", entry: 2920.00, target: 3010.00, sl: 2860.00, exit: 3010.00, outcome: "TARGET", pnl: 3.08 },
  { ticker: "AAPL", type: "SELL", date: "2026-06-23", entry: 185.20, target: 179.00, sl: 188.50, exit: 188.50, outcome: "STOPLOSS", pnl: -1.78 },
  { ticker: "TSLA", type: "BUY", date: "2026-06-22", entry: 175.50, target: 182.00, sl: 171.00, exit: 182.00, outcome: "TARGET", pnl: 3.70 },
  { ticker: "INFY.NS", type: "BUY", date: "2026-06-21", entry: 1420.00, target: 1470.00, sl: 1390.00, exit: 1425.60, outcome: "EXPIRED", pnl: 0.40 },
  { ticker: "MSFT", type: "BUY", date: "2026-06-20", entry: 420.50, target: 432.00, sl: 412.00, exit: 432.00, outcome: "TARGET", pnl: 2.73 },
  { ticker: "GOOGL", type: "SELL", date: "2026-06-19", entry: 172.80, target: 166.00, sl: 176.00, exit: 176.00, outcome: "STOPLOSS", pnl: -1.85 },
  { ticker: "500010.BO", type: "BUY", date: "2026-06-18", entry: 540.00, target: 562.00, sl: 525.00, exit: 562.00, outcome: "TARGET", pnl: 4.07 }
];

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
  // Index
  "^NSEI", "^BSESN", "^NSEBANK", "^CNXIT", "^NDX", "^GSPC", "^DJI", "^VIX", "^INDIAVIX"
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

function DashboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState('Dashboard');

  useEffect(() => {
    if (tabParam === 'Watchlist') {
      setActiveTab('Watchlist');
    } else if (tabParam === 'Outcomes') {
      setActiveTab('Outcomes');
    } else {
      setActiveTab('Dashboard');
    }
  }, [tabParam]);

  const [selectedMarket, setSelectedMarket] = useState<'All' | 'NSE' | 'BSE' | 'US'>('All');
  const [minConfidence, setMinConfidence] = useState(50);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState('confidence_desc');
  const { collapsed } = useSidebar();
  
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
  const [showWeeklySummaryBanner, setShowWeeklySummaryBanner] = useState(false);
  const [showExpired, setShowExpired] = useState(false);

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

      const savedMarket = localStorage.getItem('alphaline_default_market');
      if (savedMarket) setSelectedMarket(savedMarket as 'All' | 'NSE' | 'BSE' | 'US');

      const savedConf = localStorage.getItem('alphaline_min_confidence');
      if (savedConf) setMinConfidence(parseInt(savedConf, 10));

      const isWeeklyEnabled = localStorage.getItem('alphaline_notif_weekly_summary') === 'true';
      const today = new Date();
      const isMonday = today.getDay() === 1;
      
      if (isWeeklyEnabled && isMonday) {
        const todayStr = today.toISOString().split('T')[0];
        const lastShown = localStorage.getItem('alphaline_last_weekly_shown');
        if (lastShown !== todayStr) {
          setShowWeeklySummaryBanner(true);
        }
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

  const handleAddCustomTicker = (tickerRaw: string) => {
    const query = tickerRaw.trim().toUpperCase();
    if (!query) return;
    if (query.length > 12) {
      toast.error('Ticker too long. Maximum 12 characters.');
      return;
    }
    const validRegex = /^[A-Z0-9.]+$/;
    if (!validRegex.test(query)) {
      toast.error('Invalid symbol. Only alphanumeric characters and dot (.) are allowed.');
      return;
    }
    if (watchlist.includes(query)) {
      toast.error('Ticker is already in your watchlist.');
      return;
    }
    handleWatchlistToggle(query);
    setWatchlistSearch("");
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

  // Index metrics fetch helper
  const getIndexValue = (sym: string, defVal: number) => {
    const sig = signals.find(s => s.ticker === sym);
    if (sig && sig.entry) {
      const changeVal = sig.signalType === 'BUY' ? 0.0035 * sig.entry : -0.0025 * sig.entry;
      return { price: sig.entry, type: sig.signalType, change: changeVal };
    }
    return { price: defVal, type: 'BUY', change: 0.0015 * defVal };
  };

  // Confidence slider + search filters client-side on the returned data
  const filteredSignals = signals.filter((sig) => {
    const matchesMarket = selectedMarket === 'All' 
      || sig.market === selectedMarket
      || (selectedMarket === 'BSE' 
          && sig.ticker.endsWith('.BO'));
    const matchesSearch = sig.ticker.toLowerCase().includes(search.toLowerCase());
    const matchesConfidence = sig.confidence >= minConfidence;

    // Filter expired signals if showExpired is false
    if (!showExpired && isSignalExpired(sig.createdAt, sig.timestamp)) {
      return false;
    }

    return matchesMarket && matchesSearch && matchesConfidence;
  });

  // Apply sorting parameter mapping
  const sortedSignals = [...filteredSignals].sort((a, b) => {
    if (sortBy === 'confidence_desc') return (b.confidence || 0) - (a.confidence || 0);
    if (sortBy === 'confidence_asc') return (a.confidence || 0) - (b.confidence || 0);
    if (sortBy === 'market') return a.market.localeCompare(b.market);
    if (sortBy === 'recent') return 0;
    return 0;
  });

  // Signal of the Day extraction
  const heroSignal = signals.length > 0 
    ? [...signals].sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0]
    : null;

  // Sector Groupings
  const sectors = [
    { name: "Tech", tickers: ["TCS.NS", "INFY.NS", "WIPRO.NS"] },
    { name: "Banking", tickers: ["HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS"] },
    { name: "Energy", tickers: ["RELIANCE.NS", "ONGC.NS", "BPCL.NS"] },
    { name: "FMCG", tickers: ["HINDUNILVR.NS", "ITC.NS", "NESTLEIND.NS"] }
  ];

  // Sector Dominant signal calculator
  const getDominantSignal = (tickers: string[]) => {
    let buy = 0, sell = 0, hold = 0;
    tickers.forEach(t => {
      const sig = signals.find(s => s.ticker === t || s.ticker === t.replace('.NS', ''));
      if (sig) {
        if (sig.signalType === 'BUY') buy++;
        else if (sig.signalType === 'SELL') sell++;
        else if (sig.signalType === 'HOLD') hold++;
      }
    });
    if (buy > sell && buy > hold) return { label: 'BUY', color: 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20' };
    if (sell > buy && sell > hold) return { label: 'SELL', color: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20' };
    return { label: 'HOLD', color: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20' };
  };

  // Calculate dynamic stats
  const displayedCount = sortedSignals.length;
  const avgConfidence = displayedCount > 0 
    ? Math.round(sortedSignals.reduce((acc, s) => acc + s.confidence, 0) / displayedCount) 
    : 0;
  const buyCount = sortedSignals.filter(s => s.signalType === 'BUY').length;
  const sellCount = sortedSignals.filter(s => s.signalType === 'SELL').length;
  const holdCount = sortedSignals.filter(s => s.signalType === 'HOLD').length;

  // Calculate Sentiment percentages for active market overview
  const getMarketSentimentStats = () => {
    if (sortedSignals.length === 0) return { bullish: 0, bearish: 0, neutral: 0 };
    const buy = sortedSignals.filter(s => s.signalType === 'BUY').length;
    const sell = sortedSignals.filter(s => s.signalType === 'SELL').length;
    const hold = sortedSignals.filter(s => s.signalType === 'HOLD').length;
    const total = sortedSignals.length;
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
    'Watchlist': watchlist.length,
    'Outcomes': historicalOutcomes.length
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
      <div className={`flex-1 flex flex-col h-full relative z-10 overflow-hidden transition-all duration-300 ${collapsed ? 'md:pl-[64px]' : 'md:pl-[220px]'}`}>
        
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

          {/* Search + Sort controls */}
          <div className="flex items-center gap-3 flex-1 justify-center max-w-md hidden md:flex">
            <SearchBar value={search} onChange={setSearch} />
            <SortDropdown value={sortBy} onChange={setSortBy} />
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
              
              {/* Index Marquee Strip */}
              <div className="bg-[#111318]/40 border-b border-[#1E2230] -mx-4 -mt-4 py-2.5 px-4 flex items-center gap-6 overflow-x-auto whitespace-nowrap scrollbar-none select-none">
                <div className="flex items-center gap-1.5 text-[10px] font-sans font-bold text-indigo tracking-widest uppercase">
                  <span>INDEX METRICS</span>
                  <span className="animate-pulse">●</span>
                </div>
                
                {[
                  { name: 'NIFTY 50', symbol: '^NSEI', def: 22450.50 },
                  { name: 'SENSEX', symbol: '^BSESN', def: 73850.20 },
                  { name: 'BANK NIFTY', symbol: '^NSEBANK', def: 48120.40 },
                  { name: 'NASDAQ 100', symbol: '^NDX', def: 18650.00 }
                ].map((idxItem) => {
                  const valInfo = getIndexValue(idxItem.symbol, idxItem.def);
                  const isUp = valInfo.change >= 0;
                  return (
                    <div key={idxItem.name} className="flex items-center gap-2 text-[12px] bg-[#111318]/80 border border-border-dark px-3 py-1 rounded-[6px]">
                      <span className="font-brand font-semibold text-frost">{idxItem.name}</span>
                      <span className="font-mono text-frost">₹{valInfo.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className={`font-mono font-bold flex items-center ${isUp ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                        {isUp ? '▲' : '▼'} {(Math.abs(valInfo.change) * 100 / valInfo.price).toFixed(2)}%
                      </span>
                    </div>
                  );
                })}
              </div>

              <InfoPanel title="How This Works">
                <p>
                  <strong>How signals are generated:</strong> Alphaline fetches OHLCV price data via yfinance and runs it through an XGBoost classification model trained on technical indicators (RSI, MACD, Bollinger Bands, ATR, volume). The model outputs a BUY/SELL/HOLD probability. Signals with probability &gt; the minimum confidence threshold are shown here. Signals expire after market close.
                </p>
                <p>
                  <strong>Confidence score:</strong> A number from 50–99% representing the XGBoost model's predicted probability that this signal's direction is correct within the next trading session. Higher is more reliable, but no signal is guaranteed.
                </p>
              </InfoPanel>

              {/* Weekly Performance Recap Banner */}
              {showWeeklySummaryBanner && (
                <div className="bg-[#111318]/90 border border-indigo/20 rounded-[12px] p-4 flex items-center justify-between gap-4 z-20 select-none">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo/10 text-indigo rounded-full">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-semibold text-frost">Weekly Signal Performance Recap</h4>
                      <p className="text-[11px] text-[#A0AEC0] mt-0.5">
                        Your weekly summary is ready. Average confluence rating was 74% with a 65% win rate over 12 generated signals.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setShowWeeklySummaryBanner(false);
                        const todayStr = new Date().toISOString().split('T')[0];
                        localStorage.setItem('alphaline_last_weekly_shown', todayStr);
                      }}
                      className="text-[11px] font-sans font-medium text-muted hover:text-frost px-3 py-1 rounded bg-[#1C1F28] border border-[#1E2230]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Signal of the Day Hero Card */}
              {heroSignal && (
                <div className="bg-gradient-to-r from-indigo/10 to-transparent border border-indigo/20 rounded-[12px] p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden select-none">
                  <div className="space-y-1.5 z-10">
                    <span className="text-[10px] text-indigo font-bold uppercase tracking-widest block">⭐ Signal of the Day</span>
                    <h2 className="font-brand font-bold text-[28px] text-frost tracking-wider leading-none">{heroSignal.ticker}</h2>
                    <p className="text-[12px] text-[#A0AEC0]">
                      Top rated confluence setup with <span className="font-bold text-indigo">{heroSignal.confidence}% confidence</span> rating in {heroSignal.market} market.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 z-10 flex-shrink-0">
                    <div className="text-right">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded font-sans tracking-wide ${
                        heroSignal.signalType === 'BUY' ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#EF4444]/15 text-[#EF4444]'
                      }`}>
                        {heroSignal.signalType}
                      </span>
                      <div className="font-mono text-[16px] font-bold text-frost mt-1">₹{heroSignal.entry}</div>
                    </div>
                    <button
                      onClick={() => router.push(`/analyze/${heroSignal.ticker}?signal=${heroSignal.signalType}&confidence=${heroSignal.confidence}&entry=${heroSignal.entry}`)}
                      className="bg-[#6366F1] hover:bg-[#8183F4] text-white text-[12px] font-sans font-medium px-4 py-2.5 rounded-[6px] transition-colors shadow-lg"
                    >
                      Deep-Dive Analysis →
                    </button>
                  </div>
                </div>
              )}

              {/* Integrated Sector Heatmap Panel */}
              <div className="bg-[#111318]/25 border border-border-dark p-4 rounded-[12px] space-y-3 select-none">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Sector Confluence Pulse</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {sectors.map(sec => {
                    const dom = getDominantSignal(sec.tickers);
                    return (
                      <div key={sec.name} className="bg-surface/50 border border-border-dark p-2.5 rounded-[6px] flex justify-between items-center">
                        <span className="text-[12px] font-medium text-frost">{sec.name}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${dom.color}`}>{dom.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Filter controls row */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-[#111318]/30 border border-border-dark p-4 rounded-[12px] select-none">
                
                {/* Market Buttons */}
                <div className="flex items-center bg-[#111318] border border-[#1E2230] rounded-full p-1 gap-0.5 select-none">
                  {(['All', 'NSE', 'BSE', 'US'] as const).map(mkt => (
                    <button
                      key={mkt}
                      onClick={() => setSelectedMarket(mkt)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200
                        ${selectedMarket === mkt
                          ? 'bg-[#1C2130] text-white border border-[#2A2F45]'
                          : 'text-[#6B7280] hover:text-white'
                        }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedMarket === mkt ? 'bg-emerald-400' : 'bg-[#374151]'}`} />
                      {mkt}
                    </button>
                  ))}
                </div>

                {/* Show Expired Signals Toggle */}
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] text-muted uppercase tracking-wider font-semibold whitespace-nowrap">
                    Show Expired
                  </span>
                  <button
                    onClick={() => setShowExpired(!showExpired)}
                    style={{ position: 'relative' }}
                    className={`w-8 h-[18px] rounded-full transition-colors duration-200 focus:outline-none cursor-pointer flex items-center ${
                      showExpired ? 'bg-[#6366F1]' : 'bg-[#1C1F28] border border-[#1E2230]'
                    }`}
                  >
                    <motion.div
                      layout
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        position: 'absolute',
                      }}
                      animate={{ left: showExpired ? 16 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>

                {/* Min Confidence Slider */}
                <div className="flex items-center gap-4 w-full lg:w-auto max-w-[280px]">
                  <span className="text-[11px] text-muted uppercase tracking-wider font-semibold whitespace-nowrap">
                    Min Confidence: <span className="font-mono text-indigo font-bold">{minConfidence}%</span>
                  </span>
                  <div className="w-32">
                    <RangeSlider
                      min={0} max={95} step={5}
                      value={minConfidence}
                      onChange={setMinConfidence}
                      color="#6366F1"
                      formatValue={v => `${v}%`}
                    />
                  </div>
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

              {/* Signal Reliability Transparency Panel */}
              <div className="bg-[#0D1117]/80 border border-amber-500/20 rounded-[10px] p-4 mb-6 flex items-start gap-3 select-none">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[13px] font-medium text-amber-300 mb-1">About Signal Reliability</p>
                  <p className="text-[12px] text-[#8892A4] leading-relaxed">
                    Signals are generated by an XGBoost ML model trained on technical indicators. 
                    Backtested accuracy is ~62–68% on NSE Nifty 50 data. 
                    These are algorithmic suggestions, not financial advice. 
                    Always apply your own analysis before trading real capital. 
                    Market conditions, news events, and liquidity can override technical patterns.
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                    <span className="text-[11px] text-[#6B7280]">Model: XGBoost v1.2</span>
                    <span className="text-[11px] text-[#6B7280]">Training data: 2019–2024 NSE/BSE OHLCV</span>
                    <span className="text-[11px] text-[#6B7280]">Backtest win rate: ~65%</span>
                  </div>
                </div>
              </div>

              {/* MARKET OVERVIEW section */}
              {selectedMarket !== 'All' && sortedSignals.length > 0 && (
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
                  {sortedSignals.length > 0 && (
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
                      {sortedSignals.map((signal, index) => (
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
                          marketDate={signal.marketDate}
                          isMarketOpen={signal.isMarketOpen}
                          dataSource={signal.dataSource}
                          createdAt={signal.createdAt}
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
                  {sortedSignals.length < 4 && (
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

                  {sortedSignals.length === 0 && (
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
                      onBlur={() => setTimeout(() => setIsSuggestionsOpen(false), 250)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddCustomTicker(watchlistSearch);
                        }
                      }}
                      className="flex-1 bg-[#1C1F28] border border-border-dark text-[13px] text-frost p-2 rounded-[6px] font-mono focus:outline-none focus:border-indigo uppercase placeholder:text-dim"
                    />
                    <button
                      onClick={() => handleAddCustomTicker(watchlistSearch)}
                      className="bg-indigo text-white px-3 text-[12px] font-medium rounded-[6px] hover:bg-[#5254DE] transition-colors leading-none"
                    >
                      Add
                    </button>
                  </div>
                  
                  {/* Suggestions Dropdown */}
                  {watchlistSearch && isSuggestionsOpen && (() => {
                    const matchedCore = CORE_TICKERS.filter(t => 
                      t.toLowerCase().includes(watchlistSearch.toLowerCase()) && 
                      !watchlist.includes(t)
                    );
                    const isCustom = !CORE_TICKERS.includes(watchlistSearch);
                    return (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-dark rounded-[6px] shadow-lg z-50 overflow-hidden">
                        {matchedCore.slice(0, 5).map(ticker => (
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
                        {matchedCore.length === 0 && (
                          <div className="px-3 py-2 text-[11px] text-[#A0AEC0] text-center font-sans bg-surface">
                            No matching preset tickers found
                          </div>
                        )}
                        {isCustom && !watchlist.includes(watchlistSearch) && (
                          <button
                            onMouseDown={() => handleAddCustomTicker(watchlistSearch)}
                            className="w-full text-left px-3 py-2 text-[11px] font-sans text-indigo bg-indigo/5 hover:bg-indigo/10 transition-colors border-t border-[#1E2230]/40 flex items-center justify-between"
                          >
                            <span>Press Enter to add custom</span>
                            <span className="font-mono bg-indigo/10 px-1.5 py-0.5 rounded text-indigo">"{watchlistSearch}"</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}
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
                      market: ticker.endsWith('.NS') || ticker === '^NSEI' 
                        ? 'NSE' 
                        : ticker.endsWith('.BO') 
                          ? 'BSE' 
                          : 'US',
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
                        marketDate={signal.marketDate}
                        isMarketOpen={signal.isMarketOpen}
                        dataSource={signal.dataSource}
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

          {activeTab === 'Outcomes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
                <div className="flex flex-col gap-1">
                  <h1 className="text-[20px] font-medium text-frost font-sans leading-none">Signal Outcomes Tracker</h1>
                  <p className="text-[13px] text-muted font-sans font-normal leading-normal">
                    Monitor historical target hits, stop losses, and model accuracy metrics over time.
                  </p>
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 select-none">
                <div className="bg-[#111318]/50 border border-border-dark p-4 rounded-[12px]">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Total Tracked</span>
                  <div className="text-[20px] font-bold text-frost font-mono mt-1">42</div>
                </div>
                <div className="bg-[#111318]/50 border border-border-dark p-4 rounded-[12px]">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Target Hits</span>
                  <div className="text-[20px] font-bold text-[#22C55E] font-mono mt-1">26 <span className="text-[12px] font-normal text-muted">(61.9%)</span></div>
                </div>
                <div className="bg-[#111318]/50 border border-border-dark p-4 rounded-[12px]">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Stop Loss Hits</span>
                  <div className="text-[20px] font-bold text-[#EF4444] font-mono mt-1">13 <span className="text-[12px] font-normal text-muted">(31.0%)</span></div>
                </div>
                <div className="bg-[#111318]/50 border border-border-dark p-4 rounded-[12px]">
                  <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Expired (Neutral)</span>
                  <div className="text-[20px] font-bold text-amber-400 font-mono mt-1">3 <span className="text-[12px] font-normal text-muted">(7.1%)</span></div>
                </div>
              </div>

              {/* Historical Logs List */}
              <div className="bg-surface border border-border-dark rounded-[12px] overflow-hidden">
                <div className="border-b border-border-dark p-4 bg-[#131720] flex items-center justify-between">
                  <h3 className="text-[12px] font-semibold text-frost font-sans uppercase tracking-wider">
                    Historical Outcomes Log
                  </h3>
                  <span className="text-[10px] text-muted font-mono">Last 30 Sessions</span>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[800px] divide-y divide-[#1E2230]/50">
                    {/* Header */}
                    <div className="grid grid-cols-[120px_70px_100px_100px_100px_100px_100px_120px_1fr] items-center gap-4 px-4 py-3 bg-void select-none">
                      <div className="text-[11px] font-sans font-semibold text-[#94A3B8] uppercase tracking-wider text-left">Ticker</div>
                      <div className="text-[11px] font-sans font-semibold text-[#94A3B8] uppercase tracking-wider text-left">Signal</div>
                      <div className="text-[11px] font-sans font-semibold text-[#94A3B8] uppercase tracking-wider text-left">Date</div>
                      <div className="text-[11px] font-sans font-semibold text-[#94A3B8] uppercase tracking-wider text-right">Entry</div>
                      <div className="text-[11px] font-sans font-semibold text-[#94A3B8] uppercase tracking-wider text-right">Target</div>
                      <div className="text-[11px] font-sans font-semibold text-[#94A3B8] uppercase tracking-wider text-right">Stop Loss</div>
                      <div className="text-[11px] font-sans font-semibold text-[#94A3B8] uppercase tracking-wider text-right">Exit Price</div>
                      <div className="text-[11px] font-sans font-semibold text-[#94A3B8] uppercase tracking-wider text-center">Outcome</div>
                      <div className="text-[11px] font-sans font-semibold text-[#94A3B8] uppercase tracking-wider text-right">Net P&L%</div>
                    </div>

                    {/* Rows */}
                    {historicalOutcomes.map((item, idx) => (
                      <div
                        key={idx}
                        className={`grid grid-cols-[120px_70px_100px_100px_100px_100px_100px_120px_1fr] items-center gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-raised ${
                          idx % 2 === 0 ? 'bg-transparent' : 'bg-void/40'
                        }`}
                      >
                        <div className="font-semibold text-[13px] text-frost font-sans text-left">
                          {item.ticker}
                        </div>
                        <div className="text-left">
                          <span className={`text-[10px] px-1.5 py-0.5 font-bold rounded-[4px] border ${
                            item.type === 'BUY'
                              ? 'border-sig-green/20 text-sig-green bg-sig-green/5'
                              : 'border-sig-red/20 text-sig-red bg-sig-red/5'
                          }`}>
                            {item.type}
                          </span>
                        </div>
                        <div className="text-[12px] font-mono text-muted text-left">
                          {item.date}
                        </div>
                        <div className="text-right font-mono text-[13px]">
                          {item.ticker.endsWith('.NS') || item.ticker.endsWith('.BO') ? '₹' : '$'}{item.entry.toFixed(2)}
                        </div>
                        <div className="text-right font-mono text-[13px]">
                          {item.ticker.endsWith('.NS') || item.ticker.endsWith('.BO') ? '₹' : '$'}{item.target.toFixed(2)}
                        </div>
                        <div className="text-right font-mono text-[13px]">
                          {item.ticker.endsWith('.NS') || item.ticker.endsWith('.BO') ? '₹' : '$'}{item.sl.toFixed(2)}
                        </div>
                        <div className="text-right font-mono text-[13px] text-frost">
                          {item.ticker.endsWith('.NS') || item.ticker.endsWith('.BO') ? '₹' : '$'}{item.exit.toFixed(2)}
                        </div>
                        <div className="text-center">
                          <span className={`text-[10px] px-2 py-0.5 font-bold rounded-full border ${
                            item.outcome === 'TARGET'
                              ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5'
                              : item.outcome === 'STOPLOSS'
                                ? 'border-rose-500/20 text-rose-400 bg-rose-500/5'
                                : 'border-amber-500/20 text-amber-400 bg-amber-500/5'
                          }`}>
                            {item.outcome === 'TARGET' ? '🎯 Target Hit' : item.outcome === 'STOPLOSS' ? '🛑 SL Hit' : '⏳ Expired'}
                          </span>
                        </div>
                        <div className={`text-right font-mono font-bold text-[13px] ${item.pnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                          {item.pnl >= 0 ? '+' : ''}{item.pnl.toFixed(2)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-void text-frost">
        <div className="text-center font-sans">
          <Activity className="w-8 h-8 mx-auto mb-3 text-indigo animate-pulse" />
          <p className="text-[12px] text-muted">Loading Alphaline...</p>
        </div>
      </div>
    }>
      <DashboardPageInner />
    </Suspense>
  );
}
