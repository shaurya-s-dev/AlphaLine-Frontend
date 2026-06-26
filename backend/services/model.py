from datetime import datetime, timedelta
import time
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
    current_price = features["current_price"]
    
    market = get_market(ticker)
    
    # Evaluate Rules
    is_buy = rsi < 45 and volume_delta > 1.3 and momentum > 0
    is_sell = rsi > 65 and volume_delta > 1.2 and momentum < 0
    
    if is_buy:
        signal_type = "BUY"
        # Scale confidence (50 to 95) based on oversold strength and volume spikes
        rsi_strength = max(0.0, (45.0 - rsi) * 1.5)
        vol_strength = max(0.0, (volume_delta - 1.3) * 15.0)
        confidence = int(50 + min(45, rsi_strength + vol_strength))
        
        entry = current_price
        stop_loss = entry * 0.98
        target = entry * 1.04
        
    elif is_sell:
        signal_type = "SELL"
        # Scale confidence (50 to 95) based on overbought strength and volume spikes
        rsi_strength = max(0.0, (rsi - 65.0) * 1.5)
        vol_strength = max(0.0, (volume_delta - 1.2) * 15.0)
        confidence = int(50 + min(45, rsi_strength + vol_strength))
        
        entry = current_price
        stop_loss = entry * 1.02
        target = entry * 0.96
        
    else:
        signal_type = "HOLD"
        confidence = 50
        
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
