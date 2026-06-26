import boto3
import os
from decimal import Decimal
from models.signal import Signal

def write_signal(signal: Signal) -> bool:
    """
    Writes a validated Signal object to the DynamoDB table.
    Converts numeric floats to Decimals as required by boto3.
    """
    try:
        region = os.environ.get("AWS_REGION", "us-east-1")
        table_name = os.environ.get("DYNAMODB_TABLE_NAME", "alphaline-signals")
        
        # Initialize boto3 DynamoDB resource
        dynamodb = boto3.resource("dynamodb", region_name=region)
        table = dynamodb.Table(table_name)
        
        # Prepare item dictionary matching the schema
        item = {
            "PK": f"TICKER#{signal.ticker}",
            "SK": f"SIGNAL#{signal.created_at}",
            "signal_type": signal.signal_type,
            "confidence_score": Decimal(str(signal.confidence_score)),
            "entry_price": Decimal(str(signal.entry_price)),
            "stop_loss": Decimal(str(signal.stop_loss)),
            "target_price": Decimal(str(signal.target_price)),
            "risk_reward": Decimal(str(signal.risk_reward)),
            "market": signal.market,
            "ttl": Decimal(str(signal.ttl)),
            "created_at": signal.created_at
        }
        
        table.put_item(Item=item)
        return True
    except Exception as e:
        print(f"Error writing to DynamoDB for ticker {signal.ticker}: {e}")
        return False
