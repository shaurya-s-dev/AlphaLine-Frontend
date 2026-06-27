import pandas as pd
import ta
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
    # 1. RSI (14 period) — using ta library instead of pandas_ta
    rsi_series = ta.momentum.RSIIndicator(close=df['Close'], window=14).rsi()
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

    # 5. ATR (14 period)
    try:
        atr_indicator = ta.volatility.AverageTrueRange(high=df['High'], low=df['Low'], close=df['Close'], window=14)
        atr_series = atr_indicator.average_true_range()
        atr = float(atr_series.iloc[-1]) if not atr_series.empty and pd.notna(atr_series.iloc[-1]) else 0.02 * close
    except Exception as e:
        print(f"Warning: ATR calculation failed: {e}")
        atr = 0.02 * close

    # 6. MACD
    try:
        macd_indicator = ta.trend.MACD(close=df['Close'])
        macd = float(macd_indicator.macd().iloc[-1]) if not macd_indicator.macd().empty and pd.notna(macd_indicator.macd().iloc[-1]) else 0.0
        macd_signal = float(macd_indicator.macd_signal().iloc[-1]) if not macd_indicator.macd_signal().empty and pd.notna(macd_indicator.macd_signal().iloc[-1]) else 0.0
        macd_diff = float(macd_indicator.macd_diff().iloc[-1]) if not macd_indicator.macd_diff().empty and pd.notna(macd_indicator.macd_diff().iloc[-1]) else 0.0
    except Exception as e:
        print(f"Warning: MACD calculation failed: {e}")
        macd, macd_signal, macd_diff = 0.0, 0.0, 0.0

    # 7. Bollinger Bands
    try:
        bb_indicator = ta.volatility.BollingerBands(close=df['Close'])
        bb_high = float(bb_indicator.bollinger_hband().iloc[-1]) if not bb_indicator.bollinger_hband().empty and pd.notna(bb_indicator.bollinger_hband().iloc[-1]) else close * 1.05
        bb_low = float(bb_indicator.bollinger_lband().iloc[-1]) if not bb_indicator.bollinger_lband().empty and pd.notna(bb_indicator.bollinger_lband().iloc[-1]) else close * 0.95
        bb_mid = float(bb_indicator.bollinger_mavg().iloc[-1]) if not bb_indicator.bollinger_mavg().empty and pd.notna(bb_indicator.bollinger_mavg().iloc[-1]) else close
    except Exception as e:
        print(f"Warning: BB calculation failed: {e}")
        bb_high, bb_low, bb_mid = close * 1.05, close * 0.95, close

    # 8. EMA Crossover (9/21)
    try:
        ema_9_series = ta.trend.EMAIndicator(close=df['Close'], window=9).ema_indicator()
        ema_21_series = ta.trend.EMAIndicator(close=df['Close'], window=21).ema_indicator()
        ema_9 = float(ema_9_series.iloc[-1]) if not ema_9_series.empty and pd.notna(ema_9_series.iloc[-1]) else close
        ema_21 = float(ema_21_series.iloc[-1]) if not ema_21_series.empty and pd.notna(ema_21_series.iloc[-1]) else close
    except Exception as e:
        print(f"Warning: EMA calculation failed: {e}")
        ema_9, ema_21 = close, close

    return {
        "rsi": rsi,
        "volume_delta": volume_delta,
        "momentum": momentum,
        "price_position": price_position,
        "current_price": float(close),
        "atr": atr,
        "macd": macd,
        "macd_signal": macd_signal,
        "macd_diff": macd_diff,
        "bb_high": bb_high,
        "bb_low": bb_low,
        "bb_mid": bb_mid,
        "ema_9": ema_9,
        "ema_21": ema_21
    }