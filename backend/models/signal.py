from pydantic import BaseModel, Field
from typing import Literal

class Signal(BaseModel):
    ticker: str
    market: Literal["NSE", "BSE", "US"]
    signal_type: Literal["BUY", "SELL", "HOLD"]
    confidence_score: int = Field(..., ge=0, le=100)
    entry_price: float
    stop_loss: float
    target_price: float
    risk_reward: float
    ttl: int
    created_at: str
