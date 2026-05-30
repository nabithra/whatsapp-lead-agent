# Wheelztracker Lead Agent — Test Guide

## Agent stack (rubric alignment)

| Layer | Role |
|-------|------|
| **Twilio** | WhatsApp inbound webhook + outbound messages |
| **Composio** | Orchestrates Twilio + Razorpay tool execution (with SDK fallback) |
| **Razorpay** | ₹2999 payment links → direct revenue |
| **OpenRouter** | `openai/gpt-4o-mini` — cheaper than GPT-4o for qualification chat |

## Prerequisites

- Node.js 18+
- PostgreSQL database running
- Twilio account with WhatsApp Sandbox enabled
- Razorpay test account
- OpenRouter API key
- Composio API key ([app.composio.dev](https://app.composio.dev))
- ngrok installed

## Setup

1. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in all values in `.env.local`.

2. Run database migration:
   ```bash
   psql $DATABASE_URL -f migrations/001_create_leads_table.sql
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Expose localhost with ngrok:
   ```bash
   ngrok http 3000
   ```

6. Configure Twilio WhatsApp Sandbox:
   - Go to Twilio Console → Messaging → Try it out → Send a WhatsApp message
   - Set "When a message comes in" webhook to:
     `https://YOUR_NGROK_URL/api/whatsapp-webhook`
   - Method: POST

7. Join the Twilio sandbox by sending the join code to the sandbox number from your WhatsApp.

8. **Composio (optional but recommended):**
   - Add `COMPOSIO_API_KEY` to `.env.local`
   - In Composio dashboard, connect **Razorpay** and **Twilio** auth configs (optional — custom tools fall back to your `.env` SDK keys)
   - Check `agent_logs` for `composio_send_whatsapp`, `composio_create_payment_link` after a test message

## Test Conversation Flow

Send these messages in order from your WhatsApp:

1. `Hi I want to buy GPS tracker`
2. `Car`
3. `TN09 AB 1234`
4. `Chennai`
5. `Yes I want to proceed`

**Expected result:** After step 5, the agent should send a Razorpay payment link via WhatsApp.

## Verify

- Open dashboard: http://localhost:3000/dashboard
- Confirm lead appears with status `payment_sent`
- Confirm vehicle details are captured
- Confirm payment link is visible in the dashboard

## Payment Test

1. Click the payment link sent via WhatsApp
2. Complete payment using Razorpay test mode
3. Verify lead status changes to `paid` on dashboard
4. Verify thank-you WhatsApp message is received

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Twilio timeout | Ensure webhook returns TwiML XML within 5 seconds |
| No AI response | Check `OPENROUTER_API_KEY` in `.env.local` |
| DB errors | Verify `DATABASE_URL` and run migration SQL |
| Payment link fails | Check Razorpay keys and test mode settings |
| Composio errors | Agent falls back to direct Twilio/Razorpay SDK; check `COMPOSIO_API_KEY` |
