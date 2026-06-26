# Alphaline — Project Brief
**Hackathon:** H0 — Hack the Zero Stack (Vercel v0 + AWS Databases)
**Deadline:** June 30, 2026 @ 5:30 AM IST
**Track:** Track 4 — Open Innovation
**Prize Target:** Best Overall / Most Innovative Use of AWS Databases

---

## One-Line Pitch
The first trading signal engine architected natively on DynamoDB — delivering institutional-grade AI confluence signals to retail traders and fintechs across NSE/BSE and US markets.

---

## The Problem
200M+ retail traders in India (Zerodha, Groww, Upstox users) make buy/sell decisions based on WhatsApp tips and gut feel. Institutional-grade quant signals exist — but only for firms with $10M+ in infrastructure. On the other side, fintechs building trading features need a signal API, but none exists for Indian markets at reasonable cost.

**Three layers of pain:**
1. Retail traders have no reliable signal source for NSE/BSE stocks
2. Fintechs can't embed trading intelligence without building it from scratch
3. Existing platforms (QuantConnect, Trade Ideas) are US-only, require coding knowledge, and cost $300+/month

---

## The Solution — Alphaline

A DynamoDB-native AI signal platform with two interfaces:

**For Retail Traders (B2C)**
- Real-time BUY/SELL/HOLD signals for NSE/BSE + US equities
- Confluence scoring: XGBoost model combining RSI, volume, momentum, sector trend
- Risk management: auto stop-loss and position sizing per signal
- Historical accuracy dashboard per signal type

**For Fintechs (B2B API)**
- REST API: `/signals`, `/watchlist`, `/backtest`
- Webhook delivery via DynamoDB Streams
- Pay-per-call or subscription pricing

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 + Tailwind CSS | Vercel-native, instant deploy |
| Backend | FastAPI (Python) | XGBoost inference, async endpoints |
| Database | AWS DynamoDB | Time-series tick data, variable schemas per stock |
| ML Model | XGBoost | Already trained from trading dashboard project |
| Auth | Supabase Auth | Fast setup, JWT compatible |
| Hosting | Vercel | Edge functions, global CDN |
| Real-time | DynamoDB Streams → Lambda → WebSocket | Live signal push |

---

## Why DynamoDB — The Core Argument

DynamoDB is architecturally correct for this problem, not just a hackathon requirement:

- **High write throughput:** Tick data arrives every second across thousands of tickers — DynamoDB handles millions of writes/sec without ops overhead
- **Time-series composite keys:** `PK = TICKER#RELIANCE | SK = SIGNAL#2026-06-26T10:30:00Z` enables range queries across any time window in O(1)
- **Variable schemas:** US equities have different indicator sets than NSE stocks — schemaless storage handles this without migrations
- **DynamoDB Streams:** Any new BUY signal written to the table can instantly trigger a webhook to API customers via Lambda — zero polling, real-time delivery
- **GSI for confidence filtering:** Global Secondary Index on `confidence_score` lets clients query "show me only signals above 80% confidence" in milliseconds

This is the story judges from AWS want to hear.

---

## Originality Angle

Framed correctly, this is **"Stripe for trading signals"** — infrastructure that any fintech embeds, not another trading app. The DynamoDB-native architecture is genuinely novel in this space. Existing players bolt on a database as an afterthought. Alphaline's data model is the product.

---

## Business Model

| Tier | Price | Features |
|---|---|---|
| Free | ₹0 / $0 | 5 signals/day, 3 tickers, delayed 15 min |
| Pro | ₹999 / $12/mo | Unlimited signals, real-time, risk tools |
| API | $0.001/call | B2B: full signal API + webhooks |

---

## 9-Day Build Plan Summary

| Days | Milestone |
|---|---|
| 1–2 | DynamoDB schema + FastAPI scaffold + Next.js setup |
| 3–4 | XGBoost signal engine + seeded mock data |
| 5–6 | Dashboard UI (signal cards, charts, confidence bars) |
| 7 | Backtesting view + risk management panel |
| 8 | API docs + webhook demo + Stripe mock |
| 9 | Polish, demo video, submission |

---

## Submission Checklist
- [ ] Public GitHub repo
- [ ] Vercel deployment URL live
- [ ] DynamoDB table in AWS (not local)
- [ ] Demo video (3 minutes max)
- [ ] Written description with DynamoDB architecture explanation
- [ ] At least 1 working API endpoint documented
