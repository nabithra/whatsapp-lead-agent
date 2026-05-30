import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';
import { orchestrateSendWhatsApp } from '@/lib/orchestrator';

const SUCCESS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Successful - Wheelztracker</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center;
           align-items: center; min-height: 100vh; margin: 0; background: #f0fdf4; }
    .card { background: white; padding: 2rem; border-radius: 12px; text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 400px; }
    h1 { color: #16a34a; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🎉 Payment Successful!</h1>
    <p>Thank you for choosing Wheelztracker. Our technician will contact you within 2 hours.</p>
  </div>
</body>
</html>`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentLinkId = searchParams.get('razorpay_payment_link_id');
    const paymentId = searchParams.get('razorpay_payment_id');
    const paymentStatus = searchParams.get('razorpay_payment_link_status');

    console.log('[razorpay-webhook] Callback:', {
      paymentLinkId,
      paymentId,
      paymentStatus,
    });

    if (paymentStatus === 'paid' && paymentLinkId) {
      const leads = await query<{ id: number; phone_number: string }>(
        'SELECT id, phone_number FROM leads WHERE payment_link_id = $1',
        [paymentLinkId]
      );

      if (leads.length > 0) {
        const lead = leads[0];

        await query(
          `UPDATE leads SET status = 'paid', razorpay_payment_id = $1, updated_at = NOW() WHERE id = $2`,
          [paymentId, lead.id]
        );

        await query(
          `INSERT INTO agent_logs (lead_id, action, details) VALUES ($1, 'payment_received', $2)`,
          [lead.id, JSON.stringify({ paymentId, paymentLinkId })]
        );

        const thankYouMessage =
          '🎉 Payment received! Thank you!\n' +
          'Our technician will call you within 2 hours to schedule ' +
          'your GPS installation. Please keep your vehicle ready.\n' +
          '— Wheelztracker Team';

        try {
          await orchestrateSendWhatsApp(lead.phone_number, thankYouMessage, lead.id);
          await query(
            `INSERT INTO messages (lead_id, direction, message_body) VALUES ($1, 'outbound', $2)`,
            [lead.id, thankYouMessage]
          );
        } catch (whatsappErr) {
          console.error('[razorpay-webhook] WhatsApp notification failed:', whatsappErr);
        }
      }
    }

    return new Response(SUCCESS_HTML, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (err) {
    console.error('[razorpay-webhook] Error:', err);
    return new Response(SUCCESS_HTML, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
