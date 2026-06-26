'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import SignalCard from '@/components/SignalCard';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Star, Activity, ShieldAlert, Terminal } from 'lucide-react';

export function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Dashboard');

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
  const [selectedMarket, setSelectedMarket] = useState<'All' | 'NSE' | 'BSE' | 'US'>('All');
  const [minConfidence, setMinConfidence] = useState(50);
  
  // Dynamic signals data state
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Risk Calculator State
  const [portfolioSize, setPortfolioSize] = useState('50000');
  const [riskPercent, setRiskPercent] = useState('2');
  const [selectedRiskTicker, setSelectedRiskTicker] = useState('RELIANCE.NS');

  // Navigation items for mobile bottom nav
  const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Watchlist', icon: <Star className="w-5 h-5" /> },
    { name: 'Backtest', icon: <Activity className="w-5 h-5" /> },
    { name: 'Risk', icon: <ShieldAlert className="w-5 h-5" /> },
    { name: 'API', icon: <Terminal className="w-5 h-5" /> },
  ];

  // Fetch signals from our Next.js API route
  const fetchSignals = async (market: string, showLoadingIndicator = false) => {
    try {
      if (showLoadingIndicator) {
        setIsLoading(true);
      }
      setError(null);
      
      const response = await fetch(`/api/signals?market=${market}`);
      if (!response.ok) {
        throw new Error("Signal feed unavailable");
      }
      
      const data = await response.json();
      if (data.success) {
        setSignals(data.signals);
      } else {
        setError(data.error || "Signal feed unavailable");
      }
    } catch (err: any) {
      setError("Signal feed unavailable");
      console.error("Error fetching signals:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const [wsStatus, setWsStatus] = useState<'connected' | 'reconnecting'>('reconnecting');

  // WebSocket connection effect (runs once on mount)
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "wss://placeholder-ws-url.execute-api.us-east-1.amazonaws.com/production";

    const connectWS = () => {
      try {
        console.log(`Connecting to WebSocket: ${wsUrl}`);
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log("WebSocket connected successfully");
          setWsStatus('connected');
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === "SIGNAL_UPDATE" && message.data) {
              const item = message.data;
              const ticker = item.PK ? item.PK.replace(/^TICKER#/, "") : "UNKNOWN";
              
              const newSignal = {
                id: item.PK + "_" + item.SK,
                ticker: ticker,
                market: item.market || "NSE",
                signalType: item.signal_type || "BUY",
                confidence: item.confidence_score ? parseInt(item.confidence_score, 10) : 50,
                entry: item.entry_price ? parseFloat(item.entry_price) : 0,
                stopLoss: item.stop_loss ? parseFloat(item.stop_loss) : 0,
                target: item.target_price ? parseFloat(item.target_price) : 0,
                timestamp: "Just now",
                isNew: true, // Used for slide-in animation class
              };

              setSignals((prev) => {
                // Avoid duplicates
                if (prev.some((s) => s.id === newSignal.id)) return prev;
                return [newSignal, ...prev];
              });
            }
          } catch (err) {
            console.error("Error parsing WebSocket message:", err);
          }
        };

        socket.onclose = () => {
          console.log("WebSocket disconnected. Retrying in 5 seconds...");
          setWsStatus('reconnecting');
          reconnectTimeout = setTimeout(connectWS, 5000);
        };

        socket.onerror = (err) => {
          console.error("WebSocket error:", err);
          socket?.close();
        };

      } catch (e) {
        console.error("WebSocket connection setup error:", e);
        setWsStatus('reconnecting');
      }
    };

    connectWS();

    return () => {
      if (socket) socket.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  // Fetch signals when selectedMarket changes, and set up 60s fallback polling if WS is disconnected
  useEffect(() => {
    fetchSignals(selectedMarket, true);

    let interval: NodeJS.Timeout | null = null;
    if (wsStatus === 'reconnecting') {
      interval = setInterval(() => {
        fetchSignals(selectedMarket, false);
      }, 60000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedMarket, wsStatus]);

  // Confidence slider filters client-side on the returned data
  const filteredSignals = signals.filter((sig) => {
    return sig.confidence >= minConfidence;
  });

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
            <div className="mb-8">
              <h1 className="text-[20px] font-medium text-frost mb-1.5 font-sans leading-none flex items-center gap-2">
                Confluence Signals
                {wsStatus === 'connected' ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border border-sig-green/20 bg-sig-green/5 text-sig-green text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                    LIVE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border border-sig-amber/20 bg-sig-amber/5 text-sig-amber text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                    RECONNECTING...
                  </span>
                )}
              </h1>
              <p className="text-[13px] text-muted font-sans font-normal leading-normal">
                Real-time AI-generated entry, stop-loss, and target levels.
              </p>
            </div>

            {/* Filter and Control Panel */}
            <div className="bg-surface border border-border-dark p-4 rounded-[6px] mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
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
            ) : error ? (
              /* Error State */
              <div className="border border-sig-red/20 bg-sig-red/5 p-8 text-center rounded-[6px]">
                <p className="text-[13px] text-sig-red font-sans font-medium">{error}</p>
              </div>
            ) : filteredSignals.length > 0 ? (
              /* Signals Grid */
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

        {/* Render Backtest Tab */}
        {activeTab === 'Backtest' && (
          <div>
            <div className="mb-8">
              <h1 className="text-[20px] font-medium text-frost mb-1.5 font-sans leading-none">Strategy Backtests</h1>
              <p className="text-[13px] text-muted font-sans font-normal leading-normal">
                Historical win rate and performance analytics of the confluence engine.
              </p>
            </div>

            {/* Backtest Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-surface border border-border-dark p-4 rounded-[6px]">
                <div className="text-[11px] text-dim font-sans mb-1 leading-none">Win Rate</div>
                <div className="text-[20px] font-mono font-medium text-sig-green leading-none">73.8%</div>
              </div>
              <div className="bg-surface border border-border-dark p-4 rounded-[6px]">
                <div className="text-[11px] text-dim font-sans mb-1 leading-none">Avg Return</div>
                <div className="text-[20px] font-mono font-medium text-frost leading-none">+4.92%</div>
              </div>
              <div className="bg-surface border border-border-dark p-4 rounded-[6px]">
                <div className="text-[11px] text-dim font-sans mb-1 leading-none">Total Trades</div>
                <div className="text-[20px] font-mono font-medium text-frost leading-none">384</div>
              </div>
            </div>

            {/* Historical Table */}
            <div className="bg-surface border border-border-dark rounded-[6px] overflow-hidden">
              <div className="border-b border-border-dark p-3 bg-[#131720]">
                <span className="text-[12px] font-medium text-frost font-sans">Recent Performance Logs</span>
              </div>
              <div className="divide-y divide-[#1E2230]/50 font-sans">
                {[
                  { ticker: 'RELIANCE.NS', type: 'BUY', result: '+8.4%', status: 'PROFIT' },
                  { ticker: 'AAPL', type: 'BUY', result: '+3.1%', status: 'PROFIT' },
                  { ticker: 'TCS.NS', type: 'SELL', result: '+2.8%', status: 'PROFIT' },
                  { ticker: 'HDFC.NS', type: 'SELL', result: '-1.5%', status: 'LOSS' },
                ].map((log, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="text-frost font-medium">{log.ticker}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-[4px] border ${
                        log.type === 'BUY' ? 'border-sig-green/20 text-sig-green bg-sig-green/5' : 'border-sig-red/20 text-sig-red bg-sig-red/5'
                      }`}>{log.type}</span>
                    </div>
                    <span className={`font-mono font-medium ${log.status === 'PROFIT' ? 'text-sig-green' : 'text-sig-red'}`}>
                      {log.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Render Risk Tab */}
        {activeTab === 'Risk' && (
          <div>
            <div className="mb-8">
              <h1 className="text-[20px] font-medium text-frost mb-1.5 font-sans leading-none">Risk Management</h1>
              <p className="text-[13px] text-muted font-sans font-normal leading-normal">
                Determine appropriate position sizes based on capital constraints and signal parameters.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Inputs */}
              <div className="bg-surface border border-border-dark p-4 rounded-[6px] space-y-4">
                <div>
                  <label className="block text-[11px] text-dim font-sans mb-1.5">Capital Size ($ or ₹)</label>
                  <input
                    type="number"
                    value={portfolioSize}
                    onChange={(e) => setPortfolioSize(e.target.value)}
                    className="w-full bg-raised border border-border-dark text-[13px] text-frost p-2 rounded-[6px] font-mono focus:outline-none focus:border-indigo"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-dim font-sans mb-1.5">Risk Per Trade (%)</label>
                  <input
                    type="number"
                    value={riskPercent}
                    onChange={(e) => setRiskPercent(e.target.value)}
                    className="w-full bg-raised border border-border-dark text-[13px] text-frost p-2 rounded-[6px] font-mono focus:outline-none focus:border-indigo"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-dim font-sans mb-1.5">Select Signal Setup</label>
                  <select
                    value={selectedRiskTicker}
                    onChange={(e) => setSelectedRiskTicker(e.target.value)}
                    className="w-full bg-raised border border-border-dark text-[13px] text-frost p-2 rounded-[6px] font-sans focus:outline-none focus:border-indigo"
                  >
                    {signals.length > 0 ? (
                      signals.slice(0, 4).map((sig) => (
                        <option key={sig.ticker} value={sig.ticker}>
                          {sig.ticker} ({sig.signalType})
                        </option>
                      ))
                    ) : (
                      <option value="RELIANCE.NS">RELIANCE.NS (BUY)</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Calculations */}
              {(() => {
                const activeSignal = signals.find((s) => s.ticker === selectedRiskTicker) || {
                  ticker: 'RELIANCE.NS',
                  signalType: 'BUY',
                  confidence: 81,
                  entry: 2847.50,
                  stopLoss: 2790.00,
                  target: 2960.00,
                  timestamp: '2 min ago'
                };
                const cap = parseFloat(portfolioSize) || 0;
                const riskDec = (parseFloat(riskPercent) || 0) / 100;
                const riskAmount = cap * riskDec;
                const diff = Math.abs(activeSignal.entry - activeSignal.stopLoss);
                const posSize = diff > 0 ? riskAmount / diff : 0;
                const totalCapital = posSize * activeSignal.entry;

                return (
                  <div className="bg-[#131720] border border-border-dark p-5 rounded-[6px] flex flex-col justify-between">
                    <div>
                      <h3 className="text-[13px] font-medium text-frost mb-4 font-sans">Allocation Calculation</h3>
                      <div className="space-y-3 font-sans">
                        <div className="flex justify-between items-center text-[12px]">
                          <span className="text-muted">Total Risk Capital:</span>
                          <span className="font-mono text-frost font-medium">{riskAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[12px]">
                          <span className="text-muted">Stop Loss Distance:</span>
                          <span className="font-mono text-frost font-medium">{diff.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[12px] border-t border-border-dark/50 pt-3 mt-3">
                          <span className="text-muted">Recommended Position Size:</span>
                          <span className="font-mono text-indigo font-semibold text-[14px]">{posSize.toFixed(1)} Shares</span>
                        </div>
                        <div className="flex justify-between items-center text-[12px]">
                          <span className="text-muted">Max Order Value:</span>
                          <span className="font-mono text-frost font-medium">{totalCapital.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 text-[10px] text-muted font-sans bg-raised p-2 rounded-[6px] border border-border-dark/50">
                      Recommendation limits risk per trade to {riskPercent}% of total portfolio value.
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Render API Tab */}
        {activeTab === 'API' && (
          <div>
            <div className="mb-8">
              <h1 className="text-[20px] font-medium text-frost mb-1.5 font-sans leading-none">Developer API</h1>
              <p className="text-[13px] text-muted font-sans font-normal leading-normal">
                Query confluence signals directly from your custom applications.
              </p>
            </div>

            <div className="space-y-4">
              {/* API Credentials */}
              <div className="bg-surface border border-border-dark p-4 rounded-[6px]">
                <h3 className="text-[13px] font-medium text-frost mb-3 font-sans">Your API Credentials</h3>
                <div>
                  <label className="block text-[11px] text-dim font-sans mb-1">Active Sandbox Key</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value="pk_sandbox_51M812hL9A1N91c01eN92b02"
                      className="w-full bg-raised border border-border-dark text-[12px] text-muted p-2 rounded-[6px] font-mono focus:outline-none"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText('pk_sandbox_51M812hL9A1N91c01eN92b02')}
                      className="bg-indigo text-white text-[12px] font-medium px-4 rounded-[6px] hover:bg-[#5254DE] transition-colors duration-150 font-sans"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* Endpoint Documentation */}
              <div className="bg-surface border border-border-dark rounded-[6px] overflow-hidden">
                <div className="border-b border-border-dark p-3 bg-[#131720]">
                  <span className="text-[12px] font-medium text-frost font-sans">Query Signals Endpoint</span>
                </div>
                <div className="p-4 space-y-3 font-sans">
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] px-2 py-0.5 bg-[#22C55E]/10 border border-[#22C55E]/20 text-sig-green font-medium rounded-[4px] font-sans">GET</span>
                    <span className="font-mono text-[12px] text-frost">https://api.alphaline.fi/v1/signals</span>
                  </div>
                  <p className="text-[12px] text-muted">
                    Query the live signal database. Accepts parameters like <code className="text-frost font-mono text-[11px] bg-raised px-1 py-0.5 rounded-[4px]">market</code>, <code className="text-frost font-mono text-[11px] bg-raised px-1 py-0.5 rounded-[4px]">signal_type</code>, and <code className="text-frost font-mono text-[11px] bg-raised px-1 py-0.5 rounded-[4px]">min_confidence</code>.
                  </p>
                </div>
              </div>
            </div>
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
