import boto3
import decimal
from datetime import datetime, timedelta
import time
import os

# Helper to convert float values to Decimal (required by boto3 for float numbers)
def dec(val):
    return decimal.Decimal(str(val))

def seed_data():
    # Initialize boto3 client. It will automatically load credentials from env vars.
    # To run this script locally, make sure you configure your AWS credentials
    # in your environment or .env file, or run 'aws configure' first.
    db_region = os.environ.get('AWS_REGION', 'us-east-1')
    
    print(f"Connecting to DynamoDB in region: {db_region}...")
    dynamodb = boto3.resource('dynamodb', region_name=db_region)
    table = dynamodb.Table('alphaline-signals')

    # Base setup details
    now = datetime.utcnow()
    
    # 20 Realistic mock signals
    mock_signals = [
        # NSE BUY Signals
        {"ticker": "RELIANCE.NS", "market": "NSE", "type": "BUY", "conf": 81, "entry": 2847.50, "sl": 2790.00, "tgt": 2960.00},
        {"ticker": "TCS.NS", "market": "NSE", "type": "SELL", "conf": 67, "entry": 3540.00, "sl": 3610.00, "tgt": 3390.00},
        {"ticker": "INFY.NS", "market": "NSE", "type": "HOLD", "conf": 54, "entry": 1820.00, "sl": 1775.00, "tgt": 1890.00},
        {"ticker": "HDFC.NS", "market": "NSE", "type": "SELL", "conf": 71, "entry": 1640.00, "sl": 1695.00, "tgt": 1570.00},
        {"ticker": "ICICIBANK.NS", "market": "NSE", "type": "BUY", "conf": 79, "entry": 1110.00, "sl": 1085.00, "tgt": 1150.00},
        {"ticker": "BHARTIARTL.NS", "market": "NSE", "type": "BUY", "conf": 85, "entry": 1420.00, "sl": 1390.00, "tgt": 1475.00},
        {"ticker": "SBIN.NS", "market": "NSE", "type": "HOLD", "conf": 58, "entry": 830.00, "sl": 810.00, "tgt": 860.00},
        {"ticker": "LTIM.BO", "market": "NSE", "type": "SELL", "conf": 63, "entry": 4850.00, "sl": 4950.00, "tgt": 4650.00},
        
        # BSE Signals
        {"ticker": "SENSEX", "market": "BSE", "type": "BUY", "conf": 76, "entry": 77200.00, "sl": 76400.00, "tgt": 78500.00},
        {"ticker": "TATASTEEL.BO", "market": "BSE", "type": "BUY", "conf": 83, "entry": 181.50, "sl": 177.00, "tgt": 190.00},
        {"ticker": "ITC.BO", "market": "BSE", "type": "HOLD", "conf": 61, "entry": 435.00, "sl": 424.00, "tgt": 450.00},
        {"ticker": "WIPRO.BO", "market": "BSE", "type": "SELL", "conf": 69, "entry": 490.00, "sl": 505.00, "tgt": 465.00},
        {"ticker": "MARUTI.BO", "market": "BSE", "type": "BUY", "conf": 72, "entry": 12100.00, "sl": 11850.00, "tgt": 12500.00},
        
        # US Signals
        {"ticker": "AAPL", "market": "US", "type": "BUY", "conf": 74, "entry": 189.20, "sl": 184.50, "tgt": 197.00},
        {"ticker": "NVDA", "market": "US", "type": "BUY", "conf": 88, "entry": 124.60, "sl": 119.00, "tgt": 134.00},
        {"ticker": "MSFT", "market": "US", "type": "BUY", "conf": 82, "entry": 420.50, "sl": 412.00, "tgt": 435.00},
        {"ticker": "TSLA", "market": "US", "type": "SELL", "conf": 75, "entry": 178.00, "sl": 186.00, "tgt": 164.00},
        {"ticker": "AMZN", "market": "US", "type": "HOLD", "conf": 51, "entry": 185.40, "sl": 181.00, "tgt": 192.00},
        {"ticker": "META", "market": "US", "type": "BUY", "conf": 80, "entry": 475.00, "sl": 462.00, "tgt": 498.00},
        {"ticker": "GOOGL", "market": "US", "type": "SELL", "conf": 62, "entry": 172.50, "sl": 176.80, "tgt": 165.00},
    ]

    print("Seeding database...")
    for idx, sig in enumerate(mock_signals):
        # Calculate risk-reward ratio
        risk = abs(sig["entry"] - sig["sl"])
        reward = abs(sig["tgt"] - sig["entry"])
        rr_ratio = round(reward / risk, 2) if risk > 0 else 0.0

        # Adjust timestamps slightly per signal so they look natural
        sig_time = now - timedelta(minutes=(idx * 4))
        iso_timestamp = sig_time.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # TTL is 24 hours from creation (Unix epoch timestamp)
        ttl_timestamp = int(time.time() + (24 * 3600) - (idx * 240))

        # Format DynamoDB item
        item = {
            "PK": f"TICKER#{sig['ticker']}",
            "SK": f"SIGNAL#{iso_timestamp}",
            "signal_type": sig["type"],
            "confidence_score": dec(sig["conf"]),
            "entry_price": dec(sig["entry"]),
            "stop_loss": dec(sig["sl"]),
            "target_price": dec(sig["tgt"]),
            "risk_reward": dec(rr_ratio),
            "market": sig["market"],
            "ttl": dec(ttl_timestamp),
            "created_at": iso_timestamp
        }

        # Write item
        try:
            table.put_item(Item=item)
            print(f" Successfully seeded {sig['ticker']} ({sig['type']}) - Confidence: {sig['conf']}%")
        except Exception as e:
            print(f"❌ Failed to seed {sig['ticker']}: {e}")

if __name__ == "__main__":
    seed_data()
