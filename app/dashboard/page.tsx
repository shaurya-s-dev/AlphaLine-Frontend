'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import SignalCard from '@/components/SignalCard';

// Mock data exactly as specified
const signals = [
  { id:1, ticker:'RELIANCE.NS', market:'NSE', 
    signalType:'BUY' as const, confidence:81,
    entry:2847.50, stopLoss:2790.00, target:2960.00,
    timestamp:'2 min ago' },
  { id:2, ticker:'TCS.NS', market:'NSE',
    signalType:'SELL' as const, confidence:67,
    entry:3540.00, stopLoss:3610.00, target:3390.00,
    timestamp:'5 min ago' },
  { id:3, ticker:'AAPL', market:'US',
    signalType:'BUY' as const, confidence:74,
    entry:189.20, stopLoss:184.50, target:197.00,
    timestamp:'8 min ago' },
  { id:4, ticker:'INFY.NS', market:'NSE',
    signalType:'HOLD' as const, confidence:54,
    entry:1820.00, stopLoss:1775.00, target:1890.00,
    timestamp:'12 min ago' },
  { id:5, ticker:'NVDA', market:'US',
    signalType:'BUY' as const, confidence:88,
    entry:124.60, stopLoss:119.00, target:134.00,
    timestamp:'15 min ago' },
  { id:6, ticker:'HDFC.NS', market:'NSE',
    signalType:'SELL' as const, confidence:71,
    entry:1640.00, stopLoss:1695.00, target:1570.00,
    timestamp:'18 min ago' },
];

function DashboardPage() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [selectedMarket, setSelectedMarket] = useState<'All' | 'NSE' | 'BSE' | 'US'>('All');
  const [minConfidence, setMinConfidence] = useState(50);

  // Risk Calculator State
  const [portfolioSize, setPortfolioSize] = useState('50000');
  const [riskPercent, setRiskPercent] = useState('2');
  const [selectedRiskTicker, setSelectedRiskTicker] = useState('RELIANCE.NS');

  // Filter signals
  const filteredSignals = signals.filter((sig) => {
    const matchesMarket = selectedMarket === 'All' || sig.market === selectedMarket;
    const matchesConfidence = sig.confidence >= minConfidence;
    return matchesMarket && matchesConfidence;
  });

  // Navigation items for mobile bottom nav
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
      {/* Sidebar for desktop */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 md:pl-[220px] p-6 pb-24 md:pb-6 max-w-5xl w-full mx-auto">
        
        {/* Render Dashboard tab */}
        {activeTab === 'Dashboard' && (
          <div>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-[20px] font-medium text-frost mb-1.5 font-sans leading-none">Confluence Signals</h1>
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

            {/* Signals Grid */}
            {filteredSignals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    isBlurred={index >= 4} // Cards beyond index 4 get blurred
                  />
                ))}
              </div>
            ) : (
              <div className="border border-border-dark bg-surface p-8 text-center rounded-[6px]">
                <p className="text-[13px] text-muted font-sans">No signals match the current filters.</p>
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
                    {signals.slice(0, 4).map((sig) => (
                      <option key={sig.ticker} value={sig.ticker}>
                        {sig.ticker} ({sig.signalType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Calculations */}
              {(() => {
                const activeSignal = signals.find((s) => s.ticker === selectedRiskTicker) || signals[0];
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
              onClick={() => setActiveTab(item.name)}
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
