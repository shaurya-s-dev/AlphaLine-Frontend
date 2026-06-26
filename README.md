# Alphaline - AI-Powered Trading Signals Platform

Built for the **H0 Hackathon**, Alphaline is a premium, real-time trading signals platform designed for retail traders and fintech integrations. It uses Next.js 14 App Router, FastAPI, AWS DynamoDB, and Supabase Auth, combined with a serverless real-time pipeline powered by DynamoDB Streams.

---

## 🏗️ Architecture Pitch: DynamoDB-Native Real-Time Engine

Alphaline operates on a **DynamoDB-native single-table architecture** designed for high throughput, predictable sub-millisecond latencies, and serverless scalability. 

Rather than querying a relational database with expensive JOINs, Alphaline pre-computes indicators (RSI, volume delta, momentum) on a FastAPI microservice, generates signals, and saves them to a structured table. To deliver these signals in real time without holding WebSockets open on expensive, stateful application servers, Alphaline uses a serverless event-driven pipeline:

```
                                    +-----------------------+
                                    |   FastAPI Seeder      | (Cron / Batch Process)
                                    +-----------+-----------+
                                                |
                                                v Writes signals
                                    +-----------+-----------+
                                    |    AWS DynamoDB       | (alphaline-signals table)
                                    +-----------+-----------+
                                                |
                                                v Triggers Stream
                                    +-----------+-----------+
                                    |  DynamoDB Stream      | (New Image Only)
                                    +-----------+-----------+
                                                |
                                                v Lambda Trigger
                        +-----------------------+-----------------------+
                        |                                               |
                        v Connect / Disconnect                          v Insert Event
            +-----------+-----------+                       +-----------+-----------+
            | alphaline-connection  |                       |  alphaline-stream     |
            |      handler          |                       |     processor         |
            +-----------+-----------+                       +-----------+-----------+
                        |                                               |
                        v Writes Connections                            v Push to API GW
            +-----------+-----------+                                   |
            |    AWS DynamoDB       |                                   |
            | (alphaline-connect)   |<----------------------------------+
            +-----------------------+ Scans active clients
                                                |
                                                v Broadcasts payloads
                                    +-----------+-----------+
                                    |  API Gateway WebSocket|
                                    +-----------+-----------+
                                                |
                                                v Active Socket Frame
                                    +-----------+-----------+
                                    |    Next.js Client     | (Flashes LIVE update)
                                    +-----------------------+
```

### Serverless Real-Time Pipeline Advantages:
* **Zero Idle Server Cost**: API Gateway handles WebSocket connection states and frame transfers. Lambda functions only spin up to handle connection events and stream records, keeping operations inside the AWS Free Tier.
* **Resilient Client Syncing**: Next.js automatically maintains a WebSocket frame handler. If disconnected, it shifts to a 60-second HTTP polling fallback until the connection is restored.
* **Single-Table Predictability**: By leveraging Global Secondary Indexes (GSIs), both market feeds and individual tickers are queried in sub-millisecond response times.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14 (App Router) | Server-side rendering, API routes, layout management |
| **Styling** | Tailwind CSS + Vanilla CSS | Custom HSL color system, premium glassmorphism themes |
| **Auth** | Supabase Auth (Client & SSR) | Secure registration, login, and dashboard route middleware |
| **Backend** | FastAPI + uvicorn | Signal generator, indicator compute pipelines |
| **Database** | AWS DynamoDB | High-performance single-table signal storage |
| **Real-time** | DynamoDB Streams + Lambda + API Gateway WS | Serverless real-time event distribution |
| **Compute** | AWS Elastic Beanstalk (Docker) | Containerized deployment environment for FastAPI |

---

## 📊 DynamoDB single-table Schema Design

Alphaline uses a single-table design (`alphaline-signals`) to store all market data, active confluences, and historical logs.

### Primary Keys & Structure

* **Table Partition Key (PK)**: `TICKER#{ticker}` (e.g. `TICKER#AAPL`, `TICKER#RELIANCE.NS`)
* **Table Sort Key (SK)**: `SIGNAL#{iso_timestamp}` (e.g. `SIGNAL#2026-06-26T12:00:00Z`)

### Table Attributes

| Attribute Name | Data Type | Description |
| :--- | :--- | :--- |
| `PK` | String | Partition Key (`TICKER#{ticker}`) |
| `SK` | String | Sort Key (`SIGNAL#{timestamp}`) |
| `market` | String | Region market code (`NSE`, `BSE`, `US`) |
| `signal_type` | String | Engine trade recommendation (`BUY`, `SELL`, `HOLD`) |
| `confidence_score` | Number | AI confluence weight matching percentage (`50` to `90`) |
| `entry_price` | Number | Calculated ideal entry level |
| `stop_loss` | Number | Position invalidation protective stop level |
| `target_price` | Number | Take-profit projection level |
| `risk_reward` | Number | Calculated risk-to-reward ratio multiplier (e.g. `2.1`) |
| `created_at` | String | ISO-8601 creation timestamp |
| `ttl` | Number | Unix epoch expiration timestamp (e.g. 7 days retention) |

### Global Secondary Indexes (GSIs)

#### 1. `confidence-index`
* **Partition Key**: `market` (String)
* **Sort Key**: `confidence_score` (Number)
* **Purpose**: Allows the frontend dashboard to fetch signals filtered by market region (e.g. NSE, US) sorted descending by confidence, using a single `QueryCommand` without expensive tables scans.

---

## 🚀 Setup & Installation

### Prerequisites
* Node.js v18+
* Python 3.10+
* AWS CLI configured with credentials
* Supabase Account & Database

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/shaurya-s-dev/AlphaLine.git
cd AlphaLine

# Install Next.js frontend dependencies
npm install

# Install FastAPI backend dependencies
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root folder for Next.js, and a `backend/.env` file in the backend folder.

#### Frontend `.env.local`
```ini
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-secret-access-key>
DYNAMODB_TABLE_NAME=alphaline-signals

NEXT_PUBLIC_WS_URL=wss://<your-api-gateway-ws-url>/production
```

#### Backend `backend/.env`
```ini
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-secret-access-key>
DYNAMODB_TABLE_NAME=alphaline-signals
```

### 3. Run Locally

#### Run Next.js Frontend:
```bash
# In the root folder
npm run dev
```

#### Run FastAPI Backend:
```bash
# In the backend/ folder
uvicorn main:app --reload --port 8000
```

---

## 📸 Screenshots

*Placeholder for dashboard and backtesting interface screenshots*

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE details.
