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
    
    atr = features.get("atr", 0.02 * current_price)
    macd = features.get("macd", 0.0)
    macd_signal = features.get("macd_signal", 0.0)
    macd_diff = features.get("macd_diff", 0.0)
    bb_high = features.get("bb_high", current_price * 1.05)
    bb_low = features.get("bb_low", current_price * 0.95)
    bb_mid = features.get("bb_mid", current_price)
    ema_9 = features.get("ema_9", current_price)
    ema_21 = features.get("ema_21", current_price)
    
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
    
    # 4. Bollinger Bands factor: lower BB position is bullish. range [0, 1] -> [+0.08, -0.08]
    bb_range = (bb_high - bb_low) if (bb_high > bb_low) else 1.0
    bb_position = (current_price - bb_low) / bb_range
    bb_factor = (0.5 - bb_position) * 0.16
    
    # 5. EMA Crossover factor: EMA 9 > EMA 21 (golden cross) is bullish. [+0.08, -0.08]
    ema_factor = 0.08 if (ema_9 > ema_21) else -0.08
    
    # 6. MACD factor: MACD > signal or MACD diff > 0 is bullish. [+0.05, -0.05]
    macd_factor = 0.05 if (macd > macd_signal or macd_diff > 0) else -0.05
    
    # 7. Volume Delta: higher volume amplifies standard variance/score shift
    vol_multiplier = min(1.5, max(0.8, volume_delta))
    
    # 8. Random normal variance to prevent identical scores for different stocks
    # Mean=0, StdDev=0.15
    noise = random.normalvariate(0, 0.15)
    
    raw_score = base_score + rsi_factor + mom_factor + pos_factor + bb_factor + ema_factor + macd_factor + noise
    
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
    
    # Levels calculation using ATR-based dynamic bounds
    if signal_type == "BUY":
        entry = current_price
        stop_loss = max(0.01, entry - 2.0 * atr)
        target = max(0.01, entry + 4.0 * atr)
    elif signal_type == "SELL":
        entry = current_price
        stop_loss = max(0.01, entry + 2.0 * atr)
        target = max(0.01, entry - 4.0 * atr)
    else:
        entry = current_price
        stop_loss = max(0.01, entry - 1.0 * atr)
        target = max(0.01, entry + 1.5 * atr)

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
