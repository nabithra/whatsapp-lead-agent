import {
  experimental_createToolkit as createCustomToolkit,
  experimental_createTool as createCustomTool,
} from '@composio/core/experimental';
import { z } from 'zod';
import { sendWhatsAppMessage } from './twilio';
import { createPaymentLink, LeadData } from './razorpay';

const leadDataSchema = z.object({
  id: z.number(),
  phone_number: z.string(),
  name: z.string().nullable(),
  vehicle_type: z.string().nullable(),
  vehicle_number: z.string().nullable(),
  amount: z.number(),
});

export const wheelztrackerToolkit = createCustomToolkit('WHEELZTRACKER', {
  name: 'Wheelztracker Lead Agent Tools',
  description:
    'Orchestrates Twilio WhatsApp messaging and Razorpay payment links for GPS install conversions',
  tools: [
    createCustomTool('SEND_WHATSAPP', {
      name: 'Send WhatsApp via Twilio',
      description:
        'Send an outbound WhatsApp message to a lead using Twilio WhatsApp Business API',
      inputParams: z.object({
        to: z.string().describe('Recipient: whatsapp:+91... or +91...'),
        body: z.string().describe('Message body text'),
      }),
      execute: async (input) => {
        const messageSid = await sendWhatsAppMessage(input.to, input.body);
        return { message_sid: messageSid, channel: 'twilio_whatsapp' };
      },
    }),
    createCustomTool('CREATE_PAYMENT_LINK', {
      name: 'Create Razorpay Payment Link',
      description:
        'Create a Razorpay payment link for GPS device + installation (₹2999)',
      inputParams: z.object({
        lead: leadDataSchema,
        callback_url: z.string().optional(),
      }),
      execute: async (input) => {
        const lead = input.lead as LeadData;
        const result = await createPaymentLink(lead);
        return {
          payment_link_url: result.payment_link_url,
          payment_link_id: result.payment_link_id,
          amount_inr: lead.amount,
        };
      },
    }),
  ],
});

/** Composio exposes custom tools with LOCAL_ prefix + toolkit slug */
export const COMPOSIO_TOOL_SLUGS = {
  SEND_WHATSAPP: 'LOCAL_WHEELZTRACKER_SEND_WHATSAPP',
  CREATE_PAYMENT_LINK: 'LOCAL_WHEELZTRACKER_CREATE_PAYMENT_LINK',
  RAZORPAY_NATIVE: 'RAZORPAY_CREATE_PAYMENT_LINK',
} as const;
