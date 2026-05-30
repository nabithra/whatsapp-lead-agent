import Razorpay from 'razorpay';

export interface LeadData {
  id: number;
  phone_number: string;
  name: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  amount: number;
}

function getRazorpayInstance(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export async function createPaymentLink(
  lead: LeadData
): Promise<{ payment_link_url: string; payment_link_id: string }> {
  try {
    const razorpay = getRazorpayInstance();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const response = await razorpay.paymentLink.create({
      amount: lead.amount * 100,
      currency: 'INR',
      description: 'Wheelztracker GPS Device + Installation',
      customer: {
        contact: lead.phone_number.replace(/^\+/, ''),
        name: lead.name || undefined,
      },
      notify: {
        sms: true,
        whatsapp: true,
      },
      reminder_enable: true,
      callback_url: `${appUrl}/api/razorpay-webhook`,
      callback_method: 'get',
      notes: {
        lead_id: String(lead.id),
        vehicle_number: lead.vehicle_number || '',
        vehicle_type: lead.vehicle_type || '',
      },
    });

    return {
      payment_link_url: response.short_url,
      payment_link_id: response.id,
    };
  } catch (err) {
    console.error('[razorpay] Failed to create payment link:', { leadId: lead.id, error: err });
    throw err;
  }
}
