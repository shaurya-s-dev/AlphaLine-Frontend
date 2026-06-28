import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
import os

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_DSN'),
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,
    environment=os.environ.get('ENV', 'production')
)

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, validator
from typing import List
import boto3
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from services.market_data import fetch_ohlcv
from services.features import compute_features
from services.model import generate_signal
from services.dynamo import write_signal

load_dotenv()

TABLE_NAME = os.environ.get("DYNAMODB_TABLE_NAME", "alphaline-signals")
dynamodb = boto3.client(
    'dynamodb',
    region_name=os.environ.get('AWS_REGION', 'us-east-1'),
    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
)

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address)

# Scheduler instance
scheduler = BackgroundScheduler()

CORE_TICKERS = [
    # NSE (India)
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", 
    "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS", 
    "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS", "TITAN.NS", 
    "BAJFINANCE.NS", "WIPRO.NS", "ULTRACEMCO.NS", "NESTLEIND.NS", "POWERGRID.NS", 
    "NTPC.NS", "SUNPHARMA.NS", "TECHM.NS", "HCLTECH.NS", "DIVISLAB.NS", 
    "DRREDDY.NS", "CIPLA.NS", "BRITANNIA.NS", "EICHERMOT.NS", "BAJAJFINSV.NS", 
    "TATASTEEL.NS", "JSWSTEEL.NS", "COALINDIA.NS", "ONGC.NS", "BPCL.NS", 
    "IOC.NS", "GRASIM.NS", "ADANIPORTS.NS", "INDUSINDBK.NS",
    "TATAMOTORS.NS", "ADANIENT.NS", "LTIM.NS",
    # BSE (India)
    "TATASTEEL.BO", "TATAMOTORS.BO", "WIPRO.BO", "RELIANCE.BO", "TCS.BO", 
    "INFY.BO", "ICICIBANK.BO", "HDFCBANK.BO", "SBIN.BO", "BAJFINANCE.BO", 
    "ADANIENT.BO", "MARUTI.BO", "SUNPHARMA.BO", "AXISBANK.BO", "KOTAKBANK.BO", 
    "TITAN.BO", "HINDUNILVR.BO", "ULTRACEMCO.BO", "NESTLEIND.BO", "POWERGRID.BO",
    # US Markets
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B", "JPM", "V", 
    "JNJ", "WMT", "PG", "MA", "HD", "BAC", "XOM", "ABBV", "PFE", "AVGO",
    "AMD", "NFLX", "CRM", "COST", "TMO", "ACN", "DHR", "NEE", "UNH", "LIN",
    "SHOP", "SQ", "PLTR", "RBLX", "SNAP", "UBER", "LYFT", "ABNB", "COIN", "HOOD",
    # Index
    "^NSEI", "^BSESN", "^NSEBANK", "^CNXIT", "^NDX", "^GSPC", "^DJI", "^VIX", "^INDIAVIX"
]

ALLOWED_TICKERS = set(CORE_TICKERS)
MAX_TICKERS_PER_REQUEST = 20

# Input validation schemas
class GenerateRequest(BaseModel):
    ticker: str
    
    @validator('ticker')
    def validate_ticker(cls, v):
        if v not in ALLOWED_TICKERS:
            raise ValueError(f'Invalid ticker: {v}')
        return v

class BatchGenerateRequest(BaseModel):
    tickers: List[str]
    
    @validator('tickers')
    def validate_tickers(cls, v):
        if len(v) > MAX_TICKERS_PER_REQUEST:
            raise ValueError(
                f'Max {MAX_TICKERS_PER_REQUEST} tickers per request'
            )
        invalid = [t for t in v 
                   if t not in ALLOWED_TICKERS]
        if invalid:
            raise ValueError(
                f'Invalid tickers: {invalid}'
            )
        return v

def scheduled_signal_generation():
    print("Executing scheduled batch signal generation...")
    run_batch_pipeline(CORE_TICKERS)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global dynamodb
    dynamodb = get_dynamodb_client()

    # ── ML Model: train on first boot if no .pkl exists ──────────────────
    from services.train_model import train_and_save, MODEL_PATH as _MODEL_PATH
    if not os.path.exists(_MODEL_PATH):
        print("[Startup] No XGBoost model found — training now...")
        try:
            train_and_save()
            print("[Startup] XGBoost model trained and saved")
        except Exception as e:
            print(f"[Startup] Training failed: {e} — rule-based fallback will be used")
    else:
        print("[Startup] XGBoost model found — skipping training")

    # Load model into memory immediately
    from services.model import load_model
    load_model()

    # ── Scheduler ─────────────────────────────────────────────────────────
    scheduler.add_job(
        scheduled_signal_generation,
        'interval',
        minutes=30,
        id='alphaline_seeding_job'
    )
    scheduler.start()
    print("[Startup] APScheduler background tasks initialized.")

    # Run immediate seeding on startup
    print(f"[Startup] Running batch signal generation for {len(CORE_TICKERS)} tickers...")
    try:
        run_batch_pipeline(CORE_TICKERS)
        print("[Startup] Batch signal generation completed.")
    except Exception as e:
        print(f"[Startup] Error during signal seeding: {e}")

    yield
    # ── Shutdown ──────────────────────────────────────────────────────────
    scheduler.shutdown()
    print("[Shutdown] APScheduler stopped.")

app = FastAPI(
    title="Alphaline Signal Generation Engine",
    version="1.0.0",
    lifespan=lifespan
)

# Attach rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — lock it to actual domains
ALLOWED_ORIGINS = [
    "https://alphaline-phi.vercel.app",
    "http://localhost:3000",  # dev only
]
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url and frontend_url not in ALLOWED_ORIGINS:
    ALLOWED_ORIGINS.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    print(f"[Error] {type(exc).__name__}: {exc}")  # log it
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(type(exc).__name__)}
        # Never return str(exc) — leaks internal paths/secrets
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"error": "Invalid request", "detail": str(exc.errors())}
    )

def check_recent_signal_exists(ticker: str) -> bool:
    """
    Checks if a signal for the given ticker was already written to DynamoDB
    with a timestamp (SK) between now and 15 minutes ago.
    """
    try:
        region = os.environ.get("AWS_REGION", "us-east-1")
        table_name = os.environ.get("DYNAMODB_TABLE_NAME", "alphaline-signals")
        
        dynamodb = boto3.resource("dynamodb", region_name=region)
        table = dynamodb.Table(table_name)
        
        now_dt = datetime.utcnow()
        fifteen_min_ago_dt = now_dt - timedelta(minutes=15)
        
        now_str = now_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        fifteen_min_ago_str = fifteen_min_ago_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        pk_val = f"TICKER#{ticker}"
        sk_start = f"SIGNAL#{fifteen_min_ago_str}"
        sk_end = f"SIGNAL#{now_str}"
        
        from boto3.dynamodb.conditions import Key
        
        response = table.query(
            KeyConditionExpression=Key('PK').eq(pk_val) & Key('SK').between(sk_start, sk_end),
            Select='COUNT'
        )
        
        count = response.get("Count", 0)
        return count > 0
    except Exception as e:
        print(f"Error checking recent signals for {ticker}: {e}")
        # If DynamoDB fails, return False to let signal pipeline proceed normally
        return False

def check_is_market_open(market: str) -> bool:
    """
    Checks if market (NSE, BSE, US) is open.
    """
    now = datetime.now(timezone.utc)
    
    if market in ["NSE", "BSE"]:
        # IST is UTC + 5:30
        # Monday-Friday, 9:15 AM to 3:30 PM IST
        ist = now + timedelta(hours=5, minutes=30)
        day = ist.weekday()
        if day >= 5: # Saturday/Sunday
            return False
        total_mins = ist.hour * 60 + ist.minute
        # 9:15 AM is 555 mins, 3:30 PM is 930 mins
        return 555 <= total_mins < 930
        
    elif market == "US":
        # EST is UTC-5
        # Monday-Friday, 9:30 AM to 4:00 PM EST
        est = now - timedelta(hours=5)
        day = est.weekday()
        if day >= 5:
            return False
        total_mins = est.hour * 60 + est.minute
        # 9:30 AM is 570 mins, 4:00 PM is 960 mins
        return 570 <= total_mins < 960
        
    return False

# Core pipeline
def run_pipeline_for_ticker(ticker: str) -> dict:
    try:
        # Check for duplicate signals within last 15 minutes
        if check_recent_signal_exists(ticker):
            print(f"Deduplication check: Signal for {ticker} already generated in the last 15 minutes. Skipping.")
            return {
                "success": True,
                "ticker": ticker,
                "message": "Signal recently generated. Generation skipped.",
                "skipped": True
            }

        df = fetch_ohlcv(ticker, period="1mo", interval="15m")
        features = compute_features(df, ticker)
        current_price = features.get('close', 0.0)
        if current_price == 0:
            current_price = features.get('price', 0.0)
        signal = generate_signal(ticker=ticker, features=features, current_price=current_price)
        
        # Freshness Tracking metadata
        data_source = getattr(df, 'data_source', 'yfinance')
        is_market_open = check_is_market_open(signal.market)
        
        from services.dynamo import get_last_trading_day
        market_date = get_last_trading_day()

        success = write_signal(signal, data_source=data_source, is_market_open=is_market_open)

        if not success:
            raise Exception("Failed to write item to DynamoDB table")

        return {
            "success": True,
            "ticker": ticker,
            "skipped": False,
            "signal": {
                "market": signal.market,
                "signal_type": signal.signal_type,
                "confidence_score": signal.confidence_score,
                "entry_price": signal.entry_price,
                "stop_loss": signal.stop_loss,
                "target_price": signal.target_price,
                "risk_reward": signal.risk_reward,
                "created_at": signal.created_at,
                "market_date": market_date,
                "is_market_open": is_market_open,
                "data_source": data_source
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
async def health():
    import boto3, os
    from services.model import MODEL_PATH

    try:
        client = boto3.client(
            'dynamodb',
            region_name=os.environ.get('AWS_REGION', 'us-east-1'),
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
        )
        client.describe_table(TableName=os.environ.get('DYNAMODB_TABLE_NAME', 'alphaline-signals'))
        db = "healthy"
    except Exception as e:
        db = f"error: {str(e)[:60]}"

    return {
        "status": "healthy" if db == "healthy" else "degraded",
        "database": db,
        "ml_model": "xgboost" if os.path.exists(MODEL_PATH) else "rule_based",
        "region": os.environ.get("AWS_REGION"),
        "table": os.environ.get("DYNAMODB_TABLE_NAME"),
        "version": "2.0.0"
    }

@app.post("/generate")
def generate_single_signal(payload: GenerateRequest):
    result = run_pipeline_for_ticker(payload.ticker)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Generation failed"))
    return result

@app.post("/generate-batch")
@limiter.limit("5/minute")
def generate_batch_signals(request: Request, payload: BatchGenerateRequest):
    results = run_batch_pipeline(payload.tickers)
    return {"success": True, "results": results}

@app.get("/signals")
@limiter.limit("30/minute")
def get_signals(
    request: Request,
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
                "created_at": item.get("created_at", ""),
                "market_date": item.get("market_date", ""),
                "is_market_open": bool(item.get("is_market_open", False)),
                "data_source": item.get("data_source", "yfinance")
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

def get_latest_signal(ticker: str) -> dict:
    try:
        region = os.environ.get("AWS_REGION", "us-east-1")
        table_name = os.environ.get("DYNAMODB_TABLE_NAME", "alphaline-signals")
        
        dynamodb = boto3.resource("dynamodb", region_name=region)
        table = dynamodb.Table(table_name)
        
        from boto3.dynamodb.conditions import Key
        response = table.query(
            KeyConditionExpression=Key('PK').eq(f"TICKER#{ticker}") & Key('SK').begins_with("SIGNAL#"),
            ScanIndexForward=False,  # Descending by timestamp
            Limit=1
        )
        items = response.get("Items", [])
        if items:
            item = items[0]
            return {
                "signal": item.get("signal_type", "HOLD"),
                "confidence": int(item.get("confidence_score", 50))
            }
    except Exception as e:
        print(f"Error getting latest signal from DynamoDB for {ticker}: {e}")
    return {"signal": "HOLD", "confidence": 50}

@app.get("/api/analyze/{ticker}")
@limiter.limit("10/minute")
async def analyze_ticker(ticker: str, request: Request):
    """
    Run 3-agent AI analysis for a ticker.
    Fetches latest signal from DynamoDB then
    runs Technical + Sentiment + Strategist agents via Groq.
    """
    # Get signal data from DynamoDB
    try:
        resp = dynamodb.query(
            TableName=TABLE_NAME,
            KeyConditionExpression="PK = :pk",
            ExpressionAttributeValues={
                ":pk": {"S": f"TICKER#{ticker}"}
            },
            ScanIndexForward=False,
            Limit=1
        )
        items = resp.get("Items", [])
        if not items:
            raise HTTPException(404, "No signal found for this ticker")

        item = items[0]
        signal = item.get("signal", {}).get("S", "HOLD")
        confidence = int(item.get("confidence", {}).get("N", "65"))
        current_price = float(item.get("entry_price", {}).get("N", "0"))
        stop_loss = float(item.get("stop_loss", {}).get("N", "0"))
        target_price = float(item.get("target_price", {}).get("N", "0"))
        risk_reward = float(item.get("risk_reward", {}).get("N", "2.0"))
        market = item.get("market", {}).get("S", "US")
        features = json.loads(
            item.get("features", {}).get("S", "{}")
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"DynamoDB error: {str(e)[:60]}")

    from services.ai_agents import run_full_analysis
    import asyncio
    try:
        result = await asyncio.wait_for(
            run_full_analysis(
                ticker=ticker,
                market=market,
                signal=signal,
                confidence=confidence,
                current_price=current_price,
                stop_loss=stop_loss,
                target_price=target_price,
                risk_reward=risk_reward,
                features=features,
            ),
            timeout=120.0  # 2 minutes max
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail="Analysis timed out. Try again."
        )

    # Cache to DynamoDB with 6hr TTL
    if result.get("success"):
        try:
            import time
            from decimal import Decimal
            analysis_date = datetime.utcnow().strftime("%Y-%m-%d")
            ttl_val = int(time.time() + 21600)  # 6 hours

            region = os.environ.get("AWS_REGION", "us-east-1")
            table_name = os.environ.get("DYNAMODB_TABLE_NAME", "alphaline-signals")
            dynamo_resource = boto3.resource("dynamodb", region_name=region)
            table = dynamo_resource.Table(table_name)

            agents = result.get("agents", {})
            cache_item = {
                "PK": f"ANALYSIS#{ticker}",
                "SK": f"ANALYSIS#{analysis_date}",
                "ttl": Decimal(str(ttl_val)),
                "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "ticker": ticker,
                "signal": signal,
                "confidence": Decimal(str(confidence)),
                "technical_report": agents.get("technical", {}).get("report", ""),
                "sentiment_report": agents.get("sentiment", {}).get("report", ""),
                "strategist_report": agents.get("strategist", {}).get("report", ""),
                "agents_used": Decimal(str(result.get("agents_used", 3))),
                "model": result.get("model", "llama-3.1-8b-instant via Groq"),
            }
            table.put_item(Item=cache_item)
        except Exception as ex:
            print(f"[Cache] Failed to cache analysis: {ex}")

    return result


@app.get("/api/analyze/{ticker}/cached")
@limiter.limit("30/minute")
async def analyze_ticker_cached(ticker: str, request: Request):
    """
    Returns cached 3-agent analysis if < 6 hours old,
    otherwise triggers a fresh analysis.
    """
    analysis_date = datetime.utcnow().strftime("%Y-%m-%d")

    try:
        region = os.environ.get("AWS_REGION", "us-east-1")
        table_name = os.environ.get("DYNAMODB_TABLE_NAME", "alphaline-signals")
        dynamo_resource = boto3.resource("dynamodb", region_name=region)
        table = dynamo_resource.Table(table_name)

        response = table.get_item(
            Key={
                "PK": f"ANALYSIS#{ticker}",
                "SK": f"ANALYSIS#{analysis_date}"
            }
        )
        item = response.get("Item")
        if item:
            import time
            ttl = int(item.get("ttl", 0))
            if ttl > int(time.time()):
                return {
                    "success": True,
                    "ticker": ticker,
                    "signal": item.get("signal", "HOLD"),
                    "confidence": int(item.get("confidence", 65)),
                    "agents": {
                        "technical": {
                            "name": "Technical Analyst",
                            "report": item.get("technical_report", ""),
                            "icon": "📊"
                        },
                        "sentiment": {
                            "name": "Sentiment Analyst",
                            "report": item.get("sentiment_report", ""),
                            "icon": "🧠"
                        },
                        "strategist": {
                            "name": "Chief Strategist",
                            "report": item.get("strategist_report", ""),
                            "icon": "⚡"
                        }
                    },
                    "agents_used": int(item.get("agents_used", 3)),
                    "model": item.get("model", "llama-3.1-8b-instant via Groq"),
                    "cached": True
                }
    except Exception as e:
        print(f"[Cache] Error retrieving cached analysis: {e}")

    # Not cached or expired — run fresh
    return await analyze_ticker(ticker, request)