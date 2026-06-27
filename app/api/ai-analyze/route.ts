import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { ticker, currentPrice, signalType, confidence, rsi, volume, news } = await req.json();

    const systemPrompt = `You are an expert stock market analyst with deep knowledge of technical analysis, fundamental analysis, and market psychology. You analyze stocks for Indian (NSE/BSE) and US markets. Always provide specific, actionable insights with exact price levels. Format your response in clear sections.`;

    const userPrompt = `Analyze ${ticker} currently trading at ${currentPrice}.
Current AI signal: ${signalType} with ${confidence}% confidence.
RSI: ${rsi || 'N/A'}, Volume spike: ${volume || 'N/A'}.
Recent news sentiment: ${news || 'N/A'}

Provide:
1. MARKET CONTEXT (2-3 sentences)
2. TECHNICAL OUTLOOK (RSI, trend, momentum)  
3. TRADE SETUP:
   - Entry zone: specific price range
   - Stop loss: specific price with reason
   - Target 1: conservative target
   - Target 2: aggressive target
   - Risk/Reward ratio
4. RISK FACTORS (2-3 bullet points)
5. VERDICT: BUY / SELL / HOLD with conviction level (High/Medium/Low)

Be specific with prices. Be concise.`;

    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
      console.warn("GROQ_API_KEY not set. Falling back to Demo/Mock analysis.");
      const mockAnalysis = `### 1. MARKET CONTEXT
${ticker} is currently displaying consolidation characteristics. The market exhibits steady accumulation patterns in the current zone, backed by strong sector performance.

### 2. TECHNICAL OUTLOOK
- **RSI**: Standing at ${rsi || '54'}, representing a balanced momentum profile.
- **Trend**: Constructive continuation patterns above the 50-day moving average.
- **Momentum**: Exhibiting slight bullish divergence on key daily pivots.

### 3. TRADE SETUP
- **Entry zone**: $${(currentPrice * 0.995).toFixed(2)} - $${(currentPrice * 1.005).toFixed(2)}
- **Stop loss**: $${(currentPrice * 0.975).toFixed(2)} (placed below key swing support levels)
- **Target 1**: $${(currentPrice * 1.035).toFixed(2)} (conservative key resistance target)
- **Target 2**: $${(currentPrice * 1.075).toFixed(2)} (extended range continuation)
- **Risk/Reward ratio**: 1:2.4

### 4. RISK FACTORS
- Near-term earnings announcement could inject unexpected volatility.
- Broader index benchmark consolidation pressure.

### 5. VERDICT
**${signalType}** with **Medium** conviction level.`;

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
