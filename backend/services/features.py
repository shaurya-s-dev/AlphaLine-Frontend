import pandas as pd
import numpy as np
from typing import Tuple

def get_52w_range(ticker: str) -> Tuple[float, float]:
    """
    Fetches 1 year of daily history to compute the 52-week high and low prices.
    Returns (low_52w, high_52w).
    """
    try:
        import yfinance as yf
        ticker_obj = yf.Ticker(ticker)
        df_1y = ticker_obj.history(period="1y", interval="1d")
        if not df_1y.empty:
            return float(df_1y['Low'].min()), float(df_1y['High'].max())
    except Exception as e:
        print(f"Warning: Could not fetch 52-week range for {ticker}: {e}")
    return 0.0, 0.0

def compute_features(df: pd.DataFrame, ticker: str) -> dict:
    """
    Computes key trading features from OHLCV data using standard formulas.
    """
    # 1. RSI (14 period) using Wilder's EMA smoothing
    close_prices = df['close']
    delta = close_prices.diff()
    gain = (delta.where(delta > 0, 0.0)).fillna(0.0)
    loss = (-delta.where(delta < 0, 0.0)).fillna(0.0)
    
    # Wilder's exponential smoothing
    avg_gain = gain.ewm(alpha=1.0/14.0, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0/14.0, adjust=False).mean()
    
    # Prevent divide by zero
    rs = np.where(avg_loss > 0, avg_gain / avg_loss, 999999.0)
    rsi_series = 100.0 - (100.0 / (1.0 + rs))
    rsi = float(rsi_series[-1]) if len(rsi_series) > 0 else 50.0

    # 2. MACD
    ema_12 = close_prices.ewm(span=12, adjust=False).mean()
    ema_26 = close_prices.ewm(span=26, adjust=False).mean()
    macd_line = ema_12 - ema_26
    macd_signal_line = macd_line.ewm(span=9, adjust=False).mean()
    
    latest_macd = macd_line.iloc[-1] if len(macd_line) > 0 else 0.0
    latest_macd_signal = macd_signal_line.iloc[-1] if len(macd_signal_line) > 0 else 0.0
    
    prev_macd = macd_line.iloc[-2] if len(macd_line) > 1 else latest_macd
    prev_macd_signal = macd_signal_line.iloc[-2] if len(macd_signal_line) > 1 else latest_macd_signal

    # 3. Bollinger Bands
    bb_mid_series = close_prices.rolling(window=20).mean()
    bb_std_series = close_prices.rolling(window=20).std()
    
    bb_upper_series = bb_mid_series + 2.0 * bb_std_series
    bb_lower_series = bb_mid_series - 2.0 * bb_std_series
    
    latest_bb_mid = bb_mid_series.iloc[-1] if len(bb_mid_series) > 0 else close_prices.iloc[-1]
    latest_bb_upper = bb_upper_series.iloc[-1] if len(bb_upper_series) > 0 else close_prices.iloc[-1] * 1.05
    latest_bb_lower = bb_lower_series.iloc[-1] if len(bb_lower_series) > 0 else close_prices.iloc[-1] * 0.95

    # 4. Volume SMA
    volume_series = df['volume']
    volume_sma_series = volume_series.rolling(window=20).mean()
    latest_volume = volume_series.iloc[-1] if len(volume_series) > 0 else 1.0
    latest_volume_sma = volume_sma_series.iloc[-1] if len(volume_sma_series) > 0 else 1.0

    # 5. EMA 9 and EMA 21
    ema_9_series = close_prices.ewm(span=9, adjust=False).mean()
    ema_21_series = close_prices.ewm(span=21, adjust=False).mean()
    latest_ema_9 = ema_9_series.iloc[-1] if len(ema_9_series) > 0 else close_prices.iloc[-1]
    latest_ema_21 = ema_21_series.iloc[-1] if len(ema_21_series) > 0 else close_prices.iloc[-1]

    # 6. ATR (14 period)
    # tr = max(high - low, abs(high - close_prev), abs(low - close_prev))
    prev_close = close_prices.shift(1)
    tr1 = df['high'] - df['low']
    tr2 = (df['high'] - prev_close).abs()
    tr3 = (df['low'] - prev_close).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr_series = tr.rolling(window=14).mean()
    atr = float(atr_series.iloc[-1]) if len(atr_series) > 0 and pd.notna(atr_series.iloc[-1]) else 0.02 * close_prices.iloc[-1]

    latest_close = float(close_prices.iloc[-1])
    prev_close_val = float(close_prices.iloc[-2]) if len(close_prices) > 1 else latest_close

    # 7. Price Position
    low_52w, high_52w = get_52w_range(ticker)
    if low_52w > 0 and high_52w > low_52w:
        price_position = float((latest_close - low_52w) / (high_52w - low_52w))
        price_position = max(0.0, min(1.0, price_position))
    else:
        min_val = df['low'].min()
        max_val = df['high'].max()
        if max_val > min_val:
            price_position = float((latest_close - min_val) / (max_val - min_val))
            price_position = max(0.0, min(1.0, price_position))
        else:
            price_position = 0.5

    volume_delta = float(latest_volume / latest_volume_sma) if latest_volume_sma > 0 else 1.0

    return {
        'rsi': float(rsi),
        'macd_crossover': bool(latest_macd > latest_macd_signal and prev_macd <= prev_macd_signal),
        'price_above_bb_mid': bool(latest_close > latest_bb_mid),
        'volume_surge': bool(latest_volume > latest_volume_sma * 1.2),
        'close': latest_close,
        'prev_close': prev_close_val,
        'momentum': float((latest_close - prev_close_val) / prev_close_val) if prev_close_val > 0 else 0.0,
        
        # Compatibility with model.py:
        'volume_delta': float(volume_delta),
        'price_position': float(price_position),
        'current_price': float(latest_close),
        'atr': float(atr),
        'macd': float(latest_macd),
        'macd_signal': float(latest_macd_signal),
        'macd_diff': float(latest_macd - latest_macd_signal),
        'bb_high': float(latest_bb_upper),
        'bb_low': float(latest_bb_lower),
        'bb_mid': float(latest_bb_mid),
        'ema_9': float(latest_ema_9),
        'ema_21': float(latest_ema_21)
    }