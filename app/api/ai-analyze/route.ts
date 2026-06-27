import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { 
      ticker, 
      currentPrice, 
      signalType, 
      confidence, 
      rsi, 
      volume, 
      volumeDelta, 
      momentum, 
      news, 
      newsSentiment 
    } = await req.json();

    const vDelta = volumeDelta || volume || 'N/A';
    const mntm = momentum || 'N/A';
    const nSent = newsSentiment || news || 'Neutral';

    const systemPrompt = `You are ALPHA, an elite quantitative analyst and trading strategist with 20 years of experience in both Indian (NSE/BSE) and US equity markets. You combine technical analysis, fundamental analysis, institutional order flow, and market sentiment to generate precise, actionable trading insights.

You always provide:
- Exact price levels (never ranges like "around X")
- Specific reasoning tied to technical indicators
- Risk-adjusted position sizing
- Multiple time frame analysis
- Institutional perspective on the trade

You speak confidently and directly. No disclaimers. No "this is not financial advice". You are an AI analyst, not a financial advisor.`;

    const userPrompt = `
TICKER: ${ticker}
CURRENT PRICE: ${currentPrice}
AI SIGNAL: ${signalType} (${confidence}% confidence)
RSI: ${rsi || 'N/A'}
VOLUME DELTA: ${vDelta}
MOMENTUM: ${mntm}
RECENT NEWS SENTIMENT: ${nSent}

Provide a COMPLETE TRADING ANALYSIS in this EXACT format (use these exact section headers):

## MARKET CONTEXT
[3 sentences on current market conditions for this stock, sector trends, and macro factors]

## TECHNICAL ANALYSIS
RSI Reading: [value and what it means]
Trend Direction: [Uptrend/Downtrend/Sideways + reason]
Volume Analysis: [what volume says about conviction]
Key Support Levels: [2 specific price levels]
Key Resistance Levels: [2 specific price levels]
Moving Averages: [20/50/200 MA analysis]
Momentum: [MACD, momentum indicator reading]

## TRADE SETUP
Signal: ${signalType}
Entry Price: [exact price]
Stop Loss: [exact price] ([X]% risk)
Target 1: [exact price] ([X]% gain) — Conservative
Target 2: [exact price] ([X]% gain) — Aggressive  
Target 3: [exact price] ([X]% gain) — Extended
Risk/Reward: [ratio]
Position Size: [% of portfolio recommended]
Time Horizon: [Intraday/Swing (2-5 days)/Positional (2-4 weeks)]

## INSTITUTIONAL PERSPECTIVE
[2 sentences on what smart money/FIIs/DIIs might be doing with this stock based on technicals]

## RISK FACTORS
- [Specific risk 1 with price level]
- [Specific risk 2 with price level]  
- [Specific risk 3 — macro/sector risk]
- Invalidation level: [price that kills the setup]

## AI VERDICT
Signal: ${signalType}
Conviction: [High/Medium/Low]
Confidence: ${confidence}%
[2 sentence summary of why this trade makes sense]
`;

    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
      console.warn("GROQ_API_KEY not set. Falling back to Demo/Mock analysis.");
      const mockAnalysis = `## MARKET CONTEXT
${ticker} is experiencing high consolidation near key historical support ranges, aligning with bullish sector tailwinds in global markets. Growth indicators point to a potential breakout as macro liquidity pivots towards large-cap equities. A brief period of volume accumulation suggests a strategic reversal setup.

## TECHNICAL ANALYSIS
RSI Reading: ${rsi || '58'} (indicating solid bullish accumulation with plenty of room before overbought territory)
Trend Direction: Uptrend (trading above the 50-day and 200-day simple moving averages)
Volume Analysis: Buying volume is 18% above 20-day average, signaling strong institutional conviction
Key Support Levels: $${(currentPrice * 0.965).toFixed(2)}, $${(currentPrice * 0.93).toFixed(2)}
Key Resistance Levels: $${(currentPrice * 1.045).toFixed(2)}, $${(currentPrice * 1.09).toFixed(2)}
Moving Averages: 20 MA is slanting upwards and crossing above 50 MA, indicating strong near-term trend momentum
Momentum: MACD histogram is printing positive bars with a bullish signal line crossover

## TRADE SETUP
Signal: ${signalType}
Entry Price: $${currentPrice}
Stop Loss: $${(currentPrice * 0.94).toFixed(2)} (6.00% risk)
Target 1: $${(currentPrice * 1.05).toFixed(2)} (5.00% gain) — Conservative
Target 2: $${(currentPrice * 1.12).toFixed(2)} (12.00% gain) — Aggressive
Target 3: $${(currentPrice * 1.18).toFixed(2)} (18.00% gain) — Extended
Risk/Reward: 2.0
Position Size: 5.0% of portfolio recommended
Time Horizon: Swing (2-5 days)

## INSTITUTIONAL PERSPECTIVE
Smart money and FIIs are actively accumulating shares at the current support band, shown by a rise in block delivery volume. DIIs are holding their positions steady, expecting a breakout above key quarterly resistance.

## RISK FACTORS
- Break below support at $${(currentPrice * 0.94).toFixed(2)} triggers sell-stop orders
- Unexpected macro inflation print leading to market-wide volatility
- Sector correlation weakness drag
- Invalidation level: $${(currentPrice * 0.935).toFixed(2)}

## AI VERDICT
Signal: ${signalType}
Conviction: High
Confidence: ${confidence}%
${ticker} is showcasing solid structural support and strong volume expansion, suggesting a highly favorable risk/reward setup. Backtest trends validate high predictive confidence for an upward continuation.`;

      return NextResponse.json({ success: true, analysis: mockAnalysis, demoMode: true });
    }

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 1024,
          temperature: 0.3,
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "No analysis generated.";

    return NextResponse.json({ success: true, analysis: content });
  } catch (error: any) {
    console.error("AI Analysis Route Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate analysis" },
      { status: 500 }
    );
  }
}
