/**
 * Composio orchestration layer — routes Twilio + Razorpay actions through Composio
 * with SDK fallbacks. OpenRouter (gpt-4o-mini) handles conversation separately.
 */
import { composioSendWhatsApp, composioCreatePaymentLink, isComposioEnabled } from './composio';
import { LeadData } from './razorpay';

export { isComposioEnabled };

export async function orchestrateSendWhatsApp(
  to: string,
  body: string,
  leadId?: number
): Promise<string> {
  const { messageSid } = await composioSendWhatsApp(to, body, leadId);
  return messageSid;
}

export async function orchestrateCreatePaymentLink(lead: LeadData): Promise<{
  payment_link_url: string;
  payment_link_id: string;
}> {
  const result = await composioCreatePaymentLink(lead);
  return {
    payment_link_url: result.payment_link_url,
    payment_link_id: result.payment_link_id,
  };
}
