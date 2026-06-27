import { NextResponse } from "next/server";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

export const dynamic = "force-dynamic";


// Initialize the DynamoDB Client
const awsConfig: any = {
  region: process.env.AWS_REGION || "us-east-1",
};

// Only attach explicit credentials if they are defined in env. 
// Otherwise, the SDK will automatically check IAM roles (Vercel/AWS environments).
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  awsConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const client = new DynamoDBClient(awsConfig);
const docClient = DynamoDBDocumentClient.from(client);

// Helper to compute relative time from ISO timestamp
function getRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } catch (e) {
    return "Just now";
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const marketParam = searchParams.get("market") || "all";
    const typeParam = searchParams.get("type"); // Optional: BUY | SELL | HOLD
    const minConfidenceParam = searchParams.get("minConfidence"); // Optional
    const tickersParam = searchParams.get("tickers"); // Optional: e.g. "AAPL,RELIANCE.BO"
    
    const minConfidence = minConfidenceParam ? parseInt(minConfidenceParam, 10) : 0;
    const tableName = process.env.DYNAMODB_TABLE_NAME || "alphaline-signals";

    let dbItems: any[] = [];

    if (tickersParam) {
      const tickers = tickersParam.split(",").map(t => t.trim().toUpperCase()).filter(Boolean);
      const queryPromises = tickers.map(async (ticker) => {
        const queryParams = {
          TableName: tableName,
          KeyConditionExpression: "PK = :pk",
          ExpressionAttributeValues: {
            ":pk": `TICKER#${ticker}`,
          },
          ScanIndexForward: false, // Descending SK to get latest signal
          Limit: 1,
        };
        const res = await docClient.send(new QueryCommand(queryParams));
        return res.Items?.[0];
      });
      const queryResults = await Promise.all(queryPromises);
      dbItems = queryResults.filter(Boolean);
    } else if (marketParam.toLowerCase() !== "all" && marketParam.trim() !== "") {
      // 1. QUERY GSI (confidence-index)
      // PK: market (String)
      // SK: confidence_score (Number)
      
      const queryParams: any = {
        TableName: tableName,
        IndexName: "confidence-index",
        KeyConditionExpression: "market = :m",
        ExpressionAttributeValues: {
          ":m": marketParam.toUpperCase(),
        },
        ScanIndexForward: false, // Sort descending by confidence_score (SK)
      };

      // Add sort key condition if minConfidence is specified
      if (minConfidence > 0) {
        queryParams.KeyConditionExpression = "market = :m AND confidence_score >= :minConf";
        queryParams.ExpressionAttributeValues[":minConf"] = minConfidence;
      }

      // Add filter expression if signal_type is specified
      if (typeParam) {
        queryParams.FilterExpression = "signal_type = :t";
        queryParams.ExpressionAttributeValues[":t"] = typeParam.toUpperCase();
      }

      const response = await docClient.send(new QueryCommand(queryParams));
      dbItems = response.Items || [];
    } else {
      // 2. SCAN table (cross-partition search for 'All' markets)
      const scanParams: any = {
        TableName: tableName,
      };

      const filterConditions: string[] = [];
      const expressionAttributeValues: any = {};

      if (minConfidence > 0) {
        filterConditions.push("confidence_score >= :minConf");
        expressionAttributeValues[":minConf"] = minConfidence;
      }

      if (typeParam) {
        filterConditions.push("signal_type = :t");
        expressionAttributeValues[":t"] = typeParam.toUpperCase();
      }

      if (filterConditions.length > 0) {
        scanParams.FilterExpression = filterConditions.join(" AND ");
        scanParams.ExpressionAttributeValues = expressionAttributeValues;
      }

      const response = await docClient.send(new ScanCommand(scanParams));
      dbItems = response.Items || [];
      
      const tickerMap = new Map<string, any>();
      dbItems.forEach(item => { const t = item.PK?.replace(/^TICKER#/,'') || ''; if (!tickerMap.has(t) || item.SK > tickerMap.get(t).SK) tickerMap.set(t, item); });
      dbItems = Array.from(tickerMap.values());
      dbItems.sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0));
    }

    // Map DynamoDB attributes to frontend props
    const formattedSignals = dbItems.map((item) => {
      // Extract ticker from PK (e.g. "TICKER#RELIANCE.NS" -> "RELIANCE.NS")
      const ticker = item.PK ? item.PK.replace(/^TICKER#/, "") : "UNKNOWN";
      
      return {
        id: item.PK + "_" + item.SK, // Unique ID
        ticker: ticker,
        market: item.market || "NSE",
        signalType: item.signal_type || "BUY",
        confidence: item.confidence_score ? parseInt(item.confidence_score, 10) : 50,
        entry: item.entry_price ? parseFloat(item.entry_price) : 0,
        stopLoss: item.stop_loss ? parseFloat(item.stop_loss) : 0,
        target: item.target_price ? parseFloat(item.target_price) : 0,
        timestamp: item.created_at ? getRelativeTime(item.created_at) : "Just now",
      };
    });

    // Limit to max 20 results
    const limitedSignals = formattedSignals.slice(0, 20);

    return NextResponse.json({ success: true, signals: limitedSignals });
  } catch (error: any) {
    console.error("DynamoDB API Route Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch signals" },
      { status: 500 }
    );
  }
}
