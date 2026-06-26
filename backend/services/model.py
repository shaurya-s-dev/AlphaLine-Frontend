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
    is_buy = rsi < 55 and volume_delta > 1.1 and momentum > -0.01
    is_sell = rsi > 55 and volume_delta > 1.1 and momentum < 0.01
    
    if is_buy:
        signal_type = "BUY"
        confidence = int(min(95, 50 + (55 - rsi) * 1.5 + (volume_delta - 1) * 20 + momentum * 100))
        entry = current_price
        stop_loss = entry * 0.98
        target = entry * 1.04
        
    elif is_sell:
        signal_type = "SELL"
        confidence = int(min(95, 50 + (rsi - 55) * 1.5 + (volume_delta - 1) * 20 + abs(momentum) * 100))
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
