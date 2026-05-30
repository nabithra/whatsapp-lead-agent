import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const leads = await query(
      `SELECT l.*, COUNT(m.id)::int AS message_count
       FROM leads l
       LEFT JOIN messages m ON m.lead_id = l.id
       GROUP BY l.id
       ORDER BY l.created_at DESC`
    );

    return NextResponse.json(leads);
  } catch (err) {
    console.error('[dashboard-api] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
