import os
import json
from groq import Groq

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
MODEL = "llama-3.1-8b-instant"


def run_technical_agent(
    ticker: str,
    signal: str,
    confidence: int,
    features: dict,
    current_price: float,
) -> str:
    prompt = f"""
You are a Technical Analyst at an algorithmic trading firm.

TICKER: {ticker}
CURRENT PRICE: {current_price}
AI SIGNAL: {signal} ({confidence}% confidence)
RSI: {features.get('rsi', 'N/A')}
VOLUME DELTA: {features.get('volume_delta', 'N/A')}  
MOMENTUM: {features.get('momentum', 'N/A')}
BB POSITION: {features.get('bb_position', 'N/A')}
MACD SIGNAL: {features.get('macd_signal', 'N/A')}
ATR: {features.get('atr', 'N/A')}

Provide a technical analysis in this exact format:

TREND: [Uptrend/Downtrend/Sideways + 1 sentence reason]
RSI READING: [value interpretation — overbought/oversold/neutral]
VOLUME: [what volume delta says about conviction]
SUPPORT LEVELS: [2 specific price levels below current]
RESISTANCE LEVELS: [2 specific price levels above current]
MOMENTUM: [strong/weak/building/fading + reason]
TECHNICAL VERDICT: [BUY/SELL/HOLD] — [1 sentence reason]

Be specific with price levels. No disclaimers.
"""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content":
             "You are an elite technical analyst. "
             "Give precise, actionable analysis. "
             "Always include specific price levels."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=400,
        temperature=0.3,
    )
    return response.choices[0].message.content


def run_sentiment_agent(
    ticker: str,
    market: str,
    signal: str,
) -> str:
    market_context = {
        "NSE": "Indian equity market (NSE). Consider FII/DII flows, RBI policy, Indian macro.",
        "BSE": "Indian equity market (BSE). Consider FII/DII flows, RBI policy, Indian macro.",
        "US": "US equity market. Consider Fed policy, earnings, sector rotation, macro trends."
    }.get(market, "global equity market")

    prompt = f"""
You are a Sentiment & News Analyst at a trading firm.

TICKER: {ticker}
MARKET: {market_context}
CURRENT AI SIGNAL: {signal}

Analyze market sentiment for this ticker:

SECTOR SENTIMENT: [Bullish/Bearish/Neutral — 1 sentence]
MACRO ENVIRONMENT: [1 sentence on current macro tailwinds or headwinds]
INSTITUTIONAL ACTIVITY: [what smart money is likely doing — 1 sentence]
NEWS RISK: [Low/Medium/High — any upcoming events that could impact price]
SOCIAL SENTIMENT: [Retail trader mood based on typical patterns for this stock]
SENTIMENT VERDICT: [Supports BUY / Supports SELL / Neutral]

Be direct and specific. No disclaimers.
"""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content":
             "You are an expert market sentiment analyst "
             "specializing in both Indian and US equity markets. "
             "Be specific and direct."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=350,
        temperature=0.4,
    )
    return response.choices[0].message.content


def run_strategist_agent(
    ticker: str,
    current_price: float,
    signal: str,
    confidence: int,
    stop_loss: float,
    target_price: float,
    risk_reward: float,
    technical_report: str,
    sentiment_report: str,
) -> str:
    prompt = f"""
You are the Chief Trading Strategist. Two analysts have reported:

=== TECHNICAL ANALYST REPORT ===
{technical_report}

=== SENTIMENT ANALYST REPORT ===
{sentiment_report}

=== ALPHALINE AI SIGNAL ===
Ticker: {ticker}
Price: {current_price}
Signal: {signal} ({confidence}% confidence)
Stop Loss: {stop_loss}
Target: {target_price}
R/R: {risk_reward}x

Based on ALL the above, provide the final trading strategy:

## FINAL VERDICT
Signal: [BUY/SELL/HOLD]
Conviction: [High/Medium/Low]
Reason: [2 sentences combining technical + sentiment]

## TRADE PLAN
Entry: {current_price}
Stop Loss: {stop_loss} ([calculate %] risk)
Target 1: [conservative — calculate from ATR]
Target 2: {target_price} ([calculate %] gain)
Risk/Reward: {risk_reward}x
Position Size: [% of portfolio — based on conviction]
Hold Period: [Intraday / 2-5 days / 2-4 weeks]

## RISK FACTORS
- [Specific risk with price level that invalidates setup]
- [Macro or sector risk]
- Invalidation: [exact price that kills this trade]

## AGENT CONSENSUS
Technical: [agrees/disagrees with signal + why]
Sentiment: [supports/opposes + why]
Overall: [All agents aligned / Split decision]
"""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content":
             "You are the chief trading strategist with 20 years "
             "of experience in global equity markets. "
             "Synthesize analyst reports into decisive trade plans. "
             "Be specific with numbers. No disclaimers."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=500,
        temperature=0.2,
    )
    return response.choices[0].message.content


async def run_full_analysis(
    ticker: str,
    market: str,
    signal: str,
    confidence: int,
    current_price: float,
    stop_loss: float,
    target_price: float,
    risk_reward: float,
    features: dict,
) -> dict:
    """
    Runs 3 specialized agents sequentially.
    Agent 3 reads Agent 1 + 2 outputs.
    Total time: ~6-10 seconds on Groq.
    """
    try:
        # Agent 1: Technical
        tech = run_technical_agent(
            ticker, signal, confidence,
            features, current_price
        )

        # Agent 2: Sentiment
        sent = run_sentiment_agent(
            ticker, market, signal
        )

        # Agent 3: Strategist (reads 1+2)
        strategy = run_strategist_agent(
            ticker, current_price, signal,
            confidence, stop_loss, target_price,
            risk_reward, tech, sent
        )

        return {
            "success": True,
            "ticker": ticker,
            "signal": signal,
            "confidence": confidence,
            "agents": {
                "technical": {
                    "name": "Technical Analyst",
                    "report": tech,
                    "icon": "📊"
                },
                "sentiment": {
                    "name": "Sentiment Analyst",
                    "report": sent,
                    "icon": "🧠"
                },
                "strategist": {
                    "name": "Chief Strategist",
                    "report": strategy,
                    "icon": "⚡"
                }
            },
            "agents_used": 3,
            "model": "llama-3.1-8b-instant via Groq"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "ticker": ticker,
            "signal": signal,
            "confidence": confidence,
        }
