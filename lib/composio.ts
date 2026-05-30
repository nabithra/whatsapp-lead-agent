import { Composio } from '@composio/core';
import { wheelztrackerToolkit, COMPOSIO_TOOL_SLUGS } from './composio-tools';
import { sendWhatsAppMessage } from './twilio';
import { createPaymentLink, LeadData } from './razorpay';
import { query } from './db';

const SYSTEM_USER_ID = process.env.COMPOSIO_USER_ID || 'wheelztracker_agent';

let composioClient: Composio | null = null;
type ComposioSession = Awaited<ReturnType<Composio['create']>>;
const sessionCache = new Map<string, ComposioSession>();

export function isComposioEnabled(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY);
}

export function getComposioClient(): Composio | null {
  if (!isComposioEnabled()) return null;

  if (!composioClient) {
    composioClient = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY,
      host: 'Wheelztracker Lead Agent',
    });
  }

  return composioClient;
}

function getUserIdForLead(leadId?: number, phoneNumber?: string): string {
  if (leadId) return `lead_${leadId}`;
  if (phoneNumber) return `phone_${phoneNumber.replace(/\D/g, '')}`;
  return SYSTEM_USER_ID;
}

export async function getComposioSession(leadId?: number, phoneNumber?: string) {
  const composio = getComposioClient();
  if (!composio) return null;

  const userId = getUserIdForLead(leadId, phoneNumber);

  if (!sessionCache.has(userId)) {
    const session = await composio.create(userId, {
      toolkits: ['razorpay', 'twilio'],
      manageConnections: false,
      experimental: {
        customToolkits: [wheelztrackerToolkit],
      },
    });
    sessionCache.set(userId, session);
  }

  return sessionCache.get(userId)!;
}

export async function logComposioAction(
  leadId: number | null,
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await query(
      `INSERT INTO agent_logs (lead_id, action, details) VALUES ($1, $2, $3)`,
      [leadId, action, JSON.stringify(details)]
    );
  } catch (err) {
    console.error('[composio] Failed to log action:', err);
  }
}

function extractExecuteData(result: {
  data?: Record<string, unknown>;
  error?: string | null;
}): Record<string, unknown> | null {
  if (result.error) return null;
  return (result.data as Record<string, unknown>) || null;
}

export async function composioSendWhatsApp(
  to: string,
  body: string,
  leadId?: number
): Promise<{ messageSid: string; via: 'composio' | 'direct' }> {
  const session = await getComposioSession(leadId);

  if (session) {
    try {
      const result = await session.execute(COMPOSIO_TOOL_SLUGS.SEND_WHATSAPP, {
        to,
        body,
      });

      const data = extractExecuteData(result);
      const messageSid = (data?.message_sid as string) || 'composio-executed';

      await logComposioAction(leadId ?? null, 'composio_send_whatsapp', {
        tool: COMPOSIO_TOOL_SLUGS.SEND_WHATSAPP,
        to,
        message_sid: messageSid,
      });

      return { messageSid, via: 'composio' };
    } catch (err) {
      console.error('[composio] SEND_WHATSAPP failed, falling back to Twilio SDK:', err);
      await logComposioAction(leadId ?? null, 'composio_send_whatsapp_fallback', {
        error: String(err),
      });
    }
  }

  const messageSid = await sendWhatsAppMessage(to, body);
  return { messageSid, via: 'direct' };
}

export async function composioCreatePaymentLink(
  lead: LeadData
): Promise<{
  payment_link_url: string;
  payment_link_id: string;
  via: 'composio_native' | 'composio_custom' | 'direct';
}> {
  const composio = getComposioClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (composio) {
    try {
      const nativeResult = await composio.tools.execute(
        COMPOSIO_TOOL_SLUGS.RAZORPAY_NATIVE,
        {
          userId: getUserIdForLead(lead.id, lead.phone_number),
          arguments: {
            amount: lead.amount * 100,
            currency: 'INR',
            description: 'Wheelztracker GPS Device + Installation',
            customer: {
              contact: lead.phone_number.replace(/^\+/, ''),
              name: lead.name || undefined,
            },
            notify: { sms: true, whatsapp: true },
            reminder_enable: true,
            callback_url: `${appUrl}/api/razorpay-webhook`,
            callback_method: 'get',
            notes: {
              lead_id: String(lead.id),
              vehicle_number: lead.vehicle_number || '',
              vehicle_type: lead.vehicle_type || '',
            },
          },
          dangerouslySkipVersionCheck: true,
        }
      );

      const data = (nativeResult as { data?: Record<string, unknown> })?.data;
      const shortUrl =
        (data?.short_url as string) ||
        (data?.payment_link_url as string) ||
        (data?.url as string);
      const linkId = (data?.id as string) || (data?.payment_link_id as string);

      if (shortUrl && linkId) {
        await logComposioAction(lead.id, 'composio_razorpay_native', {
          tool: COMPOSIO_TOOL_SLUGS.RAZORPAY_NATIVE,
          payment_link_id: linkId,
        });
        return {
          payment_link_url: shortUrl,
          payment_link_id: linkId,
          via: 'composio_native',
        };
      }
    } catch (err) {
      console.error('[composio] Native Razorpay tool failed, trying custom tool:', err);
    }

    const session = await getComposioSession(lead.id, lead.phone_number);
    if (session) {
      try {
        const result = await session.execute(COMPOSIO_TOOL_SLUGS.CREATE_PAYMENT_LINK, {
          lead,
          callback_url: `${appUrl}/api/razorpay-webhook`,
        });

        const data = extractExecuteData(result);
        if (data?.payment_link_url && data?.payment_link_id) {
          await logComposioAction(lead.id, 'composio_create_payment_link', {
            tool: COMPOSIO_TOOL_SLUGS.CREATE_PAYMENT_LINK,
            payment_link_id: data.payment_link_id,
          });
          return {
            payment_link_url: data.payment_link_url as string,
            payment_link_id: data.payment_link_id as string,
            via: 'composio_custom',
          };
        }
      } catch (err) {
        console.error('[composio] Custom payment link tool failed:', err);
      }
    }
  }

  const direct = await createPaymentLink(lead);
  await logComposioAction(lead.id, 'razorpay_direct_fallback', {
    payment_link_id: direct.payment_link_id,
  });
  return { ...direct, via: 'direct' };
}
