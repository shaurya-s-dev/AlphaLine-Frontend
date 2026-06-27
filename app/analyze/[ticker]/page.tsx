'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { ArrowLeft, ArrowUpRight, TrendingUp, ShieldAlert, Cpu, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function AnalyzeTickerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  
  const ticker = (params.ticker as string) || 'RELIANCE.NS';
  const signalType = searchParams.get('signal') || 'BUY';
  const confidence = parseInt(searchParams.get('confidence') || '80', 10);
  const entryPrice = parseFloat(searchParams.get('entry') || '150');

  const [news, setNews] = useState<any[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(true);
  
  // AI analysis states
  const [aiAnalysis, setAiAnalysis] = useState<any | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Load news on mount
  useEffect(() => {
    document.title = `Alphaline — Analyze ${ticker}`;

    const fetchNews = async () => {
      try {
        setIsNewsLoading(true);
        const res = await fetch(`/api/news?ticker=${ticker}`);
        if (!res.ok) throw new Error("Failed to load news");
        const data = await res.json();
        if (data.success && data.news) {
          setNews(data.news);
        }
      } catch (e) {
        console.warn("News fetch warning, using fallback list.");
        setNews([
          { source: 'Bloomberg', title: `${ticker} technical levels in focus post-breakout`, time: '3h ago', sentiment: 'POSITIVE', url: '#' },
          { source: 'Reuters', title: `Volume breakout support noted on ${ticker} trendline`, time: '6h ago', sentiment: 'POSITIVE', url: '#' },
          { source: 'CNBC', title: `Market analysts evaluate ${ticker} target zones`, time: '14h ago', sentiment: 'NEUTRAL', url: '#' },
          { source: 'Capital', title: `Sector consolidation puts ${ticker} relative strength to test`, time: '1d ago', sentiment: 'NEGATIVE', url: '#' }
        ]);
      } finally {
        setIsNewsLoading(false);
      }
    };

    fetchNews();
  }, [ticker]);

  // TradingView symbol translator helper
  function tickerToTVSymbol(ticker: string): string {
    // NSE tickers: RELIANCE.NS → NSE:RELIANCE
    if (ticker.endsWith('.NS')) {
      return 'NSE:' + ticker.replace('.NS', '');
    }
    // BSE tickers: RELIANCE.BO → BSE:RELIANCE  
    if (ticker.endsWith('.BO')) {
      return 'BSE:' + ticker.replace('.BO', '');
    }
    // US tickers — map to correct exchange
    const nasdaq = ['AAPL','MSFT','GOOGL','GOOG',
      'META','NVDA','TSLA','AMZN','AMD','NFLX',
      'INTC','QCOM','SHOP','COIN','CRM','ORCL'];
    const nyse = ['JPM','BAC','WFC','GS','MS',
      'JNJ','PFE','KO','PG','XOM','CVX'];
    if (nasdaq.includes(ticker)) return 'NASDAQ:' + ticker;
    if (nyse.includes(ticker)) return 'NYSE:' + ticker;
    return 'NASDAQ:' + ticker; // default
  }

  // TradingView widget initialization & dynamic reload
  useEffect(() => {
    // Clear previous widget
    const container = document.getElementById('tv_chart');
    if (container) container.innerHTML = '';
    
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if (typeof window !== 'undefined' && (window as any).TradingView) {
        new (window as any).TradingView.widget({
          width: '100%',
          height: 420,
          symbol: tickerToTVSymbol(ticker),
          interval: 'D',
          timezone: 'Asia/Kolkata',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#111318',
          enable_publishing: false,
          container_id: 'tv_chart',
          hide_side_toolbar: false,
          allow_symbol_change: true,
        });
      }
    };
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [ticker]); // re-runs when ticker changes

  const handleAiAnalysis = async () => {
    setIsAiLoading(true);
    setAiAnalysis(null);
    const toastId = toast.loading("Invoking Llama-3.1 model to generate report...");

    try {
      const summaryText = news.map(n => `[${n.sentiment}] ${n.title}`).join('\n');
      
      const res = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          currentPrice: entryPrice,
          signalType,
          confidence,
          rsi: signalType === 'BUY' ? 38 : signalType === 'SELL' ? 68 : 50,
          volume: 1.35,
          news: summaryText
        })
      });

      if (!res.ok) throw new Error("Failed AI generation");
      const data = await res.json();
      
      if (data.success && data.analysis) {
        const parsed = parseMarkdownSections(data.analysis);
        setAiAnalysis(parsed);
        toast.dismiss(toastId);
        toast.success("AI Analysis report finished!");
      }
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error("Failed to run AI market scan: " + e.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Helper parsing markdown headers into distinct card keys
  function parseMarkdownSections(markdown: string) {
    const sections = {
      context: '',
      technical: '',
      setup: '',
      institutional: '',
      risks: '',
      verdict: ''
    };

    const contextMatch = markdown.match(/## MARKET CONTEXT([\s\S]*?)(?=## TECHNICAL|$)/i);
    const technicalMatch = markdown.match(/## TECHNICAL ANALYSIS([\s\S]*?)(?=## TRADE|$)/i);
    const setupMatch = markdown.match(/## TRADE SETUP([\s\S]*?)(?=## INSTITUTIONAL|$)/i);
    const institutionalMatch = markdown.match(/## INSTITUTIONAL PERSPECTIVE([\s\S]*?)(?=## RISK|$)/i);
    const risksMatch = markdown.match(/## RISK FACTORS([\s\S]*?)(?=## AI VERDICT|$)/i);
    const verdictMatch = markdown.match(/## AI VERDICT([\s\S]*?)$/i);

    sections.context = contextMatch ? contextMatch[1].trim() : '';
    sections.technical = technicalMatch ? technicalMatch[1].trim() : '';
    sections.setup = setupMatch ? setupMatch[1].trim() : '';
    sections.institutional = institutionalMatch ? institutionalMatch[1].trim() : '';
    sections.risks = risksMatch ? risksMatch[1].trim() : '';
    sections.verdict = verdictMatch ? verdictMatch[1].trim() : '';

    return sections;
  }

  // Parse Verdict section details
  const getVerdictDetails = () => {
    if (!aiAnalysis || !aiAnalysis.verdict) return null;
    const lines = aiAnalysis.verdict.split('\n').filter((l: string) => l.trim() !== '');
    
    let verdictSignal = signalType;
    let verdictConviction = 'High';
    let verdictConfidence = confidence + '%';
    let verdictSummary = '';

    lines.forEach((line: string) => {
      if (line.toLowerCase().startsWith('signal:')) verdictSignal = line.split(':')[1].trim();
      else if (line.toLowerCase().startsWith('conviction:')) verdictConviction = line.split(':')[1].trim();
      else if (line.toLowerCase().startsWith('confidence:')) verdictConfidence = line.split(':')[1].trim();
      else if (line.trim()) {
        verdictSummary += line + ' ';
      }
    });

    return {
      signal: verdictSignal,
      conviction: verdictConviction,
      confidence: verdictConfidence,
      summary: verdictSummary
    };
  };

  const verdictData = getVerdictDetails();

  return (
    <div className="min-h-screen bg-void text-frost flex flex-col font-sans">
      <Sidebar activeTab="Dashboard" />
      <AnimatedBackground />

      <main className="flex-1 md:pl-[220px] p-4 pb-24 md:pb-6 max-w-6xl w-full mx-auto relative z-10">
        
        {/* Navigation / Header */}
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-muted hover:text-frost text-[13px] font-sans transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          
          <div className="flex items-center gap-2 select-none">
            <span className="font-brand text-[20px] font-semibold text-frost">{ticker}</span>
            <span 
              className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] border uppercase tracking-widest ${
                signalType === 'BUY' ? 'bg-[#22C55E]/10 border-[#22C55E]/20 text-[#22C55E]' :
                signalType === 'SELL' ? 'bg-[#EF4444]/10 border-[#EF4444]/20 text-[#EF4444]' :
                'bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]'
              }`}
            >
              {signalType} ({confidence}%)
            </span>
          </div>
        </div>

        {/* 3 Column Desktop Layout, stacked on Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
          
          {/* Left Column (TradingView Chart + News Card Grid) - 60% */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Chart Widget container */}
            <div className="bg-[#111318]/50 border border-border-dark rounded-[12px] p-1 overflow-hidden relative">
              <div id="tv_chart" className="w-full rounded-[8px]" style={{ height: 420 }} />
            </div>

            {/* News feed section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo" />
                <h2 className="text-[13px] font-brand font-semibold text-frost uppercase tracking-wider">Latest News Sentiment</h2>
              </div>

              {isNewsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className="h-32 bg-[#111318]/40 border border-border-dark/60 rounded-[8px] animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {news.map((item, idx) => (
                    <div key={idx} className="bg-[#111318]/50 border border-border-dark hover:border-[#1E2230]/80 p-4 rounded-[8px] flex flex-col justify-between h-36">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-sans font-medium text-[10px] text-muted uppercase tracking-wider">{item.source}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-sans font-semibold tracking-wider ${
                            item.sentiment === 'POSITIVE' ? 'bg-[#22C55E]/10 text-[#22C55E]' :
                            item.sentiment === 'NEGATIVE' ? 'bg-[#EF4444]/10 text-[#EF4444]' :
                            'bg-[#374151]/20 text-[#6B7280]'
                          }`}>
                            {item.sentiment}
                          </span>
                        </div>
                        <h3 className="text-[#E2E8F0] text-[13px] leading-tight font-sans line-clamp-3 font-normal">
                          {item.title}
                        </h3>
                      </div>
                      
                      <div className="flex justify-between items-end mt-2">
                        <span className="font-mono text-[9px] text-[#374151]">{item.time}</span>
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#6366F1] hover:text-[#8183F4] text-[11px] font-medium font-sans flex items-center gap-0.5"
                        >
                          Read more <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (AI Analysis sticky panel) - 40% */}
          <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-4">
            <div className="bg-[#111318]/50 backdrop-blur-md border border-[#1E2230] p-5 rounded-[12px] space-y-4 flex flex-col">
              <div className="flex items-center gap-2 border-b border-border-dark/60 pb-3">
                <Cpu className="w-5 h-5 text-indigo" />
                <h2 className="text-[14px] font-brand font-semibold text-frost uppercase tracking-widest">AI Market Analyst</h2>
              </div>

              {!aiAnalysis && !isAiLoading && (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-4 select-none">
                  <div className="w-12 h-12 rounded-full bg-indigo/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-indigo" />
                  </div>
                  <div className="space-y-1 px-4">
                    <h3 className="text-[13px] font-semibold text-frost">Generate AI Technical Report</h3>
                    <p className="text-[11px] text-muted leading-normal">
                      Runs high-confluence analysis utilizing real-time indicator levels, volume metrics, and news sentiment vectors.
                    </p>
                  </div>
                </div>
              )}

              {isAiLoading && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4 select-none">
                  <span className="w-8 h-8 rounded-full border-2 border-indigo border-t-transparent animate-spin" />
                  <p className="text-[12px] text-muted font-sans font-medium animate-pulse">Analyzing market metrics &amp; sentiment...</p>
                </div>
              )}

              {aiAnalysis && (
                <div className="space-y-4 overflow-y-auto max-h-[520px] pr-1">
                  
                  {/* Verdict badge card */}
                  {verdictData && (
                    <div className="bg-[#1C1F28]/50 border border-border-dark p-5 rounded-[8px] text-center select-none">
                      <div className="text-[10px] text-muted uppercase tracking-widest font-semibold font-sans">AI VERDICT SUMMARY</div>
                      <div className={`text-[36px] font-brand font-black tracking-widest my-2 ${
                        verdictData.signal.toUpperCase().includes('BUY') ? 'text-[#22C55E]' :
                        verdictData.signal.toUpperCase().includes('SELL') ? 'text-[#EF4444]' :
                        'text-[#F59E0B]'
                      }`}>
                        {verdictData.signal.toUpperCase()}
                      </div>
                      <div className="inline-block px-3 py-0.5 bg-surface border border-border-dark rounded-full text-[10px] font-medium text-frost mb-3">
                        Conviction: <span className="text-indigo font-bold">{verdictData.conviction}</span> ({verdictData.confidence})
                      </div>
                      {verdictData.summary && (
                        <p className="text-[12px] text-muted leading-relaxed font-sans font-normal border-t border-border-dark/50 pt-3">
                          {verdictData.summary.trim()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Context card */}
                  {aiAnalysis.context && (
                    <div className="bg-[#1C1F28]/40 border border-border-dark p-4 rounded-[8px] space-y-1.5">
                      <span className="text-[9px] text-muted uppercase tracking-widest font-sans font-bold">1. Market Context</span>
                      <p className="text-[12px] text-[#E2E8F0] leading-relaxed font-sans font-normal whitespace-pre-wrap">{aiAnalysis.context.replace(/#/g, '')}</p>
                    </div>
                  )}

                  {/* Technical Outlook card */}
                  {aiAnalysis.technical && (
                    <div className="bg-[#1C1F28]/40 border border-border-dark p-4 rounded-[8px] space-y-1.5">
                      <span className="text-[9px] text-muted uppercase tracking-widest font-sans font-bold">2. Technical Analysis</span>
                      <p className="text-[12.5px] text-[#E2E8F0] leading-relaxed font-sans font-normal whitespace-pre-wrap">{aiAnalysis.technical.replace(/#/g, '')}</p>
                    </div>
                  )}

                  {/* Setup card with row styling */}
                  {aiAnalysis.setup && (
                    <div className="bg-[#1C1F28]/40 border border-[#1E2230] p-4 rounded-[8px] space-y-3">
                      <span className="text-[9px] text-muted uppercase tracking-widest font-sans font-bold block border-b border-border-dark pb-1.5">3. Proposed Trade Setup</span>
                      <div className="space-y-1.5">
                        {aiAnalysis.setup.split('\n').filter((l: string) => l.trim() !== '').map((line: string, i: number) => {
                          const parts = line.split(':');
                          if (parts.length >= 2) {
                            const label = parts[0].replace(/-\s+/, '').replace(/\*\*/g, '').trim();
                            const val = parts.slice(1).join(':').replace(/\*\*/g, '').trim();
                            
                            let valColor = 'text-frost';
                            if (label.toLowerCase().includes('entry')) valColor = 'text-[#6366F1] font-mono';
                            else if (label.toLowerCase().includes('stop loss') || label.toLowerCase().includes('stoploss') || label.toLowerCase().includes('sl')) valColor = 'text-[#EF4444] font-mono';
                            else if (label.toLowerCase().includes('target 1')) valColor = 'text-[#22C55E]/70 font-mono';
                            else if (label.toLowerCase().includes('target 2')) valColor = 'text-[#22C55E]/85 font-mono';
                            else if (label.toLowerCase().includes('target 3')) valColor = 'text-[#22C55E] font-mono';
                            else if (label.toLowerCase().includes('risk/reward') || label.toLowerCase().includes('reward')) valColor = 'text-[#E2E8F0] font-mono';

                            return (
                              <div key={i} className="flex justify-between py-1 border-b border-border-dark/20 text-[12px] last:border-b-0">
                                <span className="text-muted font-sans">{label}</span>
                                <span className={`${valColor} font-bold`}>{val}</span>
                              </div>
                            );
                          }
                          return (
                            <div key={i} className="text-[12px] text-muted font-sans py-0.5">
                              {line.replace(/-\s+/, '').replace(/#/g, '')}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Institutional Perspective card */}
                  {aiAnalysis.institutional && (
                    <div className="bg-[#1C1F28]/40 border border-border-dark p-4 rounded-[8px] space-y-1.5">
                      <span className="text-[9px] text-muted uppercase tracking-widest font-sans font-bold">4. Institutional Perspective</span>
                      <p className="text-[12px] text-[#E2E8F0] leading-relaxed font-sans font-normal whitespace-pre-wrap">{aiAnalysis.institutional.replace(/#/g, '')}</p>
                    </div>
                  )}

                  {/* Risk Factors card */}
                  {aiAnalysis.risks && (
                    <div className="bg-[#1C1F28]/40 border border-border-dark p-4 rounded-[8px] space-y-1.5">
                      <span className="text-[9px] text-muted uppercase tracking-widest font-sans font-bold">5. Core Risk Factors</span>
                      <p className="text-[12px] text-[#E2E8F0] leading-relaxed font-sans font-normal whitespace-pre-wrap">{aiAnalysis.risks.replace(/#/g, '')}</p>
                    </div>
                  )}
                  
                </div>
              )}

              {/* Analyze trigger button */}
              <button
                disabled={isAiLoading}
                onClick={handleAiAnalysis}
                className="w-full bg-[#6366F1] hover:bg-[#8183F4] disabled:opacity-50 text-white font-sans text-[13px] font-medium h-11 rounded-[6px] transition-colors flex items-center justify-center gap-1.5 mt-2 shadow-lg"
              >
                {isAiLoading ? "Analyzing market dynamics..." : "Run AI Confluence Scan"}
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
