# Wheelztracker WhatsApp Lead Agent

Production-ready WhatsApp agent that converts inbound messages into **paid GPS device installations** for [Wheelztracker](https://github.com/nabithra/whatsapp-lead-agent) — GPS tracking for vehicles in India (₹2,999 per install).

## What it does

1. Customer messages on **WhatsApp** (Twilio)
2. **Priya** (AI sales assistant) qualifies the lead — vehicle type, number, city
3. On confirmation, sends a **Razorpay** payment link (₹2,999)
4. On payment, updates lead status and sends install scheduling message
5. Ops team monitors leads on a **dashboard**

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (`pg`, raw SQL) |
| WhatsApp | Twilio WhatsApp Business API |
| Payments | Razorpay payment links |
| AI | OpenRouter — `openai/gpt-4o-mini` |
| Orchestration | Composio (Twilio + Razorpay tools) |
| UI | Tailwind CSS |
| Deploy | Railway-ready |

## Architecture

```
WhatsApp → /api/whatsapp-webhook → Agent (OpenRouter)
              ↓
         Composio orchestrator → Twilio / Razorpay
              ↓
         PostgreSQL (leads, messages, logs)
              ↓
         /dashboard
```

## Quick start

### Prerequisites

- Node.js 18+
- PostgreSQL
- [Twilio](https://www.twilio.com/) (WhatsApp Sandbox or Business)
- [Razorpay](https://razorpay.com/) account
- [OpenRouter](https://openrouter.ai/) API key
- [Composio](https://app.composio.dev/) API key (recommended)
- [ngrok](https://ngrok.com/) for local webhook testing

### 1. Clone and install

```bash
git clone https://github.com/nabithra/whatsapp-lead-agent.git
cd whatsapp-lead-agent
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | e.g. `whatsapp:+14155238886` |
| `RAZORPAY_KEY_ID` | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `COMPOSIO_API_KEY` | Composio API key (optional; SDK fallback if missing) |
| `COMPOSIO_USER_ID` | Default: `wheelztracker_agent` |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | App URL (e.g. `http://localhost:3000`) |

### 3. Database

```bash
psql $DATABASE_URL -f migrations/001_create_leads_table.sql
```

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

### 5. Twilio webhook (local)

```bash
ngrok http 3000
```

In Twilio Console → WhatsApp Sandbox → set **When a message comes in**:

```
https://YOUR_NGROK_URL/api/whatsapp-webhook
```

Method: **POST**

## Test conversation

Send these WhatsApp messages in order:

1. `Hi I want to buy GPS tracker`
2. `Car`
3. `TN09 AB 1234`
4. `Chennai`
5. `Yes I want to proceed`

You should receive a Razorpay payment link. Check http://localhost:3000/dashboard

More detail: [TEST_GUIDE.md](./TEST_GUIDE.md)

## API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/whatsapp-webhook` | POST | Twilio inbound messages |
| `/api/razorpay-webhook` | GET | Payment success callback |
| `/api/dashboard` | GET | Leads JSON API |

## Lead statuses

`new` → `talking` → `payment_sent` → `paid` | `lost`

## Project structure

```
app/
  api/whatsapp-webhook/   # Twilio webhook
  api/razorpay-webhook/   # Payment callback
  api/dashboard/          # Leads API
  dashboard/              # UI
lib/
  agent.ts                # Conversation logic
  orchestrator.ts         # Composio entry point
  composio.ts             # Composio client + sessions
  openrouter.ts           # AI (Priya)
  twilio.ts               # WhatsApp send
  razorpay.ts             # Payment links
  db.ts                   # PostgreSQL
migrations/
  001_create_leads_table.sql
```

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
```

## Deploy (Railway)

1. Connect repo to Railway
2. Add PostgreSQL plugin → set `DATABASE_URL`
3. Add all env vars from `.env.example`
4. Run migration against production DB
5. Set `NEXT_PUBLIC_APP_URL` to your Railway URL
6. Point Twilio webhook to `https://your-app.up.railway.app/api/whatsapp-webhook`

## Cost optimization

Conversations use **OpenRouter** with **`gpt-4o-mini`** instead of GPT-4o — lower token cost per lead with the same qualification flow.

## Security notes

- Never commit `.env.local`
- Dashboard API has no auth — use only internally or add auth before public deploy
- Webhook signature verification (Twilio/Razorpay) not implemented yet

## License

Private — Wheelztracker

---
