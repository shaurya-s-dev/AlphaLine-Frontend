import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker') || 'RELIANCE.NS';
    const company = searchParams.get('company') || 'Reliance';

    const cleanTicker = ticker.replace('.NS', '').replace('.BO', '').toUpperCase();
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';

    let newsItems: any[] = [];
    let isMock = false;

    try {
      const avUrl = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${cleanTicker}&apikey=${apiKey}`;
      const res = await fetch(avUrl);
      if (!res.ok) throw new Error("Alpha Vantage API failed");
      const data = await res.json();
      
      if (data.feed && data.feed.length > 0) {
        // Map Alpha Vantage Feed to our structured format
        newsItems = data.feed.slice(0, 4).map((item: any) => {
          // Sentiment scoring
          const score = item.overall_sentiment_score || 0;
          let sentiment = 'NEUTRAL';
          if (score > 0.15) sentiment = 'POSITIVE';
          else if (score < -0.15) sentiment = 'NEGATIVE';

          return {
            source: item.source || 'AV Feed',
            title: item.title,
            time: item.time_published ? formatAvTime(item.time_published) : 'Just now',
            sentiment,
            url: item.url || 'https://alphavantage.co'
          };
        });
      } else {
        throw new Error("No news feed returned");
      }
    } catch (e) {
      console.warn("Alpha Vantage fetch failed or rate-limited. Serving realistic mock news.");
      isMock = true;
      newsItems = [
        {
          source: "Bloomberg News",
          title: `${cleanTicker} growth momentum accelerates following bullish chart breakout`,
          time: "2 hours ago",
          sentiment: "POSITIVE",
          url: "https://bloomberg.com"
        },
        {
          source: "Reuters",
          title: `Institutional accumulation propels ${cleanTicker} share volumes to monthly highs`,
          time: "5 hours ago",
          sentiment: "POSITIVE",
          url: "https://reuters.com"
        },
        {
          source: "MarketWatch",
          title: `Analysts debate valuation bounds on ${cleanTicker} amid near-term macroeconomic pivots`,
          time: "12 hours ago",
          sentiment: "NEUTRAL",
          url: "https://marketwatch.com"
        },
        {
          source: "Financial Times",
          title: `Supply chain delays and inflation headwind warnings highlighted in sector reports for ${cleanTicker}`,
          time: "1 day ago",
          sentiment: "NEGATIVE",
          url: "https://ft.com"
        }
      ];
    }

    return NextResponse.json({ success: true, news: newsItems, demoMode: isMock });
  } catch (error: any) {
    console.error("News API Route Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load news" },
      { status: 500 }
    );
  }
}

// Helper to format AV time strings e.g. 20260627T120000 -> 2 hours ago
function formatAvTime(avTimeStr: string): string {
  try {
    const year = parseInt(avTimeStr.substring(0, 4), 10);
    const month = parseInt(avTimeStr.substring(4, 6), 10) - 1;
    const day = parseInt(avTimeStr.substring(6, 8), 10);
    const hour = parseInt(avTimeStr.substring(9, 11), 10);
    const minute = parseInt(avTimeStr.substring(11, 13), 10);

    const date = new Date(Date.UTC(year, month, day, hour, minute));
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (e) {
    return "Just now";
  }
}
