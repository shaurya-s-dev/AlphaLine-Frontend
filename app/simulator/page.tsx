'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function CountUp({ 
  value, 
  duration = 1000, 
  decimalPlaces = 0, 
  prefix = '',
  suffix = '' 
}: { 
  value: number; 
  duration?: number; 
  decimalPlaces?: number; 
  prefix?: string;
  suffix?: string; 
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCurrent(progress * value);
      
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  return <span className="font-mono">{prefix}{current.toFixed(decimalPlaces)}{suffix}</span>;
}

export default function SimulatorPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.title = "Alphaline — Portfolio Simulator";
  }, []);

  const chartData = [
    { date: "Jun 20", value: 0 },
    { date: "Jun 21", value: 1.2 },
    { date: "Jun 22", value: 0.8 },
    { date: "Jun 23", value: 3.1 },
    { date: "Jun 24", value: 2.4 },
    { date: "Jun 25", value: 5.7 },
    { date: "Jun 26", value: 8.2 },
    { date: "Jun 27", value: 12.4 },
  ];

  const trades = [
    { date: "Jun 20", ticker: "RELIANCE.NS", signal: "BUY", entry: "₹2,820.00", exit: "₹2,960.00", pnl: 4.97, result: "WIN" },
    { date: "Jun 21", ticker: "TCS.NS", signal: "BUY", entry: "₹3,480.00", exit: "₹3,410.00", pnl: -2.01, result: "LOSS" },
    { date: "Jun 21", ticker: "AAPL", signal: "BUY", entry: "$185.20", exit: "$193.10", pnl: 4.27, result: "WIN" },
    { date: "Jun 22", ticker: "INFY.NS", signal: "BUY", entry: "₹1,420.00", exit: "₹1,390.00", pnl: -2.11, result: "LOSS" },
    { date: "Jun 23", ticker: "NVDA", signal: "BUY", entry: "$118.50", exit: "$126.80", pnl: 7.00, result: "WIN" },
    { date: "Jun 24", ticker: "TSLA", signal: "BUY", entry: "$175.40", exit: "$169.80", pnl: -3.19, result: "LOSS" },
    { date: "Jun 24", ticker: "HDFCBANK.NS", signal: "BUY", entry: "₹1,590.00", exit: "₹1,640.00", pnl: 3.14, result: "WIN" },
    { date: "Jun 25", ticker: "MSFT", signal: "BUY", entry: "$412.00", exit: "$424.50", pnl: 3.03, result: "WIN" },
    { date: "Jun 26", ticker: "GOOGL", signal: "BUY", entry: "$168.20", exit: "$174.90", pnl: 3.98, result: "WIN" },
    { date: "Jun 27", ticker: "COIN", signal: "BUY", entry: "$215.00", exit: "$228.40", pnl: 6.23, result: "WIN" }
  ];

  return (
    <div className="min-h-screen bg-void text-frost flex flex-col font-sans">
      <Sidebar activeTab="Simulator" />
      <AnimatedBackground />

      <main className="flex-1 md:pl-[220px] p-6 pb-24 md:pb-6 max-w-5xl w-full mx-auto relative z-10">
        
        {/* Title Header */}
        <div className="mb-8 select-none">
          <h1 className="text-[20px] font-medium text-frost mb-1.5 font-sans leading-none">Portfolio Simulator</h1>
          <p className="text-[13px] text-muted font-sans font-normal leading-normal">
            Simulated performance based on systematic executions of our BUY confluence signals.
          </p>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 select-none">
          
          {/* Card 1: Portfolio Return */}
          <div className="bg-[#111318]/50 backdrop-blur-md border border-border-dark p-6 rounded-[6px]">
            <div className="text-[12px] text-dim font-sans mb-2 font-normal leading-none uppercase tracking-wider">
              Portfolio Return
            </div>
            <div className="text-[36px] font-mono font-bold text-sig-green leading-none mb-2">
              {mounted ? <CountUp value={12.4} decimalPlaces={1} prefix="+" suffix="%" /> : "+0.0%"}
            </div>
            <div className="text-[11px] text-muted font-sans font-normal leading-none">
              Last 7 days &middot; All BUY signals
            </div>
          </div>

          {/* Card 2: Win Rate */}
          <div className="bg-[#111318]/50 backdrop-blur-md border border-border-dark p-6 rounded-[6px]">
            <div className="text-[12px] text-dim font-sans mb-2 font-normal leading-none uppercase tracking-wider">
              Win Rate
            </div>
            <div className="text-[36px] font-mono font-bold text-indigo leading-none mb-2">
              {mounted ? <CountUp value={68} decimalPlaces={0} suffix="%" /> : "0%"}
            </div>
            <div className="text-[11px] text-muted font-sans font-normal leading-none">
              Ratio of positive trade outcomes
            </div>
          </div>

          {/* Card 3: Signals Followed */}
          <div className="bg-[#111318]/50 backdrop-blur-md border border-border-dark p-6 rounded-[6px]">
            <div className="text-[12px] text-dim font-sans mb-2 font-normal leading-none uppercase tracking-wider">
              Signals Followed
            </div>
            <div className="text-[36px] font-mono font-bold text-frost leading-none mb-2">
              {mounted ? <CountUp value={23} decimalPlaces={0} /> : "0"}
            </div>
            <div className="text-[11px] text-muted font-sans font-normal leading-none">
              Total buy executions tracked
            </div>
          </div>
        </div>

        {/* Equity Curve Chart */}
        <div className="bg-[#111318]/40 backdrop-blur-md border border-border-dark rounded-[6px] p-5 mb-8 select-none">
          <div className="text-[12px] font-normal text-dim uppercase tracking-wider font-sans mb-4">
            Cumulative P&amp;L Growth Curve (%)
          </div>
          
          <div className="w-full h-[240px]">
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
                    contentStyle={{ 
                      backgroundColor: '#111318', 
                      borderColor: '#1E2230', 
                      borderRadius: '6px', 
                      color: '#E2E8F0',
                      fontFamily: 'var(--font-jetbrains-mono)',
                      fontSize: '12px'
                    }}
                    labelStyle={{ fontFamily: 'var(--font-inter)', color: '#6B7280', fontSize: '11px', marginBottom: '4px' }}
                    formatter={(value: any) => [`+${parseFloat(value).toFixed(1)}%`, "Cumulative Gain"]}
                  />

                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#6366F1" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#simChartGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Trade Log Table */}
        <div className="bg-[#111318]/50 backdrop-blur-md border border-border-dark rounded-[6px] overflow-hidden">
          <div className="px-4 py-3 bg-void border-b border-border-dark flex items-center justify-between select-none">
            <span className="font-brand font-semibold text-[11px] text-muted tracking-wider uppercase">
              SIMULATED TRADE LOG
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-void/50 border-b border-border-dark select-none">
                  <th className="p-3 text-[11px] font-normal text-dim uppercase tracking-wide font-sans">Date</th>
                  <th className="p-3 text-[11px] font-normal text-dim uppercase tracking-wide font-sans">Ticker</th>
                  <th className="p-3 text-[11px] font-normal text-dim uppercase tracking-wide font-sans">Signal</th>
                  <th className="p-3 text-[11px] font-normal text-dim uppercase tracking-wide font-sans text-right">Entry</th>
                  <th className="p-3 text-[11px] font-normal text-dim uppercase tracking-wide font-sans text-right">Exit</th>
                  <th className="p-3 text-[11px] font-normal text-dim uppercase tracking-wide font-sans text-center">Result</th>
                  <th className="p-3 text-[11px] font-normal text-dim uppercase tracking-wide font-sans text-right">P&amp;L%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2230]/40 font-sans text-[13px] text-[#E2E8F0]">
                {trades.map((trade, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors duration-150 hover:bg-[#1C1F28] ${
                      idx % 2 === 0 ? 'bg-transparent' : 'bg-void/10'
                    }`}
                  >
                    <td className="p-3 font-normal whitespace-nowrap">{trade.date}</td>
                    <td className="p-3 font-medium whitespace-nowrap font-brand">{trade.ticker}</td>
                    <td className="p-3 font-normal whitespace-nowrap">
                      <span className="text-sig-green font-medium px-1.5 py-0.5 rounded bg-sig-green/10 border border-sig-green/20 text-[11px]">
                        {trade.signal}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-right whitespace-nowrap">{trade.entry}</td>
                    <td className="p-3 font-mono text-right whitespace-nowrap">{trade.exit}</td>
                    <td className="p-3 font-medium text-center whitespace-nowrap">
                      <span 
                        className="text-[11px] px-1.5 py-0.5 rounded font-medium border"
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
          </div>
        </div>

      </main>
    </div>
  );
}
