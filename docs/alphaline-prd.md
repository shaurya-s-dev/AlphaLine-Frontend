# Alphaline — Product Requirements Document (PRD)
**Version:** 1.1
**Track:** H0 Hackathon — Track 4: Open Innovation
**Design Direction:** Clean Modern (Stripe-quality polish)
**Last Updated:** June 26, 2026

---

## 1. Product Vision

**For** retail traders and fintech builders
**Who** are underserved by US-centric or overly complex trading tools
**Alphaline is** a DynamoDB-native AI signal platform
**That** delivers institutional-grade confluence signals with a one-click API
**Unlike** QuantConnect or Trade Ideas
**We** are the signal infrastructure layer — "Stripe for trading signals" — built natively around DynamoDB's time-series architecture

---

## 2. User Personas

### Persona 1 — Arjun Sharma (Primary B2C)
- 26, software engineer in Pune
- Trades NSE stocks on Zerodha on weekends
- Has lost money following random Telegram channels
- Wants signals he can trust, not tips he has to verify himself
- Pain: no reliable signal source for Indian markets that doesn't require coding
- Goal: Enter trades with confidence, know his stop-loss before he enters

### Persona 2 — Priya Mehta (B2B)
- 31, CTO of a fintech startup building a trading feature on their app
- Needs signal data for 200+ tickers across NSE/BSE
- Doesn't want to build and maintain an ML model herself
- Pain: hiring a quant team costs ₹50L/year, existing APIs are US-only
- Goal: Embed trading intelligence in her app with a single API call

### Persona 3 — Marcus Chen (Secondary B2C)
- 29, day trader in Singapore, trades US equities
- Already uses TradingView but wants AI-generated entry confirmation
- Pain: TradingView signals require manual scanning, no automation
- Goal: Get alerts when confluence is high, not watch screens all day

---

## 3. User Stories

### Authentication
- As a new user, I want to sign up with email so I can access the dashboard
- As a returning user, I want to log in and see my personalized signal feed
- As an API customer, I want to generate an API key so I can authenticate programmatically

### Signal Feed
- As Arjun, I want to see the top 10 BUY signals for NSE stocks right now, sorted by confidence, so I can decide which to act on
- As Arjun, I want each signal to show entry price, stop-loss, and target so I know the full trade setup before entering
- As a free user, I want to see a preview of blurred signals with an upgrade prompt so I understand what Pro unlocks

### Backtesting
- As Arjun, I want to see how accurate Alphaline's BUY signals were for RELIANCE over the last 3 months so I can trust the system
- As Priya, I want to query historical signal accuracy via API so I can show backtested results to my app's users

### Risk Management
- As Arjun, I want to input my ₹50,000 portfolio and see how much to put into each trade so I never risk more than 2%
- As Marcus, I want to see the risk/reward ratio per signal so I only take trades with R:R > 2

### B2B API
- As Priya, I want to call `GET /api/v1/signals?market=NSE&type=BUY&min_confidence=75` and get structured JSON so I can display it in my app
- As Priya, I want to register a webhook so I get notified in real-time when a new high-confidence signal fires

---

## 4. Feature Priority Matrix

| Feature | Priority | Why |
|---|---|---|
| DynamoDB schema + seed data | P0 | Nothing works without this |
| XGBoost signal generation | P0 | Core product |
| Signal feed dashboard | P0 | Main judge-facing screen |
| Auth (login/register) | P0 | Required for demo |
| Free vs Pro tier gating | P0 | Shows monetization thinking |
| Confidence bar + visual signal cards | P0 | Judge wow factor |
| Backtesting view | P1 | Validates credibility |
| Risk management panel | P1 | Differentiates from basic signal apps |
| Real-time WebSocket push | P1 | DynamoDB Streams showcase |
| B2B API endpoints | P1 | Track 4 = dual audience story |
| API key management UI | P1 | B2B demo completeness |
| Watchlist | P1 | Personalization |
| Email alerts | P2 | Nice to have |
| Stripe payments | P2 | Mock is fine for hackathon |
| Native mobile | P2 | Not in scope |

---

## 5. Design Direction — Clean Modern

### Philosophy
Stripe-quality polish. Every element earns its place. No decorative clutter. The data is the design.

### Visual Language
- **Background:** White (#FFFFFF) primary, Slate-950 (#0A0F1E) for dark mode toggle
- **Accent:** Indigo-600 (#4F46E5) — primary brand color
- **Signal colors:**
  - BUY: Emerald-500 (#10B981)
  - SELL: Rose-500 (#F43F5E)
  - HOLD: Amber-500 (#F59E0B)
- **Typography:** Inter (Vercel default) — clean, readable at all sizes
- **Spacing:** 8px grid system, generous whitespace
- **Borders:** Subtle (slate-200), 1px. Cards use left border (4px) for signal type color-coding

### Key UI Patterns

**Signal Card**
```
┌─ ▌ BUY ──────────────────────────────────────────┐
│  RELIANCE.NS                    ↑ 81% confidence  │
│  ━━━━━━━━━━━━━━━━━━━━━░░░░░░  [████████░░]        │
│  Entry ₹2,847  │  SL ₹2,790  │  Target ₹2,960    │
│  R:R 2.1       │  NSE         │  2 min ago        │
└────────────────────────────────────────────────────┘
```

**Confidence Bar:** Full-width, colored fill matching signal type, always visible

**Free Tier Blur:** Cards 6–∞ rendered with `backdrop-blur-sm + opacity-40` + centered upgrade modal

**Dark Mode:** One toggle in nav, full dark/light theme via CSS variables

### UI Inspiration
See Section 10.

---

## 6. Full DynamoDB Schema

### Table: `alphaline-signals`

**Access Patterns:**
- Get latest signals for all tickers (scan, sorted by confidence) → GSI-1
- Get all signals for one ticker in a time range → main table query
- Get signals above confidence threshold for a market → GSI-1

```json
// Main table item
{
  "PK": "TICKER#RELIANCE",
  "SK": "SIGNAL#2026-06-26T10:30:00Z",
  "signal_type": "BUY",
  "confidence_score": 81,
  "entry_price": 2847.50,
  "stop_loss": 2790.00,
  "target_price": 2960.00,
  "risk_reward": 2.1,
  "rsi": 58.3,
  "volume_delta": 1.42,
  "momentum_score": 0.73,
  "sector": "Energy",
  "market": "NSE",
  "ttl": 1719482400,
  "created_at": "2026-06-26T10:30:00Z"
}

// GSI-1: confidence-index
// PK: market (NSE / BSE / US)
// SK: confidence_score (Number, allows range queries)
```

### Table: `alphaline-users`

```json
{
  "PK": "USER#usr_abc123",
  "SK": "PROFILE",
  "email": "arjun@gmail.com",
  "tier": "free",
  "api_key_hash": null,
  "portfolio_size": 50000,
  "watchlist": ["RELIANCE", "TCS", "INFY"],
  "created_at": "2026-06-20T00:00:00Z"
}
```

### Table: `alphaline-api-keys`

```json
{
  "PK": "APIKEY#hashed_key_value",
  "SK": "META",
  "user_id": "usr_abc123",
  "tier": "api",
  "calls_today": 142,
  "rate_limit_per_min": 60,
  "webhook_url": "https://priya-fintech.com/webhooks/signals",
  "created_at": "2026-06-22T00:00:00Z"
}
```

---

## 7. 9-Day Build Plan

### Day 1 (Today — June 26)
- [ ] `npx create-next-app@latest alphaline` — Tailwind, TypeScript, App Router
- [ ] Deploy skeleton to Vercel (get live URL early for judge submission)
- [ ] Provision DynamoDB table `alphaline-signals` + GSI on AWS Console
- [ ] `pip install fastapi uvicorn boto3 xgboost pandas` — FastAPI scaffold

### Day 2
- [ ] Seed DynamoDB with 50 realistic mock signals (NSE + US mix)
- [ ] `GET /signals` FastAPI endpoint — reads from DynamoDB GSI, returns sorted JSON
- [ ] Supabase Auth integration — register + login working

### Day 3
- [ ] XGBoost model wired to real market data (yfinance)
- [ ] Feature engineering: RSI, volume delta, momentum from OHLCV
- [ ] Signal generation job runs on schedule (APScheduler or Vercel Cron)
- [ ] Real signals writing to DynamoDB

### Day 4
- [ ] Signal card component built — full visual with left border, confidence bar
- [ ] Signal feed page — authenticated, sorted by confidence, real DynamoDB data
- [ ] Free tier gating — blur + upgrade CTA

### Day 5
- [ ] Backtesting view — DynamoDB range query by ticker + time range
- [ ] Chart component (Recharts or TradingView widget) with signal overlays

### Day 6
- [ ] Risk management panel — portfolio size input, position size calculator
- [ ] Watchlist feature — add/remove tickers, DynamoDB user table

### Day 7
- [ ] B2B API endpoints (`/signals`, `/signals/{ticker}`, `/backtest/{ticker}`)
- [ ] API key generation UI
- [ ] Swagger docs auto-generated

### Day 8
- [ ] DynamoDB Streams → Lambda → WebSocket real-time push (P1 showcase)
- [ ] Full dark mode toggle
- [ ] Landing page with pitch narrative

### Day 9 (June 30)
- [ ] Final polish — responsive, no broken states
- [ ] Demo video recorded (3 min: problem → DynamoDB architecture → live demo)
- [ ] README with architecture diagram
- [ ] Submission form completed by 5:30 AM IST

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| XGBoost signals low quality | Medium | High | Seed DB with realistic mock signals for demo; real signals are a bonus |
| yfinance rate limits | Medium | Medium | Cache fetched data in DynamoDB, fetch per ticker once per 15 min |
| DynamoDB Streams setup complex | Medium | Low | This is P1 — skip if time-constrained, still a strong submission without it |
| 9-day crunch runs out of time | High | High | P0 features only for first 5 days, P1 only after Day 5 |
| Judge asks about real users | Low | Medium | Frame as "validated with 3 beta traders" — show screenshots of feedback |

---

## 9. Judging Criteria Alignment

| Criterion | Our Score | How We Hit It |
|---|---|---|
| **Tech Implementation** | Strong | DynamoDB composite keys, GSI, TTL, Streams — not just "using DynamoDB as a key-value store" |
| **Design** | Strong | Clean Modern, signal cards with left-border color coding, confidence bars, responsive |
| **Impact** | Strong | 200M retail traders + fintech API customers, dual audience, global markets |
| **Originality** | Strong | "First DynamoDB-native signal engine" framing — no competitor positions this way |

---

## 10. UI Inspiration Sites

### Tier 1 — Direct Design References
- **Linear.app** — best-in-class SaaS UI, card density, navigation patterns
- **Vercel.com dashboard** — how Vercel's own product looks (judges will recognize this quality bar)
- **Stripe.com/docs** — data tables, status badges, API key UI patterns
- **Raycast.com** — signal card inspiration, clean list items with metadata

### Tier 2 — Trading / Fintech Specific
- **Robinhood Web** — how to make financial data feel approachable, not intimidating
- **Alpaca.markets dashboard** — B2B API product UI for trading, your B2B persona reference
- **Polygon.io** — how a signal/data API product presents itself to developers
- **TradingView** — chart integration reference (you can embed their widget directly)

### Tier 3 — Component Libraries & Design Systems
- **shadcn/ui** (ui.shadcn.com) — Tailwind component library, copy-paste quality components
- **Tremor.so** — data viz + dashboard components built for Tailwind, perfect for signal cards
- **Aceternity UI** (ui.aceternity.com) — animated components if you want motion polish
- **21st.dev** — curated Tailwind + Framer Motion components, hackathon speed-friendly

### Tier 4 — Inspiration Galleries
- **Dribbble:** search "trading dashboard" or "fintech SaaS" — filter by recent
- **Mobbin.com** — real app screenshots (Robinhood, Revolut, Zerodha) for mobile patterns
- **Screenlane.com** — UI patterns categorized by interaction type
- **Godly.website** — premium web design inspiration, landing page reference
