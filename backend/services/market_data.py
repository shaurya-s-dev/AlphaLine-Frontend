import yfinance as yf
import pandas as pd
import time
import requests
import os
from typing import Dict, Tuple

ALPHA_VANTAGE_KEY = os.environ.get('ALPHA_VANTAGE_KEY')

# Simple in-memory cache structure: { ticker: (timestamp_fetched, DataFrame) }
_cache: Dict[str, Tuple[float, pd.DataFrame]] = {}
CACHE_TTL = 15 * 60  # 15 minutes in seconds

def fetch_ohlcv_alphavantage(ticker: str) -> pd.DataFrame:
    """
    Alpha Vantage: 500 free calls/day
    Get free key at alphavantage.co
    """
    # Convert ticker format
    symbol = ticker.replace('.NS', '').replace('.BO', '')
    
    url = (
        f"https://www.alphavantage.co/query"
        f"?function=TIME_SERIES_DAILY"
        f"&symbol={symbol}"
        f"&outputsize=compact"
        f"&apikey={ALPHA_VANTAGE_KEY}"
    )
    
    try:
        r = requests.get(url, timeout=10)
        data = r.json()
        
        if 'Time Series (Daily)' not in data:
            raise ValueError(f"No data: {data.get('Note', 'Unknown error')}")
        
        ts = data['Time Series (Daily)']
        rows = []
        for date, values in list(ts.items())[:30]:
            rows.append({
                'date': date,
                'open': float(values['1. open']),
                'high': float(values['2. high']),
                'low': float(values['3. low']),
                'close': float(values['4. close']),
                'volume': int(values['5. volume']),
            })
        
        df = pd.DataFrame(rows)
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date').reset_index(drop=True)
        df = df.rename(columns={
            'open': 'Open',
            'high': 'High',
            'low': 'Low',
            'close': 'Close',
            'volume': 'Volume',
            'date': 'Date'
        })
        df.attrs['data_source'] = 'alphavantage'
        df.data_source = 'alphavantage'
        return df
        
    except Exception as e:
        raise ValueError(f"Alpha Vantage failed: {e}")

def fetch_ohlcv(ticker: str, period="1mo", interval="15m", *args, **kwargs) -> pd.DataFrame:
    """
    Primary: Alpha Vantage
    Fallback: yfinance
    Cache result for 15 minutes
    """
    cache_key = f"{ticker}_{int(time.time() // 900)}"
    
    # Check cache validity
    if cache_key in _cache:
        cached_time, df = _cache[cache_key]
        if time.time() - cached_time < CACHE_TTL:
            return df
            
    # Try Alpha Vantage first
    if ALPHA_VANTAGE_KEY:
        try:
            df = fetch_ohlcv_alphavantage(ticker)
            _cache[cache_key] = (time.time(), df)
            return df
        except Exception as e:
            print(f"[AV] {ticker} failed: {e}, falling back to yfinance")
    
    # Fallback to yfinance
    try:
        p = kwargs.get('period', period)
        i = kwargs.get('interval', interval)
        data = yf.download(ticker, period=p, interval=i, progress=False)
        if data.empty:
            raise ValueError("No data from yfinance")
            
        # Clean multi-index columns if yfinance returns them
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = [col[0] for col in data.columns]
            
        # Ensure 'Date' column is a column (reset index)
        if 'Date' not in data.columns and data.index.name == 'Date':
            data = data.reset_index()
        elif data.index.name == 'Date' or 'Date' not in data.columns:
            data = data.reset_index()
            
        # Ensure columns match Capitalized case
        rename_dict = {}
        for c in data.columns:
            if c.lower() in ['open', 'high', 'low', 'close', 'volume', 'date']:
                rename_dict[c] = c.lower().capitalize()
        data = data.rename(columns=rename_dict)
        data.attrs['data_source'] = 'yfinance'
        data.data_source = 'yfinance'
        
        _cache[cache_key] = (time.time(), data)
        return data
    except Exception as e:
        raise ValueError(f"All data sources failed for {ticker}: {e}")
