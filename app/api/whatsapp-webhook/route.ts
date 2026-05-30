import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
import { processIncomingMessage } from '@/lib/agent';

const TWIML_RESPONSE = `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;

const twimlHeaders = { 'Content-Type': 'text/xml' };

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const body = formData.get('Body') as string;
    const from = formData.get('From') as string;

    if (!body || !from) {
      console.error('[whatsapp-webhook] Missing Body or From');
      return new Response(TWIML_RESPONSE, { headers: twimlHeaders });
    }

    console.log('[whatsapp-webhook] Incoming:', { from, body });

    await processIncomingMessage(from, body);

    return new Response(TWIML_RESPONSE, { headers: twimlHeaders });
  } catch (err) {
    console.error('[whatsapp-webhook] Error:', err);
    return new Response(TWIML_RESPONSE, { headers: twimlHeaders });
  }
}
