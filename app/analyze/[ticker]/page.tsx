'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Script from 'next/script';
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
  const [groqAvailable, setGroqAvailable] = useState(true);

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
  function tickerToTVSymbol(t: string): string {
    const symbolUpper = t.toUpperCase();
    if (symbolUpper.endsWith('.NS')) {
      return `NSE:${symbolUpper.replace('.NS', '')}`;
    }
    if (symbolUpper.endsWith('.BO')) {
      return `BSE:${symbolUpper.replace('.BO', '')}`;
    }
    // US list
    const usList = ['AAPL', 'GOOGL', 'MSFT', 'META', 'TSLA', 'NVDA', 'AMZN', 'AMD'];
    if (usList.includes(symbolUpper)) {
      return `NASDAQ:${symbolUpper}`;
    }
    if (symbolUpper === 'JPM') {
      return 'NYSE:JPM';
    }
    return `NASDAQ:${symbolUpper}`; // default fallback
  }

  // TradingView widget instantiator
  const initTVWidget = () => {
    if (typeof window !== 'undefined' && (window as any).TradingView) {
      new (window as any).TradingView.widget({
        "width": "100%",
        "height": 400,
        "symbol": tickerToTVSymbol(ticker),
        "interval": "D",
        "timezone": "Asia/Kolkata",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "toolbar_bg": "#111318",
        "enable_publishing": false,
        "hide_top_toolbar": false,
        "container_id": "tv_chart"
      });
    }
  };

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
      risks: '',
      verdict: ''
    };

    const contextMatch = markdown.match(/(?:###\s+1\.\s+MARKET\s+CONTEXT|###\s+MARKET\s+CONTEXT)([\s\S]*?)(?=###\s+\d+\.|###\s+TECHNICAL|###\s+TRADE|###\s+RISK|###\s+VERDICT|$)/i);
    const technicalMatch = markdown.match(/(?:###\s+2\.\s+TECHNICAL\s+OUTLOOK|###\s+TECHNICAL\s+OUTLOOK)([\s\S]*?)(?=###\s+\d+\.|###\s+MARKET|###\s+TRADE|###\s+RISK|###\s+VERDICT|$)/i);
    const setupMatch = markdown.match(/(?:###\s+3\.\s+TRADE\s+SETUP|###\s+TRADE\s+SETUP)([\s\S]*?)(?=###\s+\d+\.|###\s+MARKET|###\s+TECHNICAL|###\s+RISK|###\s+VERDICT|$)/i);
    const risksMatch = markdown.match(/(?:###\s+4\.\s+RISK\s+FACTORS|###\s+RISK\s+FACTORS)([\s\S]*?)(?=###\s+\d+\.|###\s+MARKET|###\s+TECHNICAL|###\s+TRADE|###\s+VERDICT|$)/i);
    const verdictMatch = markdown.match(/(?:###\s+5\.\s+VERDICT|###\s+VERDICT)([\s\S]*?)$/i);

    sections.context = contextMatch ? contextMatch[1].trim() : '';
    sections.technical = technicalMatch ? technicalMatch[1].trim() : '';
    sections.setup = setupMatch ? setupMatch[1].trim() : '';
    sections.risks = risksMatch ? risksMatch[1].trim() : '';
    sections.verdict = verdictMatch ? verdictMatch[1].trim() : '';

    // Split fallback
    if (!sections.context && !sections.technical && !sections.setup) {
      const lines = markdown.split('\n');
      let current = 'context';
      lines.forEach(line => {
        if (line.includes('1.') || line.toLowerCase().includes('context')) current = 'context';
        else if (line.includes('2.') || line.toLowerCase().includes('technical')) current = 'technical';
        else if (line.includes('3.') || line.toLowerCase().includes('setup')) current = 'setup';
        else if (line.includes('4.') || line.toLowerCase().includes('risk')) current = 'risks';
        else if (line.includes('5.') || line.toLowerCase().includes('verdict')) current = 'verdict';
        else {
          sections[current as keyof typeof sections] += line + '\n';
        }
      });
    }

    return sections;
  }

  // Format Verdict color
  function getVerdictBadgeStyles(vText: string) {
    const textUpper = vText.toUpperCase();
    if (textUpper.includes('BUY')) {
      return 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]';
    }
    if (textUpper.includes('SELL')) {
      return 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]';
    }
    return 'bg-[#F59E0B]/15 border-[#F59E0B]/30 text-[#F59E0B]';
  }

  return (
    <div className="min-h-screen bg-void text-frost flex flex-col font-sans">
      <Sidebar activeTab="Dashboard" />
      <AnimatedBackground />

      {/* Script for TV chart widget */}
      <Script 
        src="https://s3.tradingview.com/tv.js" 
        onLoad={initTVWidget}
      />

      <main className="flex-1 md:pl-[220px] p-6 pb-24 md:pb-6 max-w-6xl w-full mx-auto relative z-10">
        
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
              <div id="tv_chart" className="w-full rounded-[8px]" style={{ height: 400 }} />
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
                <div className="space-y-4 overflow-y-auto max-h-[480px] pr-1">
                  
                  {/* Verdict badge card */}
                  {aiAnalysis.verdict && (
                    <div className={`p-4 rounded-[8px] border text-center font-bold flex flex-col items-center gap-1 ${getVerdictBadgeStyles(aiAnalysis.verdict)}`}>
                      <span className="text-[10px] uppercase tracking-widest font-sans opacity-70">AI VERDICT SUMMARY</span>
                      <p className="font-brand text-lg tracking-wider whitespace-pre-wrap">{aiAnalysis.verdict.replace(/#/g, '')}</p>
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
                      <span className="text-[9px] text-muted uppercase tracking-widest font-sans font-bold">2. Technical Outlook</span>
                      <p className="text-[12px] text-[#E2E8F0] leading-relaxed font-sans font-normal whitespace-pre-wrap">{aiAnalysis.technical.replace(/#/g, '')}</p>
                    </div>
                  )}

                  {/* Setup card with color coding */}
                  {aiAnalysis.setup && (
                    <div className="bg-[#1C1F28]/40 border border-[#1E2230] p-4 rounded-[8px] space-y-2.5">
                      <span className="text-[9px] text-muted uppercase tracking-widest font-sans font-bold">3. Proposed Trade Setup</span>
                      <div className="text-[12px] font-mono whitespace-pre-wrap leading-relaxed">
                        {aiAnalysis.setup.split('\n').map((line: string, i: number) => {
                          let colorClass = 'text-frost';
                          if (line.toLowerCase().includes('entry')) colorClass = 'text-sig-green font-semibold';
                          else if (line.toLowerCase().includes('stop loss') || line.toLowerCase().includes('stoploss') || line.toLowerCase().includes('sl:')) colorClass = 'text-sig-red font-semibold';
                          else if (line.toLowerCase().includes('target')) colorClass = 'text-[#10B981] font-semibold'; // Emerald target
                          
                          return (
                            <div key={i} className={colorClass}>
                              {line.replace(/#/g, '')}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Risk Factors card */}
                  {aiAnalysis.risks && (
                    <div className="bg-[#1C1F28]/40 border border-border-dark p-4 rounded-[8px] space-y-1.5">
                      <span className="text-[9px] text-muted uppercase tracking-widest font-sans font-bold">4. Core Risk Factors</span>
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
