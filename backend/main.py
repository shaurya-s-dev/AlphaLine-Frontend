from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
import boto3
from datetime import datetime
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
    
    # Run immediate seeding on startup using the specified tickers
    seeding_tickers = [
        "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS",
        "AAPL", "NVDA", "MSFT", "GOOGL"
    ]
    print(f"Running startup batch signal generation for tickers: {seeding_tickers}")
    try:
        run_batch_pipeline(seeding_tickers)
        print("Startup batch signal generation completed successfully.")
    except Exception as e:
        print(f"Error during startup signal seeding: {e}")
        
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

@app.get("/signals")
def get_signals(
    market: str = "all",
    signal_type: str = "all",
    min_confidence: int = 0,
    limit: int = 20
):
    try:
        region = os.environ.get("AWS_REGION", "us-east-1")
        table_name = os.environ.get("DYNAMODB_TABLE_NAME", "alphaline-signals")
        
        # Initialize boto3 DynamoDB resource
        dynamodb = boto3.resource("dynamodb", region_name=region)
        table = dynamodb.Table(table_name)
        
        db_items = []
        is_specific_market = market.lower() != "all" and market.strip() != ""
        
        if is_specific_market:
            # Query GSI: confidence-index
            # PK: market (String)
            # SK: confidence_score (Number)
            from boto3.dynamodb.conditions import Key, Attr
            
            key_expr = Key('market').eq(market)
            if min_confidence > 0:
                key_expr = key_expr & Key('confidence_score').gte(min_confidence)
                
            query_params = {
                "IndexName": "confidence-index",
                "KeyConditionExpression": key_expr,
                "ScanIndexForward": False  # Sort descending by confidence_score
            }
            
            if signal_type.lower() != "all" and signal_type.strip() != "":
                query_params["FilterExpression"] = Attr("signal_type").eq(signal_type.upper())
                
            response = table.query(**query_params)
            db_items = response.get("Items", [])
        else:
            # Scan table
            from boto3.dynamodb.conditions import Attr
            scan_params = {}
            filter_cond = None
            
            if min_confidence > 0:
                filter_cond = Attr("confidence_score").gte(min_confidence)
                
            if signal_type.lower() != "all" and signal_type.strip() != "":
                cond_type = Attr("signal_type").eq(signal_type.upper())
                if filter_cond:
                    filter_cond = filter_cond & cond_type
                else:
                    filter_cond = cond_type
                    
            if filter_cond:
                scan_params["FilterExpression"] = filter_cond
                
            response = table.scan(**scan_params)
            db_items = response.get("Items", [])
            
            # Sort in-memory descending by confidence score (since scan cannot sort)
            db_items.sort(key=lambda x: float(x.get("confidence_score", 0)), reverse=True)
            
        # Format the items to ensure clean JSON serialization
        formatted = []
        for item in db_items:
            # Extract ticker from PK (e.g. "TICKER#RELIANCE.NS" -> "RELIANCE.NS")
            ticker = item.get("PK", "").replace("TICKER#", "") if "PK" in item else "UNKNOWN"
            
            formatted.append({
                "id": f"{item.get('PK')}_{item.get('SK')}",
                "ticker": ticker,
                "market": item.get("market", "NSE"),
                "signal_type": item.get("signal_type", "BUY"),
                "confidence_score": int(item.get("confidence_score", 50)),
                "entry_price": float(item.get("entry_price", 0)),
                "stop_loss": float(item.get("stop_loss", 0)),
                "target_price": float(item.get("target_price", 0)),
                "risk_reward": float(item.get("risk_reward", 0)),
                "created_at": item.get("created_at", "")
            })
            
        # Limit to max results
        limited = formatted[:limit]
        
        # ISO timestamp
        generated_at = datetime.utcnow().isoformat() + "Z"
        
        return {
            "signals": limited,
            "count": len(limited),
            "generated_at": generated_at
        }
    except Exception as e:
        print(f"Error in GET /signals: {e}")
        raise HTTPException(status_code=500, detail=str(e))