from datetime import datetime, timedelta
import time
import random
from models.signal import Signal

def get_market(ticker: str) -> str:
    """
    Infers the market exchange (NSE, BSE, US) from the ticker format.
    """
    if ticker.endswith(".NS"):
        return "NSE"
    elif ticker.endswith(".BO"):
        return "BSE"
    else:
        return "US"

def generate_signal(ticker: str, features: dict) -> Signal:
    """
    Evaluates rule-based logic to trigger BUY/SELL/HOLD confluence signals.
    """
    rsi = features["rsi"]
    volume_delta = features["volume_delta"]
    momentum = features["momentum"]
    price_position = features["price_position"]
    current_price = features["current_price"]
    
    market = get_market(ticker)
    
    # Calculate a raw score between 0.0 and 1.0 representing bullishness.
    # Center around 0.50 to naturally skew towards HOLD (40%) vs BUY (35%) and SELL (25%).
    base_score = 0.50
    
    # Technical factor adjustments:
    # 1. RSI: lower RSI is bullish. range [15, 85] -> [+0.15, -0.15]
    rsi_factor = (50.0 - rsi) * 0.005
    
    # 2. Momentum: positive is bullish. range [-0.05, 0.05] -> [-0.15, +0.15]
    mom_factor = momentum * 3.0
    mom_factor = max(-0.15, min(0.15, mom_factor))
    
    # 3. Price Position: lower (near 52w low) is bullish. range [0, 1] -> [+0.1, -0.1]
    pos_factor = (0.5 - price_position) * 0.2
    
    # 4. Volume Delta: higher volume amplifies standard variance/score shift
    vol_multiplier = min(1.5, max(0.8, volume_delta))
    
    # 5. Random normal variance to prevent identical scores for different stocks
    # Mean=0, StdDev=0.18
    noise = random.normalvariate(0, 0.18)
    
    raw_score = base_score + rsi_factor + mom_factor + pos_factor + noise
    
    # Apply volume scaling to push scores further away from center if high volume
    if raw_score > 0.5:
        raw_score = 0.5 + (raw_score - 0.5) * vol_multiplier
    else:
        raw_score = 0.5 - (0.5 - raw_score) * vol_multiplier
        
    # Clamp score
    raw_score = max(0.01, min(0.99, raw_score))
    
    # Thresholds:
    # score > 0.62 -> BUY (~35%)
    # score < 0.38 -> SELL (~25%)
    # else -> HOLD (~40%)
    if raw_score > 0.62:
        signal_type = "BUY"
        # Map score [0.62, 0.99] to confidence percentage [76, 95]
        confidence = int(75 + ((raw_score - 0.62) / 0.37) * 20)
    elif raw_score < 0.38:
        signal_type = "SELL"
        # Map score [0.01, 0.38] to confidence percentage [51, 85] (lower score = stronger SELL)
        confidence = int(50 + ((0.38 - raw_score) / 0.37) * 35)
    else:
        signal_type = "HOLD"
        # Map score [0.38, 0.62] to confidence percentage [51, 75]
        confidence = int(50 + (abs(raw_score - 0.50) / 0.12) * 25)
        
    confidence = max(51, min(95, confidence))
    
    # Levels calculation
    if signal_type == "BUY":
        entry = current_price
        stop_loss = entry * 0.98
        target = entry * 1.04
    elif signal_type == "SELL":
        entry = current_price
        stop_loss = entry * 1.02
        target = entry * 0.96
    else:
        entry = current_price
        stop_loss = entry * 0.99
        target = entry * 1.01

    # Round results to 2 decimal places
    entry = round(entry, 2)
    stop_loss = round(stop_loss, 2)
    target = round(target, 2)
    
    # Calculate Risk-Reward Ratio
    risk = abs(entry - stop_loss)
    reward = abs(target - entry)
    risk_reward = round(reward / risk, 2) if risk > 0 else 0.0
    
    # Create timestamps (24h TTL)
    created_at = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    ttl = int(time.time() + 86400)
    
    return Signal(
        ticker=ticker,
        market=market,
        signal_type=signal_type,
        confidence_score=confidence,
        entry_price=entry,
        stop_loss=stop_loss,
        target_price=target,
        risk_reward=risk_reward,
        ttl=ttl,
        created_at=created_at
    )
