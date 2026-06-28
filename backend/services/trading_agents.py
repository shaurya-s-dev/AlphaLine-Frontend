from tradingagents.graph.trading_graph import TradingAgentsGraph
from tradingagents.default_config import DEFAULT_CONFIG
import os
from datetime import datetime, timedelta

def get_last_trading_day() -> str:
    """Get last weekday in YYYY-MM-DD format."""
    today = datetime.now()
    days_back = 0
    while True:
        check = today - timedelta(days=days_back)
        if check.weekday() < 5:  # Mon-Fri
            return check.strftime('%Y-%m-%d')
        days_back += 1

def run_trading_analysis(ticker: str) -> dict:
    """
    Run full TradingAgents multi-agent analysis.
    Returns structured decision with full reasoning.
    """
    config = DEFAULT_CONFIG.copy()
    
    # Configure provider based on available environment keys
    if os.environ.get("OPENROUTER_API_KEY"):
        config["llm_provider"] = "openrouter"
        config["deep_think_llm"] = "google/gemini-flash-1.5"
        config["quick_think_llm"] = "google/gemini-flash-1.5"
    elif os.environ.get("OPENAI_API_KEY"):
        config["llm_provider"] = "openai"
        config["deep_think_llm"] = "gpt-4o-mini"
        config["quick_think_llm"] = "gpt-4o-mini"
    else:
        # Default fallback to OpenRouter free models
        config["llm_provider"] = "openrouter"
        config["deep_think_llm"] = "meta-llama/llama-3.1-8b-instruct:free"
        config["quick_think_llm"] = "meta-llama/llama-3.1-8b-instruct:free"

    config["max_debate_rounds"] = 1  # keep fast
    config["online_tools"] = True
    
    ta = TradingAgentsGraph(debug=False, config=config)
    analysis_date = get_last_trading_day()
    
    try:
        clean_ticker = ticker.replace('.NS', '').replace('.BO', '')
        state, decision = ta.propagate(clean_ticker, analysis_date)
        
        # Parse decision object to dict if needed
        decision_data = decision
        if not isinstance(decision, dict):
            try:
                decision_data = decision.dict()
            except AttributeError:
                try:
                    decision_data = {
                        "action": getattr(decision, "action", "HOLD"),
                        "quantity": getattr(decision, "quantity", 0),
                        "confidence": getattr(decision, "confidence", "LOW"),
                        "reasoning": getattr(decision, "reasoning", ""),
                        "risk_assessment": getattr(decision, "risk_assessment", ""),
                        "price_target": getattr(decision, "price_target", "")
                    }
                except Exception:
                    decision_data = {"error_serializing": True, "str_value": str(decision)}
                    
        return {
            "success": True,
            "ticker": ticker,
            "analysis_date": analysis_date,
            "decision": decision_data,
            "state": {
                "fundamentals": str(state.get("fundamentals_report", ""))[:500],
                "sentiment": str(state.get("sentiment_report", ""))[:500],
                "news": str(state.get("news_report", ""))[:500],
                "technical": str(state.get("technical_report", ""))[:500],
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "ticker": ticker
        }
