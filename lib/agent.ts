import { query } from './db';
import { getChatCompletion, SYSTEM_PROMPT, ChatMessage } from './openrouter';
import { formatPhoneNumber } from './twilio';
import { orchestrateSendWhatsApp, orchestrateCreatePaymentLink } from './orchestrator';

interface Lead {
  id: number;
  phone_number: string;
  name: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  status: string;
  amount: number;
  payment_link: string | null;
  payment_link_id: string | null;
}

interface ExtractedDetails {
  name: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  city: string | null;
}

const FALLBACK_MESSAGE =
  'Hi! Thanks for reaching out to Wheelztracker. Our team will contact you shortly. 📞';

const PAYMENT_FALLBACK_MESSAGE =
  "We're preparing your payment link. Please wait a moment or call us directly.";

export async function extractLeadDetails(
  conversationHistory: ChatMessage[]
): Promise<ExtractedDetails> {
  const extractPrompt =
    'Based on this WhatsApp conversation, extract the following in JSON: ' +
    '{ "name", "vehicle_type", "vehicle_number", "city" } ' +
    'If not found, use null. Return ONLY valid JSON, nothing else.';

  try {
    const response = await getChatCompletion(conversationHistory, extractPrompt);
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned) as ExtractedDetails;
  } catch (err) {
    console.error('[agent] Failed to extract lead details:', err);
    return { name: null, vehicle_type: null, vehicle_number: null, city: null };
  }
}

async function findOrCreateLead(phoneNumber: string): Promise<Lead> {
  const existing = await query<Lead>(
    'SELECT * FROM leads WHERE phone_number = $1',
    [phoneNumber]
  );

  if (existing.length > 0) {
    return existing[0];
  }

  const inserted = await query<Lead>(
    `INSERT INTO leads (phone_number, status) VALUES ($1, 'new') RETURNING *`,
    [phoneNumber]
  );

  return inserted[0];
}

async function buildConversationHistory(leadId: number): Promise<ChatMessage[]> {
  const rows = await query<{ direction: string; message_body: string }>(
    `SELECT direction, message_body FROM messages
     WHERE lead_id = $1
     ORDER BY created_at ASC
     LIMIT 10`,
    [leadId]
  );

  return rows.map((row) => ({
    role: row.direction === 'inbound' ? 'user' : 'assistant',
    content: row.message_body,
  })) as ChatMessage[];
}

async function saveOutboundMessage(
  leadId: number,
  body: string,
  twilioSid?: string
): Promise<void> {
  await query(
    `INSERT INTO messages (lead_id, direction, message_body, twilio_sid)
     VALUES ($1, 'outbound', $2, $3)`,
    [leadId, body, twilioSid || null]
  );
  await query(
    `INSERT INTO agent_logs (lead_id, action, details) VALUES ($1, 'message_sent', $2)`,
    [leadId, body.substring(0, 500)]
  );
}

export async function processIncomingMessage(
  from: string,
  body: string
): Promise<void> {
  const phoneNumber = formatPhoneNumber(from);

  try {
    const lead = await findOrCreateLead(phoneNumber);

    await query(
      `INSERT INTO messages (lead_id, direction, message_body) VALUES ($1, 'inbound', $2)`,
      [lead.id, body]
    );
    await query(
      `INSERT INTO agent_logs (lead_id, action, details) VALUES ($1, 'message_received', $2)`,
      [lead.id, body.substring(0, 500)]
    );

    const conversationHistory = await buildConversationHistory(lead.id);

    let aiResponse: string;
    try {
      aiResponse = await getChatCompletion(conversationHistory, SYSTEM_PROMPT);
    } catch (err) {
      console.error('[agent] OpenRouter failed:', err);
      const sid = await orchestrateSendWhatsApp(from, FALLBACK_MESSAGE, lead.id);
      await saveOutboundMessage(lead.id, FALLBACK_MESSAGE, sid);
      await query(`UPDATE leads SET updated_at = NOW() WHERE id = $1`, [lead.id]);
      return;
    }

    if (aiResponse.includes('##SEND_PAYMENT_LINK##')) {
      await handlePaymentLinkTrigger(from, lead, conversationHistory);
      return;
    }

    if (aiResponse.includes('##LEAD_LOST##')) {
      const cleanedResponse = aiResponse.replace(/##LEAD_LOST##/g, '').trim();
      await query(`UPDATE leads SET status = 'lost', updated_at = NOW() WHERE id = $1`, [
        lead.id,
      ]);
      const sid = await orchestrateSendWhatsApp(from, cleanedResponse, lead.id);
      await saveOutboundMessage(lead.id, cleanedResponse, sid);
      await query(`UPDATE leads SET updated_at = NOW() WHERE id = $1`, [lead.id]);
      return;
    }

    if (lead.status === 'new') {
      await query(`UPDATE leads SET status = 'talking', updated_at = NOW() WHERE id = $1`, [
        lead.id,
      ]);
    }

    const sid = await orchestrateSendWhatsApp(from, aiResponse, lead.id);
    await saveOutboundMessage(lead.id, aiResponse, sid);
    await query(`UPDATE leads SET updated_at = NOW() WHERE id = $1`, [lead.id]);
  } catch (err) {
    console.error('[agent] processIncomingMessage error:', { from, body, error: err });
    throw err;
  }
}

async function handlePaymentLinkTrigger(
  from: string,
  lead: Lead,
  conversationHistory: ChatMessage[]
): Promise<void> {
  try {
    const details = await extractLeadDetails(conversationHistory);

    await query(
      `UPDATE leads SET
        status = 'payment_sent',
        name = COALESCE($1, name),
        vehicle_type = COALESCE($2, vehicle_type),
        vehicle_number = COALESCE($3, vehicle_number),
        updated_at = NOW()
       WHERE id = $4`,
      [details.name, details.vehicle_type, details.vehicle_number, lead.id]
    );

    const updatedLead = await query<Lead>('SELECT * FROM leads WHERE id = $1', [lead.id]);
    const currentLead = updatedLead[0];

    const { payment_link_url, payment_link_id } = await orchestrateCreatePaymentLink({
      id: currentLead.id,
      phone_number: currentLead.phone_number,
      name: currentLead.name,
      vehicle_type: currentLead.vehicle_type,
      vehicle_number: currentLead.vehicle_number,
      amount: currentLead.amount,
    });

    await query(
      `INSERT INTO agent_logs (lead_id, action, details) VALUES ($1, 'composio_payment_orchestrated', $2)`,
      [
        lead.id,
        JSON.stringify({ payment_link_id, integrations: 'composio+razorpay+twilio' }),
      ]
    );

    await query(
      `UPDATE leads SET payment_link = $1, payment_link_id = $2, updated_at = NOW() WHERE id = $3`,
      [payment_link_url, payment_link_id, lead.id]
    );

    const paymentMessage =
      `Great! Here is your secure payment link for the GPS installation:\n` +
      `${payment_link_url}\n` +
      `Amount: ₹2999 (Device + Installation)\n` +
      `Once paid, our technician will contact you within 2 hours to schedule installation. 🚗`;

    const sid = await orchestrateSendWhatsApp(from, paymentMessage, lead.id);
    await saveOutboundMessage(lead.id, paymentMessage, sid);
    await query(`UPDATE leads SET updated_at = NOW() WHERE id = $1`, [lead.id]);
  } catch (err) {
    console.error('[agent] Payment link flow failed:', err);
    const sid = await orchestrateSendWhatsApp(from, PAYMENT_FALLBACK_MESSAGE, lead.id);
    await saveOutboundMessage(lead.id, PAYMENT_FALLBACK_MESSAGE, sid);
    await query(`UPDATE leads SET updated_at = NOW() WHERE id = $1`, [lead.id]);
  }
}
