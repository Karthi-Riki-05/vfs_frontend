import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://vc-backend:5000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.arrayBuffer();
    const signature = req.headers.get('stripe-signature') || '';

    const response = await fetch(`${BACKEND_URL}/api/v1/subscription/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
      body: Buffer.from(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ error: 'Webhook proxy failed' }, { status: 500 });
  }
}
