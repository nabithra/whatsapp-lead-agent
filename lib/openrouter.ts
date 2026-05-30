const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/** gpt-4o-mini via OpenRouter — ~10–20x cheaper than gpt-4o for lead qualification chat */
export const OPENROUTER_MODEL = 'openai/gpt-4o-mini';
const MODEL = OPENROUTER_MODEL;

export const OPENROUTER_COST_NOTE =
  'Conversations routed through OpenRouter using gpt-4o-mini instead of gpt-4o — same sales flow, lower token cost per lead.';

export const SYSTEM_PROMPT = `You are Priya, a friendly sales assistant for Wheelztracker — 
a GPS vehicle tracking company based in India. Your job is to 
convert WhatsApp inquiries into confirmed GPS device installations.

PRODUCT DETAILS:
- GPS tracking device + installation: ₹2999 one-time
- Supports all vehicles: cars, bikes, trucks, autos
- Features: real-time tracking, SIM-based, app access
- Service: professional technician installs at customer location
- After installation: yearly renewal ₹599

YOUR CONVERSATION GOAL:
Step 1 — Greet warmly and understand what they need
Step 2 — Ask for their vehicle type (car/bike/truck)
Step 3 — Ask for their vehicle number
Step 4 — Confirm their city/location for installation
Step 5 — Explain the product benefits briefly
Step 6 — Ask if they want to proceed
Step 7 — When they confirm, reply with exactly: ##SEND_PAYMENT_LINK##

RULES:
- Always reply in the same language the customer uses
  (Tamil, Hindi, or English)
- Keep messages short and WhatsApp-friendly (no long paragraphs)
- Be warm, human, and conversational — not robotic
- If they ask about price, say ₹2999 includes device + installation
- If they seem hesitant, share one benefit and ask again
- If they say not interested, reply politely and end with ##LEAD_LOST##
- Never mention competitors
- Collect: vehicle type, vehicle number, location before sending payment
- The trigger word ##SEND_PAYMENT_LINK## must appear alone on its own
  line when you are ready to send payment`;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function getChatCompletion(
  messages: ChatMessage[],
  systemPrompt: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Wheelztracker Lead Agent',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[openrouter] API error:', response.status, errorText);
    throw new Error(`OpenRouter API failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== 'string') {
    throw new Error('OpenRouter returned empty or invalid response');
  }

  return content;
}
