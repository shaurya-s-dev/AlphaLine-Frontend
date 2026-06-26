'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { Star, TrendingUp, DollarSign, Briefcase, Play, RotateCcw, XCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

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
  const [balance, setBalance] = useState<number>(100000); // virtual $100k
  const [positions, setPositions] = useState<Position[]>([]);
  const [history, setHistory] = useState<CompletedTrade[]>([]);

  // Form states for entering a trade
  const [tradeAmount, setTradeAmount] = useState<string>("5000");

  useEffect(() => {
    setMounted(true);
    document.title = "Alphaline — Portfolio Simulator";

    // Load LocalStorage states
    if (typeof window !== 'undefined') {
      const storedBalance = localStorage.getItem('sim_balance');
      const storedPositions = localStorage.getItem('sim_positions');
      const storedHistory = localStorage.getItem('sim_history');

      if (storedBalance) setBalance(parseFloat(storedBalance));
      if (storedPositions) setPositions(JSON.parse(storedPositions));
      if (storedHistory) setHistory(JSON.parse(storedHistory));
    }

    // Fetch signals for actionable triggers
    const fetchSignals = async () => {
      try {
        setIsLoadingSignals(true);
        const res = await fetch('/api/signals?market=All');
        if (!res.ok) throw new Error("API failed");
        const data = await res.json();
        if (data.success && data.signals && data.signals.length > 0) {
          setSignals(data.signals.filter((s: any) => s.signalType === 'BUY' || s.signalType === 'SELL'));
        } else {
          // Fallbacks
          setSignals([
            { id: 'mock_1', ticker: 'RELIANCE.NS', market: 'NSE', signalType: 'BUY', confidence: 81, entry: 2847.50, stopLoss: 2790.00, target: 2960.00 },
            { id: 'mock_2', ticker: 'AAPL', market: 'US', signalType: 'BUY', confidence: 85, entry: 189.20, stopLoss: 185.00, target: 198.00 },
            { id: 'mock_3', ticker: 'TCS.NS', market: 'NSE', signalType: 'SELL', confidence: 74, entry: 3850.00, stopLoss: 3920.00, target: 3710.00 },
            { id: 'mock_4', ticker: 'TSLA', market: 'US', signalType: 'BUY', confidence: 68, entry: 175.50, stopLoss: 168.00, target: 192.00 }
          ]);
        }
      } catch (e) {
        console.warn("Using fallbacks for simulator active list");
        setSignals([
          { id: 'mock_1', ticker: 'RELIANCE.NS', market: 'NSE', signalType: 'BUY', confidence: 81, entry: 2847.50, stopLoss: 2790.00, target: 2960.00 },
          { id: 'mock_2', ticker: 'AAPL', market: 'US', signalType: 'BUY', confidence: 85, entry: 189.20, stopLoss: 185.00, target: 198.00 }
        ]);
      } finally {
        setIsLoadingSignals(false);
      }
    };
    fetchSignals();
  }, []);

  // Update current open positions price occasionally with small variance
  useEffect(() => {
    if (positions.length === 0) return;
    const interval = setInterval(() => {
      const updated = positions.map(pos => {
        const changePercent = (Math.random() - 0.49) * 0.005; // slight bias
        const nextPrice = pos.currentPrice * (1 + changePercent);
        return {
          ...pos,
          currentPrice: Math.round(nextPrice * 100) / 100
        };
      });
      setPositions(updated);
      localStorage.setItem('sim_positions', JSON.stringify(updated));
    }, 8000);
    return () => clearInterval(interval);
  }, [positions]);

  const saveSimulationData = (newBalance: number, newPositions: Position[], newHistory: CompletedTrade[]) => {
    setBalance(newBalance);
    setPositions(newPositions);
    setHistory(newHistory);
    localStorage.setItem('sim_balance', newBalance.toString());
    localStorage.setItem('sim_positions', JSON.stringify(newPositions));
    localStorage.setItem('sim_history', JSON.stringify(newHistory));
  };

  const handleReset = () => {
    saveSimulationData(100000, [], []);
    toast.success("Simulation portfolio reset to default $100k cash.");
  };

  const handleExecuteTrade = (signal: any) => {
    const amount = parseFloat(tradeAmount) || 0;
    if (amount <= 0) {
      toast.error("Enter a valid allocation amount.");
      return;
    }
    if (amount > balance) {
      toast.error("Insufficient virtual cash balance.");
      return;
    }

    const entryPrice = signal.entry || 100;
    const quantity = amount / entryPrice;
    
    const newPosition: Position = {
      id: `${signal.ticker}_${Date.now()}`,
      ticker: signal.ticker,
      signalType: signal.signalType,
      entryPrice,
      currentPrice: entryPrice,
      quantity,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
    };

    const nextBalance = balance - amount;
    const nextPositions = [...positions, newPosition];
    
    saveSimulationData(nextBalance, nextPositions, history);
    toast.success(`Executed ${signal.signalType} position in ${signal.ticker}`);
  };

  const handleClosePosition = (position: Position) => {
    const isBuy = position.signalType === 'BUY';
    const entryVal = position.quantity * position.entryPrice;
    
    // For BUY: profit when current > entry
    // For SELL: profit when entry > current
    const priceDiff = isBuy 
      ? position.currentPrice - position.entryPrice
      : position.entryPrice - position.currentPrice;
      
    const tradePnlPercent = (priceDiff / position.entryPrice) * 100;
    const pnlCash = position.quantity * priceDiff;
    const exitVal = entryVal + pnlCash;

    const nextBalance = balance + exitVal;
    const nextPositions = positions.filter(p => p.id !== position.id);
    
    const completed: CompletedTrade = {
      id: position.id,
      ticker: position.ticker,
      signalType: position.signalType,
      entryPrice: position.entryPrice,
      exitPrice: position.currentPrice,
      quantity: position.quantity,
      pnl: tradePnlPercent,
      result: tradePnlPercent >= 0 ? 'WIN' : 'LOSS',
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
    };

    const nextHistory = [completed, ...history];

    saveSimulationData(nextBalance, nextPositions, nextHistory);
    toast.success(`Closed ${position.ticker} position. P&L: ${tradePnlPercent >= 0 ? '+' : ''}${tradePnlPercent.toFixed(2)}%`);
  };

  // Calculations
  const openPositionsValue = positions.reduce((acc, pos) => {
    const isBuy = pos.signalType === 'BUY';
    const priceDiff = isBuy 
      ? pos.currentPrice - pos.entryPrice
      : pos.entryPrice - pos.currentPrice;
    return acc + (pos.quantity * pos.entryPrice) + (pos.quantity * priceDiff);
  }, 0);

  const totalEquity = balance + openPositionsValue;
  const initialValue = 100000;
  const portfolioReturnPercent = ((totalEquity - initialValue) / initialValue) * 100;
  
  const winCount = history.filter(h => h.result === 'WIN').length;
  const winRate = history.length > 0 ? Math.round((winCount / history.length) * 100) : 0;

  // Chart data showing equity curve growth
  const chartData = [
    { date: "Start", value: 0 },
    ...history.slice().reverse().map((t, idx) => {
      return {
        date: t.date,
        value: parseFloat((((history.slice(0, idx + 1).reduce((acc, cur) => acc + (cur.exitPrice - cur.entryPrice) * cur.quantity, 0)) / initialValue) * 100).toFixed(2))
      };
    })
  ];

  return (
    <div className="min-h-screen bg-void text-frost flex flex-col font-sans">
      <Sidebar activeTab="Simulator" />
      <AnimatedBackground />

      <main className="flex-1 md:pl-[220px] p-6 pb-24 md:pb-6 max-w-5xl w-full mx-auto relative z-10">
        
        {/* Title Header */}
        <div className="mb-8 select-none flex justify-between items-center">
          <div>
            <h1 className="text-[20px] font-medium text-frost mb-1.5 font-sans leading-none">Portfolio Simulator</h1>
            <p className="text-[13px] text-muted font-sans font-normal leading-normal">
              Systems Paper Trading - execute signals, manage allocations, and track simulated performance.
            </p>
          </div>
          <button 
            onClick={handleReset}
            className="flex items-center gap-1.5 border border-border-dark bg-raised/40 text-[11px] text-muted hover:text-frost px-3 py-1.5 rounded-[6px] hover:border-[#374151] transition-colors"
          >
            <RotateCcw size={11} /> Reset Portfolio
          </button>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 select-none">
          
          <div className="bg-[#111318]/50 backdrop-blur-md border border-border-dark p-4 rounded-[6px]">
            <div className="text-[11px] text-dim font-sans mb-1 font-normal uppercase tracking-wider">
              Total Equity
            </div>
            <div className="text-[24px] font-mono font-bold text-frost leading-none">
              ${totalEquity.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-[#111318]/50 backdrop-blur-md border border-border-dark p-4 rounded-[6px]">
            <div className="text-[11px] text-dim font-sans mb-1 font-normal uppercase tracking-wider">
              Cash Balance
            </div>
            <div className="text-[24px] font-mono font-bold text-muted leading-none">
              ${balance.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-[#111318]/50 backdrop-blur-md border border-border-dark p-4 rounded-[6px]">
            <div className="text-[11px] text-dim font-sans mb-1 font-normal uppercase tracking-wider">
              Portfolio Return
            </div>
            <div className={`text-[24px] font-mono font-bold leading-none ${portfolioReturnPercent >= 0 ? 'text-sig-green' : 'text-sig-red'}`}>
              {portfolioReturnPercent >= 0 ? '+' : ''}{portfolioReturnPercent.toFixed(2)}%
            </div>
          </div>

          <div className="bg-[#111318]/50 backdrop-blur-md border border-border-dark p-4 rounded-[6px]">
            <div className="text-[11px] text-dim font-sans mb-1 font-normal uppercase tracking-wider">
              Win Rate
            </div>
            <div className="text-[24px] font-mono font-bold text-indigo leading-none">
              {winRate}%
            </div>
          </div>
        </div>

        {/* Execution Hub Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          
          {/* Active Setups / Execute Trades */}
          <div className="bg-[#111318]/50 backdrop-blur-md border border-border-dark rounded-[6px] p-4 lg:col-span-1 flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-border-dark pb-2">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Actionable Signal Executions
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted">Alloc:</span>
                <input
                  type="text"
                  value={tradeAmount}
                  onChange={e => setTradeAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-14 bg-void border border-border-dark text-[11px] text-frost text-right px-1 py-0.5 rounded font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[220px] space-y-2 pr-1.5">
              {isLoadingSignals ? (
                <div className="text-center py-6 text-[12px] text-muted">Loading signals...</div>
              ) : signals.length > 0 ? (
                signals.map((sig, idx) => (
                  <div key={sig.id || idx} className="bg-void border border-border-dark/60 p-2.5 rounded-[6px] flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-semibold text-frost flex items-center gap-1.5 leading-none">
                        {sig.ticker}
                        <span className={`text-[9px] px-1 py-0.5 font-bold rounded ${
                          sig.signalType === 'BUY' ? 'text-sig-green bg-sig-green/5' : 'text-sig-red bg-sig-red/5'
                        }`}>
                          {sig.signalType}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted font-mono mt-1">
                        Entry: ${sig.entry || sig.entry_price}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleExecuteTrade(sig)}
                      className="border border-[#6366F1]/30 bg-[#6366F1]/10 text-indigo hover:bg-[#6366F1]/20 px-2 py-1 rounded text-[11px] font-sans font-medium flex items-center gap-1"
                    >
                      <Play size={9} fill="currentColor" /> Execute
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-[12px] text-muted">No signals available.</div>
              )}
            </div>
          </div>

          {/* Equity Chart */}
          <div className="bg-[#111318]/40 backdrop-blur-md border border-border-dark rounded-[6px] p-4 lg:col-span-2">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-3">
              Equity Gain Curve (%)
            </span>
            <div className="w-full h-[180px]">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="simChartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#374151', fontSize: 10, fontFamily: 'var(--font-jetbrains-mono)' }} 
                    />
                    <YAxis hide={true} domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111318', borderColor: '#1E2230', borderRadius: '6px', color: '#E2E8F0', fontSize: '11px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#6366F1" 
                      strokeWidth={2} 
                      fill="url(#simChartGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>

        {/* Open Positions Grid */}
        <div className="bg-[#111318]/50 backdrop-blur-md border border-border-dark rounded-[6px] overflow-hidden mb-6">
          <div className="px-4 py-3 bg-void border-b border-border-dark">
            <span className="font-brand font-semibold text-[11px] text-muted tracking-wider uppercase">
              ACTIVE PAPER POSITIONS ({positions.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            {positions.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-void/50 border-b border-border-dark select-none">
                    <th className="p-3 text-[10px] font-normal text-dim uppercase tracking-wide font-sans">Ticker</th>
                    <th className="p-3 text-[10px] font-normal text-dim uppercase tracking-wide font-sans">Type</th>
                    <th className="p-3 text-[10px] font-normal text-dim uppercase tracking-wide font-sans text-right">Entry Price</th>
                    <th className="p-3 text-[10px] font-normal text-dim uppercase tracking-wide font-sans text-right">Current Price</th>
                    <th className="p-3 text-[10px] font-normal text-dim uppercase tracking-wide font-sans text-right">Position Value</th>
                    <th className="p-3 text-[10px] font-normal text-dim uppercase tracking-wide font-sans text-right">Floating P&amp;L</th>
                    <th className="p-3 text-[10px] font-normal text-dim uppercase tracking-wide font-sans text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2230]/40 font-sans text-[13px] text-[#E2E8F0]">
                  {positions.map((pos) => {
                    const isBuy = pos.signalType === 'BUY';
                    const diff = isBuy ? pos.currentPrice - pos.entryPrice : pos.entryPrice - pos.currentPrice;
                    const pnlPercent = (diff / pos.entryPrice) * 100;
                    const entryVal = pos.quantity * pos.entryPrice;
                    const currentVal = entryVal + (pos.quantity * diff);

                    return (
                      <tr key={pos.id} className="hover:bg-[#1C1F28] transition-colors duration-150">
                        <td className="p-3 font-semibold font-brand">{pos.ticker}</td>
                        <td className="p-3">
                          <span className={`text-[10px] px-1.5 py-0.5 font-bold rounded ${
                            pos.signalType === 'BUY' ? 'text-sig-green bg-sig-green/5' : 'text-sig-red bg-sig-red/5'
                          }`}>
                            {pos.signalType}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-right">${pos.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 font-mono text-right">${pos.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="p-3 font-mono text-right">${currentVal.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                        <td className={`p-3 font-mono text-right font-semibold ${pnlPercent >= 0 ? 'text-sig-green' : 'text-sig-red'}`}>
                          {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleClosePosition(pos)}
                            className="border border-sig-red/30 hover:bg-sig-red/10 text-sig-red px-2 py-0.5 rounded text-[11px] transition-colors font-medium inline-flex items-center gap-1"
                          >
                            <XCircle size={10} /> Close
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-[12px] text-muted font-sans bg-void/10 select-none">
                No open simulated positions. Execute setups above to start trading.
              </div>
            )}
          </div>
        </div>

        {/* Trade Log Table */}
        <div className="bg-[#111318]/50 backdrop-blur-md border border-border-dark rounded-[6px] overflow-hidden">
          <div className="px-4 py-3 bg-void border-b border-border-dark flex items-center justify-between select-none">
            <span className="font-brand font-semibold text-[11px] text-muted tracking-wider uppercase">
              COMPLETED PAPER TRADE LOG ({history.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            {history.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-void/50 border-b border-border-dark select-none">
                    <th className="p-3 text-[10px] font-normal text-dim uppercase tracking-wide font-sans">Date</th>
                    <th className="p-3 text-[10px] font-normal text-dim uppercase tracking-wide font-sans">Ticker</th>
                    <th className="p-3 text-[10px] font-normal text-dim uppercase tracking-wide font-sans">Signal</th>
                    <th className="p-3 text-[10px] font-normal text-dim uppercase tracking-wide font-sans text-right">Entry</th>
                    <th className="p-3 text-[10px] font-normal text-dim uppercase tracking-wide font-sans text-right">Exit</th>
                    <th className="p-3 text-[10px] font-normal text-dim uppercase tracking-wide font-sans text-center">Result</th>
                    <th className="p-3 text-[10px] font-normal text-dim uppercase tracking-wide font-sans text-right">P&amp;L%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2230]/40 font-sans text-[13px] text-[#E2E8F0]">
                  {history.map((trade, idx) => (
                    <tr
                      key={trade.id}
                      className={`transition-colors duration-150 hover:bg-[#1C1F28] ${
                        idx % 2 === 0 ? 'bg-transparent' : 'bg-void/10'
                      }`}
                    >
                      <td className="p-3 font-normal whitespace-nowrap">{trade.date}</td>
                      <td className="p-3 font-medium whitespace-nowrap font-brand">{trade.ticker}</td>
                      <td className="p-3 font-normal whitespace-nowrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                          trade.signalType === 'BUY' ? 'border-sig-green/20 text-sig-green' : 'border-sig-red/20 text-sig-red'
                        }`}>
                          {trade.signalType}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-right whitespace-nowrap">${trade.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 font-mono text-right whitespace-nowrap">${trade.exitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 font-medium text-center whitespace-nowrap">
                        <span 
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium border"
                          style={{
                            backgroundColor: trade.result === 'WIN' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            borderColor: trade.result === 'WIN' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: trade.result === 'WIN' ? '#22C55E' : '#EF4444'
                          }}
                        >
                          {trade.result}
                        </span>
                      </td>
                      <td className={`p-3 font-mono text-right whitespace-nowrap font-semibold ${
                        trade.pnl > 0 ? 'text-sig-green' : 'text-sig-red'
                      }`}>
                        {trade.pnl > 0 ? `+${trade.pnl.toFixed(2)}` : `${trade.pnl.toFixed(2)}`}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-[12px] text-muted font-sans bg-void/10 select-none">
                No closed paper trades. Closed positions will show up in this log.
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
