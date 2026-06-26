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
    
    # BUY conditions (ANY two must be true)
    buy_conds = [
        rsi < 50,
        volume_delta > 1.15,
        momentum > 0.005,
        price_position < 0.4
    ]
    buy_met = sum(1 for c in buy_conds if c)
    is_buy = buy_met >= 2
    
    # SELL conditions (ANY two must be true)
    sell_conds = [
        rsi > 55,
        volume_delta > 1.15,
        momentum < -0.005,
        price_position > 0.7
    ]
    sell_met = sum(1 for c in sell_conds if c)
    is_sell = sell_met >= 2
    
    if is_buy:
        signal_type = "BUY"
        raw_conf = 50 + (buy_met * 12) + max(0.0, (50.0 - rsi) * 0.5) + min(20.0, (volume_delta - 1.0) * 40.0)
        confidence = max(51, min(92, int(raw_conf)))
        entry = current_price
        stop_loss = entry * 0.98
        target = entry * 1.04
        
    elif is_sell:
        signal_type = "SELL"
        raw_conf = 50 + (sell_met * 12) + max(0.0, (rsi - 50.0) * 0.5) + min(20.0, (volume_delta - 1.0) * 40.0)
        confidence = max(51, min(92, int(raw_conf)))
        entry = current_price
        stop_loss = entry * 1.02
        target = entry * 0.96
        
    else:
        signal_type = "HOLD"
        raw_conf = 45 + random.randint(0, 15)
        confidence = max(51, min(92, int(raw_conf)))
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
