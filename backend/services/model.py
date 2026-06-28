import numpy as np
import joblib
import os
import hashlib
from datetime import datetime
from typing import Tuple

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'alphaline_model.pkl')
_model = None


def load_model():
    global _model
    if _model is None and os.path.exists(MODEL_PATH):
        try:
            _model = joblib.load(MODEL_PATH)
            print("[ML] XGBoost model loaded")
        except Exception as e:
            print(f"[ML] Load error: {e}")
    return _model


def deterministic_offset(ticker: str) -> float:
    date_str = datetime.utcnow().strftime('%Y-%m-%d')
    seed = hashlib.md5(f"{ticker}{date_str}".encode()).hexdigest()
    val = int(seed[:8], 16) / 0xFFFFFFFF
    return (val - 0.5) * 0.06


def predict_signal(features: dict, ticker: str) -> Tuple[str, int]:
    model = load_model()

    rsi = features.get('rsi', 50)
    volume_delta = features.get('volume_delta', 1.0)
    momentum = features.get('momentum', 0)
    price_position = features.get('price_position', 0.5)
    macd_signal = features.get('macd_signal', 0)
    bb_position = features.get('bb_position', 0.5)
    atr_pct = features.get('atr_pct', 0.02)

    if model is not None:
        try:
            X = np.array([[rsi, volume_delta, momentum,
                           price_position, macd_signal,
                           bb_position, atr_pct]])
            proba = model.predict_proba(X)[0]
            pred = int(model.predict(X)[0])
            signal_map = {0: 'HOLD', 1: 'BUY', 2: 'SELL'}
            signal = signal_map.get(pred, 'HOLD')
            confidence = int(max(proba) * 100)
            noise = int(deterministic_offset(ticker) * 10)
            confidence = max(51, min(92, confidence + noise))
            print(f"[ML] {ticker}: {signal} {confidence}% (XGBoost)")
            return signal, confidence
        except Exception as e:
            print(f"[ML] Inference error: {e}, using fallback")

    # Rule-based fallback
    noise = deterministic_offset(ticker)
    bullish = sum([
        rsi < 48,
        volume_delta > 1.12,
        momentum > 0.004,
        price_position < 0.42,
    ])
    bearish = sum([
        rsi > 57,
        volume_delta > 1.12,
        momentum < -0.004,
        price_position > 0.68,
    ])

    if bullish >= 2 and bullish > bearish:
        signal = 'BUY'
        conf = min(88, 52 + bullish * 9 + max(0, (50 - rsi) * 0.5) + noise * 100)
    elif bearish >= 2 and bearish > bullish:
        signal = 'SELL'
        conf = min(88, 52 + bearish * 9 + max(0, (rsi - 50) * 0.5) + noise * 100)
    else:
        signal = 'HOLD'
        conf = 46 + abs(noise * 80)

    print(f"[ML] {ticker}: {signal} {int(conf)}% (rule-based fallback)")
    return signal, max(51, min(88, int(conf)))


def generate_signal(ticker: str, features: dict, current_price: float) -> dict:
    signal, confidence = predict_signal(features, ticker)

    atr = features.get('atr', current_price * 0.02)
    atr = max(atr, current_price * 0.005)

    if signal == 'BUY':
        stop_loss = round(current_price - atr * 1.2, 2)
        target = round(current_price + atr * 2.2, 2)
    elif signal == 'SELL':
        stop_loss = round(current_price + atr * 1.2, 2)
        target = round(current_price - atr * 2.2, 2)
    else:
        stop_loss = round(current_price - atr * 1.5, 2)
        target = round(current_price + atr * 1.5, 2)

    sl_dist = abs(current_price - stop_loss)
    tgt_dist = abs(target - current_price)
    risk_reward = round(tgt_dist / sl_dist, 1) if sl_dist > 0 else 2.0

    return {
        'signal': signal,
        'confidence': confidence,
        'entry_price': current_price,
        'stop_loss': stop_loss,
        'target_price': target,
        'risk_reward': risk_reward,
        'model': 'xgboost' if load_model() else 'rule_based',
        'features': features,
    }
