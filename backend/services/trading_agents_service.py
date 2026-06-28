"""
TradingAgents integration for deep ticker analysis.
Called on-demand per ticker from /api/analyze/{ticker}
"""
import os
from datetime import datetime, timedelta
from tradingagents.graph.trading_graph import TradingAgentsGraph
from tradingagents.default_config import DEFAULT_CONFIG

def get_analysis_date() -> str:
    """Use last weekday as analysis date."""
    today = datetime.now()
    if today.weekday() == 5:   # Saturday
        d = today - timedelta(days=1)
    elif today.weekday() == 6: # Sunday
        d = today - timedelta(days=2)
    else:
        d = today
    return d.strftime("%Y-%m-%d")

def ticker_for_ta(ticker: str) -> str:
    """
    TradingAgents uses plain symbols — strip exchange suffix.
    RELIANCE.NS → RELIANCE
    AAPL       → AAPL
    """
    return ticker.split('.')[0]

async def run_trading_agents_analysis(
    ticker: str,
    signal: str,
    confidence: int,
) -> dict:
    """
    Run the full TradingAgents multi-agent pipeline
    for a single ticker. Returns structured analysis.
    
    Agents that run:
    1. Technical Analyst  (RSI, MACD, Bollinger Bands)
    2. Sentiment Analyst  (news sentiment, social)
    3. Fundamentals Analyst (financials, ratios)
    4. News Analyst       (macro, sector news)
    5. Bull/Bear Researchers (debate the trade)
    6. Risk Manager       (position sizing, stop levels)
    7. Trader             (final BUY/SELL/HOLD + reasoning)
    """
    config = DEFAULT_CONFIG.copy()
    config.update({
        # Use Groq (fast + free) for most agents
        "llm_provider": "openrouter",
        "backend_url": "https://openrouter.ai/api/v1",
        "deep_think_llm": "anthropic/claude-sonnet-4-6",
        "quick_think_llm": "meta-llama/llama-3.1-8b-instruct:free",
        "max_debate_rounds": 1,      # keep fast
        "online_tools": True,
        "finnhub_api_key": os.environ.get("FINNHUB_API_KEY", ""),
    })
    
    plain_ticker = ticker_for_ta(ticker)
    analysis_date = get_analysis_date()
    
    try:
        ta = TradingAgentsGraph(
            selected_analysts=["technical", "sentiment", "news"],
            # Skip fundamentals for speed (optional)
            debug=False,
            config=config,
        )
        
        state, decision = ta.propagate(
            plain_ticker, 
            analysis_date
        )
        
        # Extract the final trade decision
        trader_decision = state.get(
            "final_trade_decision", {}
        )
        
        return {
            "success": True,
            "ticker": ticker,
            "ta_signal": trader_decision.get(
                "action", signal
            ).upper(),
            "reasoning": trader_decision.get(
                "reasoning", ""
            ),
            "risk_assessment": state.get(
                "risk_assessment", ""
            ),
            "technical_report": state.get(
                "technical_analyst_report", ""
            ),
            "sentiment_report": state.get(
                "sentiment_analyst_report", ""
            ),
            "news_report": state.get(
                "news_analyst_report", ""
            ),
            "alphaline_signal": signal,
            "alphaline_confidence": confidence,
            "analysis_date": analysis_date,
            "agents_used": [
                "Technical Analyst",
                "Sentiment Analyst", 
                "News Analyst",
                "Bull & Bear Researchers",
                "Risk Manager",
                "Trader",
            ]
        }
        
    except Exception as e:
        print(f"[TradingAgents] Error for {ticker}: {e}")
        return {
            "success": False,
            "error": str(e),
            "ticker": ticker,
            "alphaline_signal": signal,
            "alphaline_confidence": confidence,
        }
