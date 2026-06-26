import pandas as pd
import pandas_ta as ta
import yfinance as yf
from typing import Tuple

def get_52w_range(ticker: str) -> Tuple[float, float]:
    """
    Fetches 1 year of daily history to compute the 52-week high and low prices.
    Returns (low_52w, high_52w).
    """
    try:
        ticker_obj = yf.Ticker(ticker)
        df_1y = ticker_obj.history(period="1y", interval="1d")
        if not df_1y.empty:
            return float(df_1y['Low'].min()), float(df_1y['High'].max())
    except Exception as e:
        print(f"Warning: Could not fetch 52-week range for {ticker}: {e}")
    return 0.0, 0.0

def compute_features(df: pd.DataFrame, ticker: str) -> dict:
    """
    Computes key trading features from OHLCV data.
    """
    # 1. RSI (14 period)
    rsi_series = df.ta.rsi(length=14)
    rsi = float(rsi_series.iloc[-1]) if not rsi_series.empty and pd.notna(rsi_series.iloc[-1]) else 50.0

    # 2. Volume Delta (Current Volume / 20-day avg volume)
    # 15m intervals -> ~500 candles represent 20 trading days
    window_size = min(len(df), 500)
    avg_volume = df['Volume'].rolling(window=window_size).mean().iloc[-1]
    current_volume = df['Volume'].iloc[-1]
    volume_delta = float(current_volume / avg_volume) if avg_volume > 0 else 1.0

    # 3. Momentum: (Close - Close[10]) / Close[10]
    close = df['Close'].iloc[-1]
    close_10_ago = df['Close'].iloc[-11] if len(df) > 10 else df['Close'].iloc[0]
    momentum = float((close - close_10_ago) / close_10_ago) if close_10_ago > 0 else 0.0

    # 4. Price Position: Where the current Close sits within the 52-week range [0, 1]
    low_52w, high_52w = get_52w_range(ticker)
    if low_52w > 0 and high_52w > low_52w:
        price_position = float((close - low_52w) / (high_52w - low_52w))
        price_position = max(0.0, min(1.0, price_position))
    else:
        # Fallback to current 1-month range from fetched data
        min_val = df['Low'].min()
        max_val = df['High'].max()
        if max_val > min_val:
            price_position = float((close - min_val) / (max_val - min_val))
            price_position = max(0.0, min(1.0, price_position))
        else:
            price_position = 0.5

    return {
        "rsi": rsi,
        "volume_delta": volume_delta,
        "momentum": momentum,
        "price_position": price_position,
        "current_price": float(close)
    }
