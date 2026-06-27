'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Briefcase, RotateCcw, CheckCircle, Check, Search, X, Activity } from 'lucide-react';
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
  pnl: number;
  pnlPct: number;
  result: 'WIN' | 'LOSS';
  date: string;
}

// Static index data — replace with live fetch if needed
const MARKET_INDICES = [
  { label: 'NIFTY 50',    value: 24780.25, change: +0.43, currency: '₹' },
  { label: 'SENSEX',      value: 81456.70, change: +0.38, currency: '₹' },
  { label: 'BANK NIFTY',  value: 53214.60, change: -0.21, currency: '₹' },
  { label: 'NIFTY IT',    value: 38920.15, change: +1.12, currency: '₹' },
  { label: 'MIDCAP 100',  value: 55301.80, change: +0.67, currency: '₹' },
  { label: 'NASDAQ',      value: 19843.77, change: +0.55, currency: '$' },
  { label: 'S&P 500',     value: 5484.20,  change: +0.31, currency: '$' },
  { label: 'DOW JONES',   value: 39118.86, change: -0.08, currency: '$' },
  { label: 'VIX',         value: 13.24,    change: -4.10, currency: '' },
  { label: 'INDIA VIX',   value: 11.87,    change: -2.34, currency: '' },
];

export default function SimulatorPage() {
  const [mounted, setMounted] = useState(false);
  const [signals, setSignals] = useState<any[]>([]);
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);
  const [signalSearch, setSignalSearch] = useState('');
  const [signalFilter, setSignalFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  // Simulation state
  const [balance, setBalance] = useState<number>(100000);
  const [positions, setPositions] = useState<Position[]>([]);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);

  // Modal state
  const [selectedSignalForTrade, setSelectedSignalForTrade] = useState<any | null>(null);
  const [tradeAmount, setTradeAmount] = useState<number>(5000);
  const [customAmountText, setCustomAmountText] = useState<string>('');
  const [customEntryText, setCustomEntryText] = useState<string>('');
  const [customSLText, setCustomSLText] = useState<string>('');
  const [customTargetText, setCustomTargetText] = useState<string>('');

  // Inline edit
  const [editingPosId, setEditingPosId] = useState<string | null>(null);
  const [editSLText, setEditSLText] = useState<string>('');
  const [editTargetText, setEditTargetText] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const tradesPerPage = 8;

  useEffect(() => {
    setMounted(true);
    document.title = 'Alphaline — Trading Simulator';
    if (typeof window !== 'undefined') {
      const storedBalance = localStorage.getItem('sim_balance_inr');
      const storedPositions = localStorage.getItem('sim_positions');
      const storedHistory = localStorage.getItem('sim_history_closed');
      if (storedBalance) setBalance(parseFloat(storedBalance));
      if (storedPositions) setPositions(JSON.parse(storedPositions));
      if (storedHistory) setClosedTrades(JSON.parse(storedHistory));
    }

    const fetchSignals = async () => {
      try {
        setIsLoadingSignals(true);
        const res = await fetch('/api/signals?market=all&limit=60');
        if (!res.ok) throw new Error('API failed');
        const data = await res.json();
        if (data.success && data.signals) {
          setSignals(data.signals.filter((s: any) => s.signalType === 'BUY' || s.signalType === 'SELL'));
        }
      } catch {
        setSignals([
          { id: 'm1', ticker: 'RELIANCE.NS', market: 'NSE', signalType: 'BUY', confidence: 81, entry: 2847.50, stopLoss: 2790.00, target: 2960.00 },
          { id: 'm2', ticker: 'TCS.NS', market: 'NSE', signalType: 'SELL', confidence: 67, entry: 3850.00, stopLoss: 3920.00, target: 3710.00 },
          { id: 'm3', ticker: 'HDFCBANK.NS', market: 'NSE', signalType: 'BUY', confidence: 74, entry: 1642.00, stopLoss: 1608.00, target: 1709.00 },
          { id: 'm4', ticker: 'INFY.NS', market: 'NSE', signalType: 'BUY', confidence: 79, entry: 1502.00, stopLoss: 1472.00, target: 1562.00 },
          { id: 'm5', ticker: 'AAPL', market: 'US', signalType: 'BUY', confidence: 74, entry: 189.20, stopLoss: 185.00, target: 198.00 },
          { id: 'm6', ticker: 'NVDA', market: 'US', signalType: 'BUY', confidence: 88, entry: 125.50, stopLoss: 120.00, target: 135.00 },
          { id: 'm7', ticker: 'MSFT', market: 'US', signalType: 'SELL', confidence: 61, entry: 420.00, stopLoss: 430.00, target: 400.00 },
          { id: 'm8', ticker: 'SBIN.NS', market: 'NSE', signalType: 'BUY', confidence: 72, entry: 812.00, stopLoss: 795.00, target: 845.00 },
          { id: 'm9', ticker: 'WIPRO.BO', market: 'BSE', signalType: 'SELL', confidence: 58, entry: 480.00, stopLoss: 492.00, target: 455.00 },
          { id: 'm10', ticker: 'GOOGL', market: 'US', signalType: 'BUY', confidence: 83, entry: 175.00, stopLoss: 171.00, target: 183.00 },
        ]);
      } finally {
        setIsLoadingSignals(false);
      }
    };
    fetchSignals();
  }, []);

  // Simulate live price drift
  useEffect(() => {
    if (positions.length === 0) return;
    const interval = setInterval(() => {
      const updated = positions.map(pos => {
        const changePercent = (Math.random() - 0.49) * 0.006;
        const nextPrice = Math.round(pos.currentPrice * (1 + changePercent) * 100) / 100;
        const pnl = pos.signalType === 'BUY'
          ? (nextPrice - pos.entryPrice) * pos.quantity
          : (pos.entryPrice - nextPrice) * pos.quantity;
        return { ...pos, currentPrice: nextPrice, pnl, pnlPct: (pnl / pos.invested) * 100 };
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
    if (window.confirm('Reset all simulation data? This cannot be undone.')) {
      saveSimulationData(100000, [], []);
      toast.success('Simulator reset to ₹1,00,000.');
    }
  };

  const handleOpenTradeModal = (signal: any) => {
    setSelectedSignalForTrade(signal);
    setCustomAmountText('5000');
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
    if (amt > balance) { toast.error('Insufficient virtual cash.'); return; }
    const qty = amt / ent;
    const newPosition: Position = {
      id: `${selectedSignalForTrade.ticker}_${Date.now()}`,
      ticker: selectedSignalForTrade.ticker,
      market: selectedSignalForTrade.market || (selectedSignalForTrade.ticker.endsWith('.NS') ? 'NSE' : selectedSignalForTrade.ticker.endsWith('.BO') ? 'BSE' : 'US'),
      signalType: selectedSignalForTrade.signalType,
      entryPrice: ent, currentPrice: ent, quantity: qty, invested: amt, pnl: 0, pnlPct: 0,
      entryTime: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      stopLoss: sl, target: tgt,
    };
    saveSimulationData(balance - amt, [...positions, newPosition], closedTrades);
    setSelectedSignalForTrade(null);
    toast.success(`${selectedSignalForTrade.signalType} entered — ${selectedSignalForTrade.ticker}`);
  };

  const handleClosePosition = (pos: Position) => {
    const exitPrice = pos.currentPrice;
    const profit = pos.signalType === 'BUY'
      ? (exitPrice - pos.entryPrice) * pos.quantity
      : (pos.entryPrice - exitPrice) * pos.quantity;
    const completed: ClosedTrade = {
      id: pos.id, ticker: pos.ticker, signalType: pos.signalType,
      entryPrice: pos.entryPrice, exitPrice, quantity: pos.quantity,
      pnl: profit, pnlPct: (profit / pos.invested) * 100,
      result: profit >= 0 ? 'WIN' : 'LOSS',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
    saveSimulationData(balance + pos.invested + profit, positions.filter(p => p.id !== pos.id), [completed, ...closedTrades]);
    toast.info(`${pos.ticker} closed ${completed.pnlPct >= 0 ? '+' : ''}${completed.pnlPct.toFixed(2)}%`);
  };

  const handleSaveInlineEdit = (posId: string) => {
    const sl = parseFloat(editSLText);
    const tgt = parseFloat(editTargetText);
    if (isNaN(sl) || isNaN(tgt)) { toast.error('Invalid SL or Target.'); return; }
    const updated = positions.map(pos => pos.id === posId ? { ...pos, stopLoss: sl, target: tgt } : pos);
    setPositions(updated);
    localStorage.setItem('sim_positions', JSON.stringify(updated));
    setEditingPosId(null);
    toast.success('SL & Target updated.');
  };

  // Derived
  const openPnLAmt = positions.reduce((acc, p) => acc + p.pnl, 0);
  const winsCount = closedTrades.filter(t => t.result === 'WIN').length;
  const winRate = closedTrades.length > 0 ? Math.round((winsCount / closedTrades.length) * 100) : 0;
  const totalPnLSum = closedTrades.reduce((acc, t) => acc + t.pnl, 0) + openPnLAmt;

  const filteredSignals = signals.filter(s => {
    const matchSearch = s.ticker.toLowerCase().includes(signalSearch.toLowerCase());
    const matchFilter = signalFilter === 'ALL' || s.signalType === signalFilter;
    return matchSearch && matchFilter;
  });

  const indexOfLast = currentPage * tradesPerPage;
  const currentTrades = closedTrades.slice(indexOfLast - tradesPerPage, indexOfLast);
  const totalPages = Math.ceil(closedTrades.length / tradesPerPage) || 1;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-void text-frost flex flex-col font-sans">
      <Sidebar activeTab="Simulator" />
      <AnimatedBackground />

      <main className="flex-1 md:pl-[220px] px-4 pt-4 pb-24 md:pb-6 relative z-10 space-y-4 max-w-[1400px] w-full mx-auto">

        {/* ── MARKET INDICES STRIP ── */}
        <div className="w-full overflow-x-auto scrollbar-none">
          <div className="flex gap-2 min-w-max pb-1">
            {MARKET_INDICES.map((idx) => (
              <div key={idx.label} className="flex items-center gap-2.5 bg-[#111318]/70 border border-border-dark rounded-[6px] px-3 py-2 min-w-[130px]">
                <div className="min-w-0">
                  <div className="text-[9px] text-muted uppercase tracking-wider font-semibold truncate">{idx.label}</div>
                  <div className="text-[13px] font-mono font-bold text-frost leading-none mt-0.5">
                    {idx.currency}{idx.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className={`text-[10px] font-mono font-semibold ml-auto flex-shrink-0 ${idx.change >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                  {idx.change >= 0 ? '▲' : '▼'} {Math.abs(idx.change).toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── HEADER + STATS ROW ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-medium text-frost leading-none">Paper Trading Simulator</h1>
            <p className="text-[12px] text-muted mt-0.5">Virtual portfolio · No real money</p>
          </div>
          <button onClick={handleReset} className="flex items-center gap-1.5 text-[#EF4444] text-[11px] bg-[#EF4444]/10 border border-[#EF4444]/20 px-3 py-1.5 rounded-[6px] transition-colors hover:border-[#EF4444]/50 self-start sm:self-auto">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>

        {/* ── 4 STAT CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Virtual Cash', value: `₹${balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-frost' },
            { label: 'Total Net P&L', value: `${totalPnLSum >= 0 ? '+' : ''}₹${totalPnLSum.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: totalPnLSum >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]' },
            { label: 'Open Positions', value: `${positions.length} active`, color: 'text-frost' },
            { label: 'Win Rate', value: `${winRate}%`, color: 'text-[#6366F1]' },
          ].map((card) => (
            <div key={card.label} className="bg-[#111318]/60 border border-border-dark px-4 py-3 rounded-[6px]">
              <div className="text-[9px] text-muted uppercase tracking-wider font-semibold">{card.label}</div>
              <div className={`font-mono text-[18px] font-bold mt-1 leading-none ${card.color}`}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN BODY: FULL WIDTH SPLIT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">

          {/* LEFT: Positions + History */}
          <div className="space-y-4 min-w-0">

            {/* Open Positions */}
            <div className="bg-[#0D0F14]/60 border border-border-dark rounded-[8px] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border-dark/60">
                <Briefcase className="w-3.5 h-3.5 text-indigo" />
                <span className="text-[11px] font-semibold text-frost uppercase tracking-wider">Open Positions</span>
                <span className="ml-auto text-[10px] text-muted font-mono">{positions.length} active</span>
              </div>

              {positions.length === 0 ? (
                <div className="py-10 text-center text-muted">
                  <Activity className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  <p className="text-[12px]">No open positions — pick a signal on the right</p>
                </div>
              ) : (
                <div className="divide-y divide-border-dark/40">
                  {positions.map((pos) => {
                    const isEditing = editingPosId === pos.id;
                    const range = pos.target - pos.stopLoss;
                    const pct = range > 0 ? Math.min(100, Math.max(0, ((pos.currentPrice - pos.stopLoss) / range) * 100)) : 50;
                    const entryPct = range > 0 ? Math.min(100, Math.max(0, ((pos.entryPrice - pos.stopLoss) / range) * 100)) : 50;
                    const isUp = pos.pnl >= 0;

                    return (
                      <div key={pos.id} className="px-4 py-3 hover:bg-[#111318]/40 transition-colors">
                        {/* Row 1 */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-brand font-bold text-[13px] text-frost tracking-wider">{pos.ticker}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide ${pos.signalType === 'BUY' ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#EF4444]/15 text-[#EF4444]'}`}>{pos.signalType}</span>
                            <span className="text-[9px] text-muted bg-[#1C1F28] px-1.5 py-0.5 rounded">{pos.market}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className={`font-mono text-[14px] font-bold leading-none ${isUp ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                                {isUp ? '+' : ''}₹{pos.pnl.toFixed(2)}
                              </div>
                              <div className={`font-mono text-[10px] ${isUp ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>{isUp ? '+' : ''}{pos.pnlPct.toFixed(2)}%</div>
                            </div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="relative mb-2">
                          <div className="h-1 w-full bg-[#1C1F28] rounded-full overflow-hidden flex">
                            <div style={{ width: `${entryPct}%` }} className="h-full bg-[#EF4444]/25 border-r border-[#EF4444]/40" />
                            <div style={{ width: `${100 - entryPct}%` }} className="h-full bg-[#22C55E]/10" />
                          </div>
                          <div style={{ left: `${pct}%` }} className={`absolute -top-1 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-[#0D0F14] ${isUp ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
                        </div>

                        {/* Labels */}
                        <div className="flex justify-between text-[9px] font-mono text-muted mb-2">
                          <span className="text-[#EF4444]">SL {pos.stopLoss.toFixed(1)}</span>
                          <span>Entry {pos.entryPrice.toFixed(1)} · Qty {pos.quantity.toFixed(1)} · ₹{pos.invested.toFixed(0)}</span>
                          <span className="text-[#22C55E]">Tgt {pos.target.toFixed(1)}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-dim font-mono">{pos.entryTime}</span>
                          <div className="flex gap-1.5">
                            <button onClick={() => { setEditingPosId(pos.id); setEditSLText(pos.stopLoss.toString()); setEditTargetText(pos.target.toString()); }}
                              className="text-[10px] border border-border-dark text-muted hover:text-frost px-2.5 py-1 rounded-[4px] transition-colors">Edit SL/TGT</button>
                            <button onClick={() => handleClosePosition(pos)}
                              className="text-[10px] border border-[#EF4444]/30 hover:border-[#EF4444] text-[#EF4444] px-2.5 py-1 rounded-[4px] transition-colors">Close ×</button>
                          </div>
                        </div>

                        {/* Inline edit */}
                        {isEditing && (
                          <div className="mt-2 bg-void border border-border-dark rounded-[6px] p-3 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] text-muted uppercase block mb-1">Stop Loss</label>
                                <input type="text" value={editSLText} onChange={e => setEditSLText(e.target.value)}
                                  className="w-full bg-surface border border-border-dark text-[11px] text-frost p-1.5 rounded font-mono focus:outline-none focus:border-indigo" />
                              </div>
                              <div>
                                <label className="text-[9px] text-muted uppercase block mb-1">Target</label>
                                <input type="text" value={editTargetText} onChange={e => setEditTargetText(e.target.value)}
                                  className="w-full bg-surface border border-border-dark text-[11px] text-frost p-1.5 rounded font-mono focus:outline-none focus:border-indigo" />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingPosId(null)} className="text-[10px] text-muted hover:text-frost px-2 py-1">Cancel</button>
                              <button onClick={() => handleSaveInlineEdit(pos.id)} className="bg-indigo hover:bg-[#8183F4] text-white text-[10px] px-2.5 py-1 rounded-[4px] flex items-center gap-1 transition-colors">
                                <Check className="w-3 h-3" /> Save
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

            {/* Trade History */}
            <div className="bg-[#0D0F14]/60 border border-border-dark rounded-[8px] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border-dark/60">
                <CheckCircle className="w-3.5 h-3.5 text-indigo" />
                <span className="text-[11px] font-semibold text-frost uppercase tracking-wider">Trade History</span>
                <span className="ml-auto text-[10px] text-muted font-mono">{closedTrades.length} trades · {winRate}% win</span>
              </div>

              {closedTrades.length === 0 ? (
                <div className="py-8 text-center text-muted text-[11px]">No completed trades yet.</div>
              ) : (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border-dark text-[9px] text-muted uppercase tracking-wider">
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2">Ticker</th>
                          <th className="px-4 py-2">Type</th>
                          <th className="px-4 py-2 text-right">Entry</th>
                          <th className="px-4 py-2 text-right">Exit</th>
                          <th className="px-4 py-2 text-center">Result</th>
                          <th className="px-4 py-2 text-right">P&L%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-dark/30 text-[11px]">
                        {currentTrades.map((h, idx) => (
                          <tr key={h.id || idx} className="hover:bg-[#111318]/40 transition-colors">
                            <td className="px-4 py-2 text-muted">{h.date}</td>
                            <td className="px-4 py-2 font-brand font-bold tracking-wider text-frost">{h.ticker}</td>
                            <td className="px-4 py-2">
                              <span className={h.signalType === 'BUY' ? 'text-[#22C55E]' : 'text-[#EF4444]'}>{h.signalType}</span>
                            </td>
                            <td className="px-4 py-2 font-mono text-right">₹{h.entryPrice.toFixed(2)}</td>
                            <td className="px-4 py-2 font-mono text-right">₹{h.exitPrice.toFixed(2)}</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${h.result === 'WIN' ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'bg-[#EF4444]/15 text-[#EF4444]'}`}>{h.result}</span>
                            </td>
                            <td className={`px-4 py-2 font-mono text-right ${h.pnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                              {h.pnlPct >= 0 ? '+' : ''}{h.pnlPct.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center text-[11px] text-muted px-4 py-2 border-t border-border-dark/30">
                      <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="hover:text-frost disabled:opacity-30">← Prev</button>
                      <span>{currentPage} / {totalPages}</span>
                      <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="hover:text-frost disabled:opacity-30">Next →</button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT: Available Signals — full height searchable list */}
          <div className="bg-[#0D0F14]/60 border border-border-dark rounded-[8px] overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 260px)', position: 'sticky', top: '16px' }}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-border-dark/60 flex-shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-3.5 h-3.5 text-indigo" />
                <span className="text-[11px] font-semibold text-frost uppercase tracking-wider">Available Signals</span>
                <span className="ml-auto text-[10px] text-muted font-mono">{filteredSignals.length}</span>
              </div>
              {/* Search */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted" />
                <input
                  type="text"
                  placeholder="Search ticker..."
                  value={signalSearch}
                  onChange={e => setSignalSearch(e.target.value)}
                  className="w-full bg-[#111318] border border-border-dark text-[11px] text-frost pl-7 pr-7 py-1.5 rounded-[6px] font-mono focus:outline-none focus:border-indigo placeholder-[#374151]"
                />
                {signalSearch && (
                  <button onClick={() => setSignalSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-frost">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {/* Filter pills */}
              <div className="flex gap-1.5">
                {(['ALL', 'BUY', 'SELL'] as const).map(f => (
                  <button key={f} onClick={() => setSignalFilter(f)}
                    className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border transition-all ${
                      signalFilter === f
                        ? f === 'BUY' ? 'bg-[#22C55E]/20 border-[#22C55E] text-[#22C55E]'
                          : f === 'SELL' ? 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]'
                          : 'bg-[#6366F1]/20 border-[#6366F1] text-indigo'
                        : 'border-border-dark text-muted hover:text-frost'
                    }`}
                  >{f}</button>
                ))}
              </div>
            </div>

            {/* Scrollable signal list */}
            <div className="flex-1 overflow-y-auto divide-y divide-border-dark/30" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E2230 transparent' }}>
              {isLoadingSignals ? (
                <div className="p-4 space-y-2">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-[52px] bg-[#111318]/50 border border-border-dark rounded-[6px] animate-pulse" />
                  ))}
                </div>
              ) : filteredSignals.length === 0 ? (
                <div className="py-12 text-center text-muted text-[11px]">No signals match "{signalSearch}"</div>
              ) : (
                filteredSignals.map((sig) => (
                  <div key={sig.id} className="px-4 py-2.5 hover:bg-[#111318]/60 transition-colors flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sig.signalType === 'BUY' ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-brand font-bold text-[12px] text-frost tracking-wider truncate">{sig.ticker}</span>
                          <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${sig.signalType === 'BUY' ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>{sig.signalType}</span>
                        </div>
                        <div className="text-[9px] text-muted font-mono mt-0.5">
                          {sig.market} · Entry {sig.entry?.toFixed(2) ?? '—'} · <span className="text-indigo">{sig.confidence}%</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenTradeModal(sig)}
                      className="flex-shrink-0 text-[10px] font-semibold border border-[#6366F1]/40 hover:border-[#6366F1] hover:bg-[#6366F1]/10 text-indigo px-2.5 py-1 rounded-[4px] transition-all"
                    >
                      Trade
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Trade Modal */}
      <AnimatePresence>
        {selectedSignalForTrade && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.55 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedSignalForTrade(null)} className="fixed inset-0 bg-black z-40" />
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }} transition={{ duration: 0.18 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-[380px] bg-surface border border-border-dark rounded-[12px] p-5 z-50 text-frost font-sans shadow-2xl space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[13px] font-brand font-semibold text-frost uppercase tracking-widest">
                    {selectedSignalForTrade.ticker}
                  </h3>
                  <button onClick={() => setSelectedSignalForTrade(null)} className="text-muted hover:text-frost">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-muted">
                  Signal: <span className={selectedSignalForTrade.signalType === 'BUY' ? 'text-[#22C55E]' : 'text-[#EF4444]'}>{selectedSignalForTrade.signalType}</span>
                  {' '}({selectedSignalForTrade.confidence}%) · {selectedSignalForTrade.market}
                </p>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[9px] text-muted uppercase font-semibold block mb-1.5">Investment Amount</label>
                  <div className="flex gap-1.5 mb-1.5">
                    {['1000','2000','5000','10000'].map(p => (
                      <button key={p} onClick={() => setCustomAmountText(p)}
                        className={`flex-1 py-1 rounded text-[10px] font-mono border transition-all ${customAmountText === p ? 'bg-[#6366F1] border-[#6366F1] text-white' : 'bg-void border-border-dark text-muted hover:text-frost'}`}>
                        ₹{+p >= 1000 ? `${+p/1000}K` : p}
                      </button>
                    ))}
                  </div>
                  <input type="text" value={customAmountText} onChange={e => setCustomAmountText(e.target.value)}
                    className="w-full bg-void border border-border-dark text-[11px] text-frost p-2 rounded-[6px] font-mono focus:outline-none focus:border-indigo" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Entry', val: customEntryText, set: setCustomEntryText },
                    { label: 'Stop Loss', val: customSLText, set: setCustomSLText },
                    { label: 'Target', val: customTargetText, set: setCustomTargetText },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="text-[9px] text-muted uppercase font-semibold block mb-1">{f.label}</label>
                      <input type="text" value={f.val} onChange={e => f.set(e.target.value)}
                        className="w-full bg-void border border-border-dark text-[11px] text-frost p-1.5 rounded-[4px] font-mono focus:outline-none focus:border-indigo" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-void border border-border-dark rounded-[6px] p-3 text-[10px] space-y-1.5 text-muted">
                {[
                  ['Shares', Math.floor((parseFloat(customAmountText) || 5000) / (parseFloat(customEntryText) || 1)).toString()],
                  ['R:R', (Math.abs((parseFloat(customTargetText) || 0) - (parseFloat(customEntryText) || 0)) / Math.max(0.1, Math.abs((parseFloat(customEntryText) || 0) - (parseFloat(customSLText) || 0)))).toFixed(2) + 'x'],
                  ['Max Loss', `₹${(Math.abs(parseFloat(customEntryText) - parseFloat(customSLText)) * (parseFloat(customAmountText) || 5000) / Math.max(0.01, parseFloat(customEntryText))).toFixed(0)}`],
                  ['Cash After', `₹${(balance - (parseFloat(customAmountText) || 5000)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span>{k}</span>
                    <span className="font-mono text-frost">{v}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <button onClick={handleConfirmTrade}
                  className="w-full bg-[#6366F1] hover:bg-[#8183F4] text-white text-[12px] font-semibold py-2.5 rounded-[6px] transition-colors">
                  Confirm Trade
                </button>
                <button onClick={() => setSelectedSignalForTrade(null)}
                  className="w-full text-center text-muted hover:text-frost text-[10px] transition-colors">
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}