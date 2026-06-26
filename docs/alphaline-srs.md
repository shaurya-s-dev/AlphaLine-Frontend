# Alphaline — Software Requirements Specification (SRS)
**Version:** 1.1
**Track:** H0 Hackathon — Track 4: Open Innovation
**Last Updated:** June 26, 2026

---

## 1. Introduction

### 1.1 Purpose
This document defines the functional and non-functional requirements for Alphaline — a DynamoDB-native AI trading signal platform serving retail traders and fintech businesses across NSE/BSE and US equity markets.

### 1.2 Scope
Alphaline is a full-stack web application and REST API that:
- Generates BUY/SELL/HOLD signals via an XGBoost ML model
- Stores and serves time-series signal data from AWS DynamoDB
- Delivers real-time signals via DynamoDB Streams → Lambda → WebSocket
- Provides a B2C dashboard and B2B API surface

### 1.3 Definitions
| Term | Definition |
|---|---|
| Signal | An AI-generated BUY/SELL/HOLD recommendation for a ticker at a point in time |
| Confluence Score | 0–100 confidence metric combining RSI, volume, momentum, and sector trend |
| Tick | A single price update for a trading instrument |
| GSI | DynamoDB Global Secondary Index |
| Stream | DynamoDB Streams — change feed triggered on table writes |

---

## 2. Overall Description

### 2.1 Product Perspective
Alphaline is a standalone SaaS platform. It interfaces with:
- Market data providers (Yahoo Finance API / Alpha Vantage for MVP)
- AWS DynamoDB for all persistent storage
- Vercel Edge Network for frontend delivery
- FastAPI backend for ML inference and business logic

### 2.2 User Classes

| User Class | Description | Primary Interface |
|---|---|---|
| Retail Trader | Individual using signals for personal trades | Web dashboard |
| Free User | Retail trader on free tier (limited signals) | Web dashboard |
| Pro User | Paid retail trader (full access) | Web dashboard |
| Fintech Partner | Company embedding signals via API | REST API |
| Admin | Internal team managing models and data | Admin panel (P2) |

### 2.3 Operating Environment
- Frontend: Modern browsers (Chrome 120+, Safari 17+, Firefox 120+)
- Backend: Python 3.11+, FastAPI, deployed on Vercel Serverless Functions
- Database: AWS DynamoDB (us-east-1 primary)
- Mobile: Responsive web (no native app in v1)

---

## 3. Functional Requirements

### 3.1 Authentication (FR-AUTH)

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-01 | Users can register with email + password | P0 |
| FR-AUTH-02 | Users can log in with email + password | P0 |
| FR-AUTH-03 | JWT token issued on login, valid 7 days | P0 |
| FR-AUTH-04 | OAuth via Google (optional fast registration) | P1 |
| FR-AUTH-05 | API key generation for B2B users | P1 |
| FR-AUTH-06 | Rate limiting per API key (calls/minute) | P1 |

### 3.2 Signal Generation (FR-SIG)

| ID | Requirement | Priority |
|---|---|---|
| FR-SIG-01 | System fetches OHLCV data for configured tickers on schedule (15-min intervals) | P0 |
| FR-SIG-02 | XGBoost model computes BUY/SELL/HOLD classification | P0 |
| FR-SIG-03 | Confluence score (0–100) computed from RSI, volume, momentum, sector trend | P0 |
| FR-SIG-04 | Signal written to DynamoDB with PK=`TICKER#<symbol>` SK=`SIGNAL#<ISO timestamp>` | P0 |
| FR-SIG-05 | Entry price, stop-loss, and target price computed per signal | P0 |
| FR-SIG-06 | Risk/reward ratio calculated and stored | P0 |
| FR-SIG-07 | DynamoDB Stream triggers Lambda on new signal write → pushes to WebSocket | P1 |
| FR-SIG-08 | Signals expire after 24 hours (TTL field set on write) | P1 |

### 3.3 Dashboard — Signal Feed (FR-DASH)

| ID | Requirement | Priority |
|---|---|---|
| FR-DASH-01 | Authenticated users see signal cards sorted by confidence desc | P0 |
| FR-DASH-02 | Each card shows: ticker, signal type, confidence bar, entry/SL/target, time | P0 |
| FR-DASH-03 | Left border color-codes signal type: green=BUY, red=SELL, amber=HOLD | P0 |
| FR-DASH-04 | Free tier: max 5 signals visible, rest blurred with upgrade CTA | P0 |
| FR-DASH-05 | Filter by market (NSE / BSE / US) | P1 |
| FR-DASH-06 | Filter by signal type (BUY / SELL / HOLD) | P1 |
| FR-DASH-07 | Filter by minimum confidence score | P1 |
| FR-DASH-08 | Real-time signal push without page refresh (WebSocket or SSE) | P1 |

### 3.4 Watchlist (FR-WATCH)

| ID | Requirement | Priority |
|---|---|---|
| FR-WATCH-01 | Users can add/remove tickers to personal watchlist | P1 |
| FR-WATCH-02 | Watchlist view shows compact signal row per ticker | P1 |
| FR-WATCH-03 | Watchlist stored in DynamoDB under user partition | P1 |
| FR-WATCH-04 | Email/push alert when a watchlist ticker gets a new signal | P2 |

### 3.5 Backtesting (FR-BACK)

| ID | Requirement | Priority |
|---|---|---|
| FR-BACK-01 | User selects ticker + date range | P1 |
| FR-BACK-02 | System queries DynamoDB GSI (by ticker, time range) and returns historical signals | P1 |
| FR-BACK-03 | Dashboard shows accuracy %, win rate, avg R:R for that ticker | P1 |
| FR-BACK-04 | Chart overlay: price line + signal markers (BUY/SELL arrows) | P1 |

### 3.6 Risk Management Panel (FR-RISK)

| ID | Requirement | Priority |
|---|---|---|
| FR-RISK-01 | User inputs portfolio size | P1 |
| FR-RISK-02 | System calculates suggested position size per signal (default: 2% risk per trade) | P1 |
| FR-RISK-03 | Risk/reward ratio displayed per signal | P1 |
| FR-RISK-04 | Total portfolio exposure shown if all current signals acted on | P2 |

### 3.7 B2B API (FR-API)

| ID | Requirement | Priority |
|---|---|---|
| FR-API-01 | `GET /api/v1/signals` — returns latest signals, filterable by market/type/confidence | P1 |
| FR-API-02 | `GET /api/v1/signals/{ticker}` — signals for specific ticker | P1 |
| FR-API-03 | `GET /api/v1/backtest/{ticker}` — historical signal performance | P1 |
| FR-API-04 | `POST /api/v1/watchlist/webhook` — register webhook URL for real-time delivery | P1 |
| FR-API-05 | API key authentication via `X-API-Key` header | P1 |
| FR-API-06 | OpenAPI/Swagger docs auto-generated | P1 |
| FR-API-07 | Rate limits enforced per API key tier | P1 |

---

## 4. Non-Functional Requirements

### 4.1 Performance
- Signal generation latency: < 2 seconds per ticker
- Dashboard initial load: < 1.5 seconds (Vercel Edge)
- DynamoDB read latency: < 10ms (single-digit ms typical)
- API response time: < 200ms (p95)

### 4.2 Scalability
- DynamoDB on-demand mode: auto-scales to any write volume without provisioning
- Vercel serverless: scales to 0 / scales up automatically
- FastAPI: deployed as Vercel Serverless Function

### 4.3 Security
- All API routes require valid JWT or API key
- HTTPS only (enforced by Vercel)
- DynamoDB access via IAM roles only (no hardcoded credentials)
- API keys hashed in DynamoDB, never stored plaintext
- Rate limiting on all public endpoints

### 4.4 Reliability
- DynamoDB SLA: 99.999% availability
- Vercel SLA: 99.99%
- Signal generation retries 3x on market data fetch failure

### 4.5 Maintainability
- XGBoost model weights stored as versioned artifact (S3 or repo)
- Feature engineering logic isolated in `services/features.py`
- DynamoDB access abstracted behind `db/dynamo.py` repository class

---

## 5. DynamoDB Schema — Core Tables

### Table: `alphaline-signals`

```
PK: TICKER#<symbol>          e.g. TICKER#RELIANCE
SK: SIGNAL#<ISO8601>         e.g. SIGNAL#2026-06-26T10:30:00Z

Attributes:
  signal_type: "BUY" | "SELL" | "HOLD"
  confidence_score: Number (0-100)
  entry_price: Number
  stop_loss: Number
  target_price: Number
  risk_reward: Number
  rsi: Number
  volume_delta: Number
  market: "NSE" | "BSE" | "US"
  ttl: Number (Unix timestamp, 24h from creation)
  
GSI-1: confidence-index
  PK: market
  SK: confidence_score
  (Query: "Top signals by confidence for NSE today")
```

### Table: `alphaline-users`

```
PK: USER#<user_id>
SK: PROFILE

Attributes:
  email: String
  tier: "free" | "pro" | "api"
  api_key_hash: String
  portfolio_size: Number
  watchlist: List<String>
  created_at: String
```

---

## 6. External Interfaces

### 6.1 Market Data
- **Yahoo Finance (yfinance)** — OHLCV data, free tier sufficient for MVP
- **Alpha Vantage** — backup source, 500 req/day free

### 6.2 Authentication
- **Supabase Auth** — JWT issuance, user management

### 6.3 Real-time Delivery
- **DynamoDB Streams** → **AWS Lambda** → **API Gateway WebSocket** → client

### 6.4 Payments (P2)
- **Stripe** or **Razorpay** for Pro tier upgrade

---

## 7. Constraints

- **9-day build window** — P2 features may not ship
- **Free-tier AWS** — DynamoDB on-demand, Lambda, minimum cost
- **No native mobile app** — responsive web only
- **Market data latency** — yfinance has 15-min delay on free tier (acceptable for MVP)
- **Hackathon rule** — all infrastructure must be on AWS + Vercel
