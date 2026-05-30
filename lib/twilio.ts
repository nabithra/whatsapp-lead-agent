import twilio from 'twilio';

function getClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials are not configured');
  }

  return twilio(accountSid, authToken);
}

export async function sendWhatsAppMessage(
  to: string,
  body: string
): Promise<string> {
  try {
    const client = getClient();
    const from = process.env.TWILIO_WHATSAPP_FROM;

    if (!from) {
      throw new Error('TWILIO_WHATSAPP_FROM is not configured');
    }

    const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    const message = await client.messages.create({
      from,
      to: toFormatted,
      body,
    });

    return message.sid;
  } catch (err) {
    console.error('[twilio] Failed to send message:', { to, error: err });
    throw err;
  }
}

export function formatPhoneNumber(phone: string): string {
  return phone.replace(/^whatsapp:/i, '').trim();
}
