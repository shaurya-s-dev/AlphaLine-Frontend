'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { toast } from 'sonner';
import { TrendingUp, DollarSign, Briefcase, RotateCcw, XCircle, ArrowUpRight, ArrowDownRight, Play, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Position {
  id: string;
  ticker: string;
  signalType: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  date: string;
}

interface CompletedTrade {
  id: string;
  ticker: string;
  signalType: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  result: 'WIN' | 'LOSS';
  date: string;
}

export default function SimulatorPage() {
  const [mounted, setMounted] = useState(false);
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);

  // Simulation states stored in LocalStorage
  const [balance, setBalance] = useState<number>(100000); 
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<CompletedTrade[]>([]);

  // Modal State for Entering Trade
  const [selectedSignalForTrade, setSelectedSignalForTrade] = useState<any | null>(null);
  const [tradeAmount, setTradeAmount] = useState<number>(5000); // Slider value between 1,000 and 10,000

  useEffect(() => {
    setMounted(true);
    document.title = "Alphaline — Paper Trading Simulator";

    // Load LocalStorage states
    if (typeof window !== 'undefined') {
      const storedBalance = localStorage.getItem('sim_balance_inr');
      const storedPositions = localStorage.getItem('sim_positions');
      const storedHistory = localStorage.getItem('sim_history');

      if (storedBalance) setBalance(parseFloat(storedBalance));
      else {
        // Initial setup
        localStorage.setItem('sim_balance_inr', '100000');
      }
      if (storedPositions) setPositions(JSON.parse(storedPositions));
      if (storedHistory) setHistory(JSON.parse(storedHistory));
    }

    // Fetch active signals
    const fetchSignals = async () => {
      try {
        setIsLoadingSignals(true);
        const res = await fetch('/api/signals?market=all&limit=50');
        if (!res.ok) throw new Error("API failed");
        const data = await res.json();
        if (data.success && data.signals && data.signals.length > 0) {
          setSignals(data.signals.filter((s: any) => s.signalType === 'BUY' || s.signalType === 'SELL'));
        } else {
          throw new Error("Empty signals");
        }
      } catch (e) {
        console.warn("Using fallbacks for simulator active list");
        setSignals([
          { id: 'm1', ticker: 'RELIANCE.NS', market: 'NSE', signalType: 'BUY', confidence: 81, entry: 2847.50, stopLoss: 2790.00, target: 2960.00 },
          { id: 'm2', ticker: 'TCS.NS', market: 'NSE', signalType: 'SELL', confidence: 67, entry: 3850.00, stopLoss: 3920.00, target: 3710.00 },
          { id: 'm3', ticker: 'AAPL', market: 'US', signalType: 'BUY', confidence: 74, entry: 189.20, stopLoss: 185.00, target: 198.00 },
          { id: 'm4', ticker: 'NVDA', market: 'US', signalType: 'BUY', confidence: 88, entry: 125.50, stopLoss: 120.00, target: 135.00 }
        ]);
      } finally {
        setIsLoadingSignals(false);
      }
    };
    fetchSignals();
  }, []);

  // Update current open positions price occasionally with small variance (every 15 seconds)
  useEffect(() => {
    if (positions.length === 0) return;
    const interval = setInterval(() => {
      const updated = positions.map(pos => {
        const changePercent = (Math.random() - 0.49) * 0.006; 
        const nextPrice = pos.currentPrice * (1 + changePercent);
        return {
          ...pos,
          currentPrice: Math.round(nextPrice * 100) / 100
        };
      });
      setPositions(updated);
      localStorage.setItem('sim_positions', JSON.stringify(updated));
    }, 15000);
    return () => clearInterval(interval);
  }, [positions]);

  const saveSimulationData = (newBalance: number, newPositions: Position[], newHistory: CompletedTrade[]) => {
    setBalance(newBalance);
    setPositions(newPositions);
    setHistory(newHistory);
    localStorage.setItem('sim_balance_inr', newBalance.toString());
    localStorage.setItem('sim_positions', JSON.stringify(newPositions));
    localStorage.setItem('sim_history', JSON.stringify(newHistory));
  };

  const handleReset = () => {
    saveSimulationData(100000, [], []);
    toast.success("Simulation portfolio reset to default ₹1,00,000 cash.");
  };

  const handleOpenTradeModal = (signal: any) => {
    setSelectedSignalForTrade(signal);
    setTradeAmount(5000); // Default invest
  };

  const handleConfirmTrade = () => {
    if (!selectedSignalForTrade) return;

    if (tradeAmount > balance) {
      toast.error("Insufficient virtual cash balance.");
      return;
    }

    const entryPrice = selectedSignalForTrade.entry || selectedSignalForTrade.entryPrice || 100;
    const qty = tradeAmount / entryPrice;

    const newPosition: Position = {
      id: `${selectedSignalForTrade.ticker}_${Date.now()}`,
      ticker: selectedSignalForTrade.ticker,
      signalType: selectedSignalForTrade.signalType,
      entryPrice,
      currentPrice: entryPrice,
      quantity: qty,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    };

    const nextBalance = balance - tradeAmount;
    const nextPositions = [...positions, newPosition];

    saveSimulationData(nextBalance, nextPositions, history);
    setSelectedSignalForTrade(null);
    toast.success(`Entered ${selectedSignalForTrade.signalType} position for ${selectedSignalForTrade.ticker}`);
  };

  const handleClosePosition = (pos: Position) => {
    // Exit price is current price
    const exitPrice = pos.currentPrice;
    
    // Profit Calculation
    let profit = 0;
    if (pos.signalType === 'BUY') {
      profit = (exitPrice - pos.entryPrice) * pos.quantity;
    } else {
      // Short SELL exit profit
      profit = (pos.entryPrice - exitPrice) * pos.quantity;
    }

    const nextBalance = balance + (pos.quantity * pos.entryPrice) + profit;
    const nextPositions = positions.filter(p => p.id !== pos.id);

    const completed: CompletedTrade = {
      id: pos.id,
      ticker: pos.ticker,
      signalType: pos.signalType,
      entryPrice: pos.entryPrice,
      exitPrice,
      quantity: pos.quantity,
      pnl: (profit / (pos.quantity * pos.entryPrice)) * 100, // P&L percent
      result: profit >= 0 ? 'WIN' : 'LOSS',
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
    };

    saveSimulationData(nextBalance, nextPositions, [completed, ...history]);
    toast.info(`Closed ${pos.ticker} position at ₹${exitPrice.toFixed(2)}. P&L: ${completed.pnl >= 0 ? '+' : ''}${completed.pnl.toFixed(2)}%`);
  };

  // Helper values
  const totalPnL = positions.reduce((acc, pos) => {
    const diff = pos.signalType === 'BUY' 
      ? (pos.currentPrice - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - pos.currentPrice) * pos.quantity;
    return acc + diff;
  }, 0);

  const totalPnLPercent = positions.length > 0 
    ? (totalPnL / positions.reduce((acc, p) => acc + (p.quantity * p.entryPrice), 0)) * 100
    : 0;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-void text-frost flex flex-col font-sans">
      <Sidebar activeTab="Simulator" />
      <AnimatedBackground />

      <main className="flex-1 md:pl-[220px] p-6 pb-24 md:pb-6 max-w-5xl w-full mx-auto relative z-10">
        
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6 select-none">
          <div className="flex flex-col gap-1">
            <h1 className="text-[20px] font-medium text-frost font-sans leading-none">Paper Trading Simulator</h1>
            <p className="text-[13px] text-muted font-sans font-normal leading-normal">
              Test your strategy execution in real-time with virtual money. No real money required.
            </p>
          </div>
          <button 
            onClick={handleReset}
            className="flex items-center gap-1.5 text-[#EF4444] hover:text-[#FF5C5C] font-sans text-[12px] bg-[#EF4444]/10 border border-[#EF4444]/20 px-3 py-1.5 rounded-[6px] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Simulator
          </button>
        </div>

        {/* TOP SECTION — Virtual Portfolio Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 select-none">
          {/* Card 1 */}
          <div className="bg-[#111318]/50 border border-border-dark p-5 rounded-[12px] space-y-1">
            <span className="text-[11px] text-muted uppercase tracking-wider font-sans font-medium block">Virtual Balance</span>
            <div className="font-mono text-[28px] font-bold text-[#E2E8F0] tracking-tight">
              ₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
          </div>
          {/* Card 2 */}
          <div className="bg-[#111318]/50 border border-border-dark p-5 rounded-[12px] space-y-1">
            <span className="text-[11px] text-muted uppercase tracking-wider font-sans font-medium block">Total Open P&amp;L</span>
            <div className={`font-mono text-[28px] font-bold tracking-tight ${totalPnL >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
              {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              <span className="text-[12px] ml-1.5 opacity-80">({totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%)</span>
            </div>
          </div>
          {/* Card 3 */}
          <div className="bg-[#111318]/50 border border-border-dark p-5 rounded-[12px] space-y-1">
            <span className="text-[11px] text-muted uppercase tracking-wider font-sans font-medium block">Open Positions</span>
            <div className="font-sans text-[28px] font-bold text-frost tracking-tight">
              {positions.length} active
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION — Two Columns layout */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start mb-8">
          
          {/* Left Column - Open Positions list (60%) */}
          <div className="lg:col-span-6 bg-surface/30 border border-border-dark p-5 rounded-[12px] space-y-4">
            <div className="flex items-center gap-2 border-b border-border-dark/60 pb-3">
              <Briefcase className="w-4 h-4 text-indigo" />
              <h2 className="text-[13px] font-brand font-semibold text-frost uppercase tracking-wider">Open Positions</h2>
            </div>

            {positions.length === 0 ? (
              <div className="py-12 text-center text-muted select-none">
                <p className="text-[12px] font-sans">No open positions. Click a BUY signal on the right to enter a trade.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {positions.map((pos) => {
                  const pnlAmt = pos.signalType === 'BUY'
                    ? (pos.currentPrice - pos.entryPrice) * pos.quantity
                    : (pos.entryPrice - pos.currentPrice) * pos.quantity;
                  const pnlPct = (pnlAmt / (pos.quantity * pos.entryPrice)) * 100;
                  
                  return (
                    <div 
                      key={pos.id}
                      className="bg-[#111318]/50 border border-border-dark p-3.5 rounded-[8px] flex items-center justify-between"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-brand font-bold text-[14px] text-frost tracking-wider">{pos.ticker}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-sans tracking-wide ${
                            pos.signalType === 'BUY' ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#EF4444]/15 text-[#EF4444]'
                          }`}>
                            {pos.signalType}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted flex gap-2">
                          <span>Qty: {pos.quantity.toFixed(2)}</span>
                          <span>·</span>
                          <span>Entry: ₹{pos.entryPrice.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0 select-none">
                        <div className="text-right">
                          <div className={`font-mono text-[14px] font-bold ${pnlAmt >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                            {pnlAmt >= 0 ? '+' : ''}₹{pnlAmt.toFixed(2)}
                          </div>
                          <div className={`font-mono text-[11px] ${pnlPct >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                            {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                          </div>
                        </div>

                        <button
                          onClick={() => handleClosePosition(pos)}
                          className="bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/20 text-[#EF4444] text-[11px] font-sans font-medium px-3 py-1.5 rounded-[6px] transition-all leading-none"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column - Active Signals Trade triggers (40%) */}
          <div className="lg:col-span-4 bg-surface/30 border border-border-dark p-5 rounded-[12px] space-y-4">
            <div className="flex items-center gap-2 border-b border-border-dark/60 pb-3 select-none">
              <TrendingUp className="w-4 h-4 text-indigo" />
              <h2 className="text-[13px] font-brand font-semibold text-frost uppercase tracking-wider">Active Signals — Click to Trade</h2>
            </div>

            {isLoadingSignals ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-[#111318]/50 border border-border-dark rounded-[6px] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {signals.map((sig) => (
                  <div 
                    key={sig.id}
                    className="bg-[#111318]/50 border border-border-dark p-2.5 rounded-[8px] flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-brand font-bold text-[12px] text-frost tracking-wider truncate">{sig.ticker}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted mt-0.5">
                        <span className={sig.signalType === 'BUY' ? 'text-[#22C55E]' : 'text-[#EF4444]'}>{sig.signalType}</span>
                        <span>·</span>
                        <span>{sig.confidence}% Conf.</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenTradeModal(sig)}
                      className="bg-[#6366F1] hover:bg-[#8183F4] text-white text-[11px] font-sans font-medium px-3 py-1.5 rounded-[6px] transition-colors leading-none"
                    >
                      Trade
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* BOTTOM SECTION — Trade History log */}
        <div className="bg-surface/30 border border-border-dark p-5 rounded-[12px] space-y-4 select-none">
          <div className="flex justify-between items-center border-b border-border-dark/60 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-indigo" />
              <h2 className="text-[13px] font-brand font-semibold text-frost uppercase tracking-wider">Trade History Logs</h2>
            </div>
            <span className="text-[11px] text-muted">{history.length} completed trades</span>
          </div>

          {history.length === 0 ? (
            <div className="py-8 text-center text-muted">
              <p className="text-[11px] font-sans">No completed trades yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-dark text-[10px] text-muted uppercase tracking-wider font-sans">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Ticker</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2 text-right">Entry</th>
                    <th className="pb-2 text-right">Exit</th>
                    <th className="pb-2 text-center">Result</th>
                    <th className="pb-2 text-right">P&amp;L%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2230]/40 font-sans text-[12px] text-[#E2E8F0]">
                  {history.map((h, idx) => (
                    <tr key={h.id || idx} className="hover:bg-[#1C1F28]/20">
                      <td className="py-2.5 whitespace-nowrap">{h.date}</td>
                      <td className="py-2.5 font-brand font-bold tracking-wider">{h.ticker}</td>
                      <td className="py-2.5 font-medium">
                        <span className={h.signalType === 'BUY' ? 'text-[#22C55E]' : 'text-[#EF4444]'}>{h.signalType}</span>
                      </td>
                      <td className="py-2.5 font-mono text-right whitespace-nowrap">₹{h.entryPrice.toFixed(2)}</td>
                      <td className="py-2.5 font-mono text-right whitespace-nowrap">₹{h.exitPrice.toFixed(2)}</td>
                      <td className="py-2.5 text-center whitespace-nowrap font-medium">
                        <span className={h.result === 'WIN' ? 'text-[#22C55E]' : 'text-[#EF4444]'}>{h.result}</span>
                      </td>
                      <td className={`py-2.5 font-mono text-right whitespace-nowrap ${h.pnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                        {h.pnl >= 0 ? '+' : ''}{h.pnl.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* Enter Trade Confirmation Overlay Modal */}
      <AnimatePresence>
        {selectedSignalForTrade && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSignalForTrade(null)}
              className="fixed inset-0 bg-black z-40"
            />
            {/* Modal Dialog */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-surface border border-border-dark rounded-[12px] p-6 z-50 text-frost font-sans shadow-2xl space-y-5"
            >
              <div className="space-y-1 select-none">
                <h3 className="text-[14px] font-brand font-semibold text-frost uppercase tracking-widest">Confirm Simulation Order</h3>
                <p className="text-[11px] text-muted">Set target allocation to execute virtual trade.</p>
              </div>

              {/* Order Stats */}
              <div className="bg-void p-3 rounded-[6px] border border-border-dark text-[12px] space-y-1.5">
                <div className="flex justify-between"><span>Ticker:</span> <span className="font-brand font-bold text-indigo">{selectedSignalForTrade.ticker}</span></div>
                <div className="flex justify-between"><span>Trade Type:</span> <span className={selectedSignalForTrade.signalType === 'BUY' ? 'text-[#22C55E] font-bold' : 'text-[#EF4444] font-bold'}>{selectedSignalForTrade.signalType}</span></div>
                <div className="flex justify-between"><span>Asset Price:</span> <span className="font-mono text-frost">₹{(selectedSignalForTrade.entry || selectedSignalForTrade.entryPrice || 100).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Estimated Shares:</span> <span className="font-mono text-frost">{(tradeAmount / (selectedSignalForTrade.entry || selectedSignalForTrade.entryPrice || 100)).toFixed(2)}</span></div>
              </div>

              {/* Slider Allocation */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-sans font-medium text-muted">
                  <span>Investment Amount:</span>
                  <span className="font-mono text-indigo font-bold text-[13px]">₹{tradeAmount.toLocaleString('en-IN')}</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="10000"
                  step="500"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo h-1 bg-[#1C1F28] rounded-lg appearance-none cursor-pointer border border-[#1E2230]"
                />
                <div className="flex justify-between text-[9px] text-[#374151] font-mono select-none">
                  <span>Min ₹1,000</span>
                  <span>Max ₹10,000</span>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedSignalForTrade(null)}
                  className="flex-1 bg-void hover:bg-raised border border-border-dark text-muted hover:text-frost text-[12px] font-sans font-semibold py-2 rounded-[6px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmTrade}
                  className="flex-1 bg-[#6366F1] hover:bg-[#8183F4] text-white text-[12px] font-sans font-semibold py-2 rounded-[6px] transition-colors shadow-lg"
                >
                  Confirm Order
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
