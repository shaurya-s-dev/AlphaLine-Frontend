'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { toast } from 'sonner';
import { TrendingUp, Briefcase, RotateCcw, ArrowUpRight, Play, CheckCircle, Award, List, Edit2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Position {
  id: string;
  ticker: string;
  market: string;
  signalType: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  invested: number;
  pnl: number;
  pnlPct: number;
  entryTime: string;
  stopLoss: number;
  target: number;
}

interface ClosedTrade {
  id: string;
  ticker: string;
  signalType: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;       // Amount
  pnlPct: number;    // Percent
  result: 'WIN' | 'LOSS';
  date: string;
}

export default function SimulatorPage() {
  const [mounted, setMounted] = useState(false);
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);

  // Simulation state
  const [balance, setBalance] = useState<number>(100000); 
  const [positions, setPositions] = useState<Position[]>([]);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);

  // Modal State for Entering Trade
  const [selectedSignalForTrade, setSelectedSignalForTrade] = useState<any | null>(null);
  const [tradeAmount, setTradeAmount] = useState<number>(5000); // Pre-sets
  const [customAmountText, setCustomAmountText] = useState<string>("");
  const [customEntryText, setCustomEntryText] = useState<string>("");
  const [customSLText, setCustomSLText] = useState<string>("");
  const [customTargetText, setCustomTargetText] = useState<string>("");

  // Editing SL/Target state inline
  const [editingPosId, setEditingPosId] = useState<string | null>(null);
  const [editSLText, setEditSLText] = useState<string>("");
  const [editTargetText, setEditTargetText] = useState<string>("");

  // Pagination for closed trades
  const [currentPage, setCurrentPage] = useState(1);
  const tradesPerPage = 5;

  useEffect(() => {
    setMounted(true);
    document.title = "Alphaline — Trading Simulator";

    // Load LocalStorage states
    if (typeof window !== 'undefined') {
      const storedBalance = localStorage.getItem('sim_balance_inr');
      const storedPositions = localStorage.getItem('sim_positions');
      const storedHistory = localStorage.getItem('sim_history_closed');

      if (storedBalance) setBalance(parseFloat(storedBalance));
      if (storedPositions) setPositions(JSON.parse(storedPositions));
      if (storedHistory) setClosedTrades(JSON.parse(storedHistory));
    }

    // Fetch active signals
    const fetchSignals = async () => {
      try {
        setIsLoadingSignals(true);
        const res = await fetch('/api/signals?market=all&limit=40');
        if (!res.ok) throw new Error("API failed");
        const data = await res.json();
        if (data.success && data.signals) {
          setSignals(data.signals.filter((s: any) => s.signalType === 'BUY' || s.signalType === 'SELL'));
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
        const nextPrice = Math.round(pos.currentPrice * (1 + changePercent) * 100) / 100;
        
        let pnl = 0;
        if (pos.signalType === 'BUY') {
          pnl = (nextPrice - pos.entryPrice) * pos.quantity;
        } else {
          pnl = (pos.entryPrice - nextPrice) * pos.quantity;
        }
        
        return {
          ...pos,
          currentPrice: nextPrice,
          pnl: pnl,
          pnlPct: (pnl / pos.invested) * 100
        };
      });
      setPositions(updated);
      localStorage.setItem('sim_positions', JSON.stringify(updated));
    }, 15000);
    return () => clearInterval(interval);
  }, [positions]);

  const saveSimulationData = (newBalance: number, newPositions: Position[], newHistory: ClosedTrade[]) => {
    setBalance(newBalance);
    setPositions(newPositions);
    setClosedTrades(newHistory);
    localStorage.setItem('sim_balance_inr', newBalance.toString());
    localStorage.setItem('sim_positions', JSON.stringify(newPositions));
    localStorage.setItem('sim_history_closed', JSON.stringify(newHistory));
  };

  const handleReset = () => {
    const confirm = window.confirm("Are you sure you want to reset the simulator? All history will be deleted.");
    if (confirm) {
      saveSimulationData(100000, [], []);
      toast.success("Simulation portfolio reset to default ₹1,00,000 cash.");
    }
  };

  const handleOpenTradeModal = (signal: any) => {
    setSelectedSignalForTrade(signal);
    setTradeAmount(5000); // default
    setCustomAmountText("5000");
    setCustomEntryText((signal.entry || 100).toString());
    setCustomSLText((signal.stopLoss || 95).toString());
    setCustomTargetText((signal.target || 110).toString());
  };

  const handleConfirmTrade = () => {
    if (!selectedSignalForTrade) return;

    const amt = parseFloat(customAmountText) || tradeAmount;
    const ent = parseFloat(customEntryText) || selectedSignalForTrade.entry || 100;
    const sl = parseFloat(customSLText) || selectedSignalForTrade.stopLoss || 95;
    const tgt = parseFloat(customTargetText) || selectedSignalForTrade.target || 110;

    if (amt > balance) {
      toast.error("Insufficient virtual cash balance.");
      return;
    }

    const qty = amt / ent;

    const newPosition: Position = {
      id: `${selectedSignalForTrade.ticker}_${Date.now()}`,
      ticker: selectedSignalForTrade.ticker,
      market: selectedSignalForTrade.market || (selectedSignalForTrade.ticker.endsWith('.NS') ? 'NSE' : selectedSignalForTrade.ticker.endsWith('.BO') ? 'BSE' : 'US'),
      signalType: selectedSignalForTrade.signalType,
      entryPrice: ent,
      currentPrice: ent,
      quantity: qty,
      invested: amt,
      pnl: 0,
      pnlPct: 0,
      entryTime: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      stopLoss: sl,
      target: tgt
    };

    const nextBalance = balance - amt;
    const nextPositions = [...positions, newPosition];

    saveSimulationData(nextBalance, nextPositions, closedTrades);
    setSelectedSignalForTrade(null);
    toast.success(`Entered ${selectedSignalForTrade.signalType} position for ${selectedSignalForTrade.ticker}`);
  };

  const handleClosePosition = (pos: Position) => {
    const exitPrice = pos.currentPrice;
    
    // Profit Calculation
    let profit = 0;
    if (pos.signalType === 'BUY') {
      profit = (exitPrice - pos.entryPrice) * pos.quantity;
    } else {
      profit = (pos.entryPrice - exitPrice) * pos.quantity;
    }

    const nextBalance = balance + pos.invested + profit;
    const nextPositions = positions.filter(p => p.id !== pos.id);

    const completed: ClosedTrade = {
      id: pos.id,
      ticker: pos.ticker,
      signalType: pos.signalType,
      entryPrice: pos.entryPrice,
      exitPrice,
      quantity: pos.quantity,
      pnl: profit,
      pnlPct: (profit / pos.invested) * 100,
      result: profit >= 0 ? 'WIN' : 'LOSS',
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
    };

    saveSimulationData(nextBalance, nextPositions, [completed, ...closedTrades]);
    toast.info(`${pos.ticker} closed ${completed.pnlPct >= 0 ? '+' : ''}${completed.pnlPct.toFixed(2)}%`);
  };

  const handleStartInlineEdit = (pos: Position) => {
    setEditingPosId(pos.id);
    setEditSLText(pos.stopLoss.toString());
    setEditTargetText(pos.target.toString());
  };

  const handleSaveInlineEdit = (posId: string) => {
    const sl = parseFloat(editSLText);
    const tgt = parseFloat(editTargetText);

    if (isNaN(sl) || isNaN(tgt)) {
      toast.error("Invalid SL or Target input.");
      return;
    }

    const updated = positions.map(pos => {
      if (pos.id === posId) {
        return {
          ...pos,
          stopLoss: sl,
          target: tgt
        };
      }
      return pos;
    });

    setPositions(updated);
    localStorage.setItem('sim_positions', JSON.stringify(updated));
    setEditingPosId(null);
    toast.success("Trade SL & Target parameters updated.");
  };

  // Calculations
  const openPnLAmt = positions.reduce((acc, p) => acc + p.pnl, 0);
  const totalClosedCount = closedTrades.length;
  const winsCount = closedTrades.filter(t => t.result === 'WIN').length;
  const winRate = totalClosedCount > 0 ? Math.round((winsCount / totalClosedCount) * 100) : 0;
  
  // Total value = cash balance + invested capital + open P&L
  const totalPnLSum = closedTrades.reduce((acc, t) => acc + t.pnl, 0) + openPnLAmt;

  // Pagination closed trades
  const indexOfLastTrade = currentPage * tradesPerPage;
  const indexOfFirstTrade = indexOfLastTrade - tradesPerPage;
  const currentTrades = closedTrades.slice(indexOfFirstTrade, indexOfLastTrade);
  const totalPages = Math.ceil(closedTrades.length / tradesPerPage) || 1;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-void text-frost flex flex-col font-sans">
      <Sidebar activeTab="Simulator" />
      <AnimatedBackground />

      <main className="flex-1 md:pl-[220px] p-4 pb-24 md:pb-6 max-w-5xl w-full mx-auto relative z-10 space-y-6">
        
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 select-none">
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

        {/* TOP BAR — 4 stat cards in a row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 select-none">
          <div className="bg-[#111318]/50 border border-border-dark p-4 rounded-[6px] space-y-1">
            <span className="text-[10px] text-muted uppercase tracking-wider font-semibold font-sans block">Virtual Cash</span>
            <div className="font-mono text-[20px] font-bold text-[#E2E8F0] tracking-tight">
              ₹{balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-[#111318]/50 border border-border-dark p-4 rounded-[6px] space-y-1">
            <span className="text-[10px] text-muted uppercase tracking-wider font-semibold font-sans block">Total Net P&amp;L</span>
            <div className={`font-mono text-[20px] font-bold tracking-tight ${totalPnLSum >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
              {totalPnLSum >= 0 ? '+' : ''}₹{totalPnLSum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-[#111318]/50 border border-border-dark p-4 rounded-[6px] space-y-1">
            <span className="text-[10px] text-muted uppercase tracking-wider font-semibold font-sans block">Open Positions</span>
            <div className="font-mono text-[20px] font-bold text-[#E2E8F0] tracking-tight">
              {positions.length} active
            </div>
          </div>
          <div className="bg-[#111318]/50 border border-border-dark p-4 rounded-[6px] space-y-1">
            <span className="text-[10px] text-muted uppercase tracking-wider font-semibold font-sans block">Win Rate</span>
            <div className="font-mono text-[20px] font-bold text-[#6366F1] tracking-tight">
              {winRate}%
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION — Two Columns (60/40) */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
          
          {/* Left Column: Open Positions (60%) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border-dark/60 pb-2.5 select-none">
              <Briefcase className="w-4 h-4 text-indigo" />
              <h2 className="text-[13px] font-brand font-semibold text-frost uppercase tracking-wider">Open Positions</h2>
            </div>

            {positions.length === 0 ? (
              <div className="py-16 text-center text-muted border border-border-dark/60 bg-[#111318]/30 rounded-[12px] select-none space-y-1">
                <p className="text-[13px] font-medium font-sans">No open positions</p>
                <p className="text-[11px] text-[#374151] font-sans">Click "Trade →" on any signal to the right to enter.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {positions.map((pos) => {
                  const isEditing = editingPosId === pos.id;
                  
                  // Compute dynamic progress slider range
                  const range = pos.target - pos.stopLoss;
                  const pct = range > 0 
                    ? Math.min(100, Math.max(0, ((pos.currentPrice - pos.stopLoss) / range) * 100))
                    : 50;
                  const entryPct = range > 0
                    ? Math.min(100, Math.max(0, ((pos.entryPrice - pos.stopLoss) / range) * 100))
                    : 50;

                  return (
                    <div 
                      key={pos.id}
                      className="bg-[#111318] border border-[#1E2230] rounded-[6px] p-4 space-y-4 shadow-sm"
                    >
                      {/* Row 1: ticker + signal + entry */}
                      <div className="flex justify-between items-center select-none">
                        <div className="flex items-center gap-2">
                          <span className="font-brand font-bold text-[14px] text-frost tracking-wider">{pos.ticker}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-sans tracking-wide ${
                            pos.signalType === 'BUY' ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#EF4444]/15 text-[#EF4444]'
                          }`}>
                            {pos.signalType}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted font-sans">
                          Entry: <span className="font-mono text-frost">₹{pos.entryPrice.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Row 2: P&L large + P&L% + qty + invested */}
                      <div className="flex justify-between items-end border-b border-border-dark/30 pb-3">
                        <div className="space-y-0.5">
                          <div className={`font-mono text-[22px] font-bold leading-none ${pos.pnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                            {pos.pnl >= 0 ? '+' : ''}₹{pos.pnl.toFixed(2)}
                          </div>
                          <div className={`font-mono text-[11px] ${pos.pnlPct >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                            {pos.pnlPct >= 0 ? '+' : ''}{pos.pnlPct.toFixed(2)}%
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-muted font-sans select-none space-y-0.5">
                          <div>Qty: <span className="font-mono text-frost">{pos.quantity.toFixed(1)}</span></div>
                          <div>Invested: <span className="font-mono text-frost">₹{pos.invested.toFixed(0)}</span></div>
                        </div>
                      </div>

                      {/* Row 3: Progress slider bar */}
                      <div className="space-y-1 relative pt-4 pb-2 select-none">
                        <div className="h-1.5 w-full bg-[#1C1F28] rounded-full relative overflow-hidden flex border border-[#1E2230]/40">
                          {/* SL to Entry (Red Section) */}
                          <div style={{ width: `${entryPct}%` }} className="h-full bg-[#EF4444]/20 border-r border-[#EF4444]/40" />
                          {/* Entry to Target (Green Section) */}
                          <div style={{ width: `${100 - entryPct}%` }} className="h-full bg-[#22C55E]/10" />
                        </div>
                        
                        {/* Current price ticker dot indicator */}
                        <div 
                          style={{ left: `${pct}%` }} 
                          className={`absolute top-3.5 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-[#111318] shadow-md z-20 ${
                            pos.pnl >= 0 ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
                          }`}
                        />

                        {/* Labels row */}
                        <div className="flex justify-between text-[9px] font-mono text-dim pt-1 relative">
                          <span className="text-[#EF4444]">SL: ₹{pos.stopLoss.toFixed(1)}</span>
                          <span style={{ left: `${entryPct}%` }} className="absolute -translate-x-1/2 text-muted">Ent</span>
                          <span className="text-[#22C55E]">Tgt: ₹{pos.target.toFixed(1)}</span>
                        </div>
                      </div>

                      {/* Row 4: Action triggers */}
                      <div className="flex justify-between items-center select-none pt-1">
                        <span className="text-[10px] text-dim font-mono uppercase">{pos.entryTime}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStartInlineEdit(pos)}
                            className="bg-transparent hover:bg-[#1C1F28] border border-border-dark text-[#6B7280] hover:text-frost text-[11px] font-sans font-medium px-3 py-1.5 rounded-[4px] transition-colors leading-none"
                          >
                            Edit SL/Target
                          </button>
                          <button
                            onClick={() => handleClosePosition(pos)}
                            className="bg-transparent hover:bg-[#EF4444]/10 border border-[#EF4444]/30 hover:border-[#EF4444] text-[#EF4444] text-[11px] font-sans font-medium px-3 py-1.5 rounded-[4px] transition-colors leading-none"
                          >
                            Close at Market
                          </button>
                        </div>
                      </div>

                      {/* Inline Edit Form */}
                      {isEditing && (
                        <div className="bg-void p-3 rounded-[6px] border border-border-dark mt-3 space-y-3 select-none">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="block text-[10px] text-muted font-sans uppercase">New Stop Loss</label>
                              <input
                                type="text"
                                value={editSLText}
                                onChange={(e) => setEditSLText(e.target.value)}
                                className="w-full bg-surface border border-border-dark text-[12px] text-frost p-1.5 rounded-[4px] font-mono focus:outline-none focus:border-indigo"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] text-muted font-sans uppercase">New Target</label>
                              <input
                                type="text"
                                value={editTargetText}
                                onChange={(e) => setEditTargetText(e.target.value)}
                                className="w-full bg-surface border border-border-dark text-[12px] text-frost p-1.5 rounded-[4px] font-mono focus:outline-none focus:border-indigo"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingPosId(null)}
                              className="text-[11px] text-muted hover:text-frost font-sans px-2.5 py-1"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveInlineEdit(pos.id)}
                              className="bg-[#6366F1] hover:bg-[#8183F4] text-white text-[11px] font-sans font-medium px-3 py-1 rounded-[4px] flex items-center gap-1 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" /> Update
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Trade Signals list (40%) */}
          <div className="lg:col-span-4 bg-surface/30 border border-border-dark p-5 rounded-[12px] space-y-4">
            <div className="flex items-center gap-2 border-b border-border-dark/60 pb-3 select-none">
              <TrendingUp className="w-4 h-4 text-indigo" />
              <h2 className="text-[13px] font-brand font-semibold text-frost uppercase tracking-wider">Available Signals</h2>
            </div>

            {isLoadingSignals ? (
              <div className="space-y-2.5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-10 bg-[#111318]/50 border border-border-dark rounded-[6px] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 select-none">
                {signals.map((sig) => (
                  <div 
                    key={sig.id}
                    className="h-11 bg-[#111318]/50 border border-border-dark p-2.5 rounded-[6px] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        sig.signalType === 'BUY' ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
                      }`} />
                      <div className="min-w-0">
                        <span className="font-brand font-bold text-[12px] text-frost tracking-wider">{sig.ticker}</span>
                        <span className="text-[10px] text-muted ml-2 font-mono">{sig.confidence}%</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenTradeModal(sig)}
                      className="bg-transparent hover:bg-[#6366F1]/10 border border-[#6366F1]/30 hover:border-[#6366F1] text-indigo text-[11px] font-sans font-medium px-2.5 py-1 rounded-[4px] transition-colors leading-none"
                    >
                      Trade →
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
          </div>

          {closedTrades.length === 0 ? (
            <div className="py-8 text-center text-muted">
              <p className="text-[11px] font-sans">No completed trades yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
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
                    {currentTrades.map((h, idx) => (
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
                          {h.pnlPct >= 0 ? '+' : ''}{h.pnlPct.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination triggers */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center text-[12px] font-sans text-muted pt-2 border-t border-border-dark/30">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="hover:text-frost disabled:opacity-30 transition-colors"
                  >
                    ← Previous
                  </button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="hover:text-frost disabled:opacity-30 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
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
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-surface border border-border-dark rounded-[12px] p-6 z-50 text-frost font-sans shadow-2xl space-y-4"
            >
              <div className="space-y-1 select-none">
                <h3 className="text-[14px] font-brand font-semibold text-frost uppercase tracking-widest">New Trade — {selectedSignalForTrade.ticker}</h3>
                <p className="text-[11px] text-muted">Current Signal: <span className={selectedSignalForTrade.signalType === 'BUY' ? 'text-[#22C55E]' : 'text-[#EF4444]'}>{selectedSignalForTrade.signalType}</span> ({selectedSignalForTrade.confidence}%)</p>
              </div>

              {/* Form Fields */}
              <div className="space-y-3">
                {/* Investment preset amount */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-muted uppercase font-semibold">Investment Amount</label>
                  <div className="flex gap-1.5 select-none">
                    {['1000', '2000', '5000', '10000'].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => {
                          setTradeAmount(parseInt(preset, 10));
                          setCustomAmountText(preset);
                        }}
                        className={`flex-1 py-1 rounded text-[11px] font-mono border transition-all ${
                          customAmountText === preset 
                            ? 'bg-[#6366F1] border-[#6366F1] text-white' 
                            : 'bg-void border-border-dark text-muted hover:text-frost'
                        }`}
                      >
                        ₹{parseInt(preset, 10) >= 1000 ? `${parseInt(preset, 10)/1000}K` : preset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={customAmountText}
                    onChange={(e) => setCustomAmountText(e.target.value)}
                    placeholder="Enter custom allocation..."
                    className="w-full bg-void border border-border-dark text-[12px] text-frost p-2 rounded-[6px] font-mono focus:outline-none focus:border-indigo"
                  />
                </div>

                {/* Entry Price */}
                <div className="space-y-1">
                  <label className="block text-[10px] text-muted uppercase font-semibold">Entry Price</label>
                  <input
                    type="text"
                    value={customEntryText}
                    onChange={(e) => setCustomEntryText(e.target.value)}
                    className="w-full bg-void border border-border-dark text-[12px] text-frost p-2 rounded-[6px] font-mono focus:outline-none focus:border-indigo"
                  />
                </div>

                {/* Stop Loss */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="block text-[10px] text-muted uppercase font-semibold">Stop Loss</label>
                    {parseFloat(customEntryText) > 0 && parseFloat(customSLText) > 0 && (
                      <span className="text-[9px] text-[#EF4444] font-mono">
                        Max Loss: ₹{(Math.abs(parseFloat(customEntryText) - parseFloat(customSLText)) * (parseFloat(customAmountText) || tradeAmount) / parseFloat(customEntryText)).toFixed(0)}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={customSLText}
                    onChange={(e) => setCustomSLText(e.target.value)}
                    className="w-full bg-void border border-border-dark text-[12px] text-frost p-2 rounded-[6px] font-mono focus:outline-none focus:border-indigo"
                  />
                </div>

                {/* Target */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="block text-[10px] text-muted uppercase font-semibold">Target</label>
                    {parseFloat(customEntryText) > 0 && parseFloat(customTargetText) > 0 && (
                      <span className="text-[9px] text-[#22C55E] font-mono">
                        Potential Gain: ₹{(Math.abs(parseFloat(customTargetText) - parseFloat(customEntryText)) * (parseFloat(customAmountText) || tradeAmount) / parseFloat(customEntryText)).toFixed(0)}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={customTargetText}
                    onChange={(e) => setCustomTargetText(e.target.value)}
                    className="w-full bg-void border border-border-dark text-[12px] text-frost p-2 rounded-[6px] font-mono focus:outline-none focus:border-indigo"
                  />
                </div>
              </div>

              {/* Order Stats summary */}
              <div className="bg-void p-3 rounded-[6px] border border-border-dark text-[11px] space-y-1 select-none text-muted font-sans pt-2 border-t">
                <div className="flex justify-between">
                  <span>Shares:</span> 
                  <span className="font-mono text-frost">
                    {Math.floor((parseFloat(customAmountText) || tradeAmount) / (parseFloat(customEntryText) || selectedSignalForTrade.entry || 1))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Risk/Reward:</span> 
                  <span className="font-mono text-indigo font-bold">
                    {(Math.abs((parseFloat(customTargetText) || selectedSignalForTrade.target) - (parseFloat(customEntryText) || selectedSignalForTrade.entry)) / 
                      Math.max(0.1, Math.abs((parseFloat(customEntryText) || selectedSignalForTrade.entry) - (parseFloat(customSLText) || selectedSignalForTrade.stopLoss)))).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Capital Remaining:</span> 
                  <span className="font-mono text-frost">
                    ₹{(balance - (parseFloat(customAmountText) || tradeAmount)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* Confirm Trade triggers */}
              <div className="space-y-2 select-none pt-2">
                <button
                  onClick={handleConfirmTrade}
                  className="w-full bg-[#6366F1] hover:bg-[#8183F4] text-white text-[12px] font-sans font-semibold py-2.5 rounded-[6px] transition-colors shadow-lg"
                >
                  Confirm Trade
                </button>
                <button
                  onClick={() => setSelectedSignalForTrade(null)}
                  className="w-full text-center text-muted hover:text-frost text-[11px] font-sans transition-colors block"
                >
                  Cancel Order
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
