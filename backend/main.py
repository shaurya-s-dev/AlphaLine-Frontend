from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler

from services.market_data import fetch_ohlcv
from services.features import compute_features
from services.model import generate_signal
from services.dynamo import write_signal

load_dotenv()

# Scheduler instance
scheduler = BackgroundScheduler()

CORE_TICKERS = [
    "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS",
    "AAPL", "NVDA", "MSFT", "GOOGL", "AMZN", "TSLA"
]

def scheduled_signal_generation():
    print("Executing scheduled batch signal generation...")
    run_batch_pipeline(CORE_TICKERS)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    scheduler.add_job(
        scheduled_signal_generation,
        'interval',
        minutes=15,
        id='alphaline_seeding_job'
    )
    scheduler.start()
    print("APScheduler background tasks initialized.")
    yield
    # Shutdown
    scheduler.shutdown()
    print("APScheduler shutdown completed.")

app = FastAPI(
    title="Alphaline Signal Generation Engine",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
origins = [
    "http://localhost:3000",
    "https://localhost:3000",
]
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request schemas
class GenerateRequest(BaseModel):
    ticker: str

class BatchGenerateRequest(BaseModel):
    tickers: List[str]

# Core pipeline
def run_pipeline_for_ticker(ticker: str) -> dict:
    try:
        df = fetch_ohlcv(ticker, period="1mo", interval="15m")
        features = compute_features(df, ticker)
        signal = generate_signal(ticker, features)
        success = write_signal(signal)

        if not success:
            raise Exception("Failed to write item to DynamoDB table")

        return {
            "success": True,
            "ticker": ticker,
            "signal": {
                "market": signal.market,
                "signal_type": signal.signal_type,
                "confidence_score": signal.confidence_score,
                "entry_price": signal.entry_price,
                "stop_loss": signal.stop_loss,
                "target_price": signal.target_price,
                "risk_reward": signal.risk_reward,
                "created_at": signal.created_at
            }
        }
    except Exception as e:
        print(f"Error executing signal pipeline for {ticker}: {e}")
        return {"success": False, "ticker": ticker, "error": str(e)}

def run_batch_pipeline(tickers: List[str]) -> List[dict]:
    results = []
    for ticker in tickers:
        print(f"Processing ticker: {ticker}")
        results.append(run_pipeline_for_ticker(ticker))
    return results

# Endpoints
@app.get("/health")
def health():
    return {
        "status": "healthy",
        "region": os.environ.get("AWS_REGION", "us-east-1"),
        "table": os.environ.get("DYNAMODB_TABLE_NAME", "alphaline-signals")
    }

@app.post("/generate")
def generate_single_signal(payload: GenerateRequest):
    result = run_pipeline_for_ticker(payload.ticker)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Generation failed"))
    return result

@app.post("/generate-batch")
def generate_batch_signals(payload: BatchGenerateRequest):
    results = run_batch_pipeline(payload.tickers)
    return {"success": True, "results": results}