import yfinance as yf
import pandas as pd
import time
from typing import Dict, Tuple

# Simple in-memory cache structure: { ticker: (timestamp_fetched, DataFrame) }
_cache: Dict[str, Tuple[float, pd.DataFrame]] = {}
CACHE_TTL = 15 * 60  # 15 minutes in seconds

def fetch_ohlcv(ticker: str, period="1mo", interval="15m") -> pd.DataFrame:
    """
    Fetches OHLCV historical data for a ticker using yfinance.
    Utilizes an in-memory cache of 15 minutes to avoid yfinance rate limits.
    """
    now = time.time()
    cache_key = f"{ticker}_{period}_{interval}"
    
    # Check cache validity
    if cache_key in _cache:
        cached_time, df = _cache[cache_key]
        if now - cached_time < CACHE_TTL:
            return df

    # Fetch fresh data
    ticker_obj = yf.Ticker(ticker)
    df = ticker_obj.history(period=period, interval=interval)
    
    if df.empty:
        raise ValueError(f"No OHLCV data returned for ticker: {ticker}")
        
    # Store in cache
    _cache[cache_key] = (now, df)
    return df
