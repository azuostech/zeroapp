import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { provisionIrcPurchase } from '@/src/modules/irc/application/irc-provisioning';

export const runtime = 'nodejs';

function safeEquals(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function requestToken(request, body) {
  return (
    request.headers.get('x-kiwify-token') ||
    request.headers.get('x-webhook-token') ||
    request.headers.get('x-zeroapp-token') ||
    String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim() ||
    body?.webhook_token ||
    ''
  );
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const expectedToken = String(process.env.KIWIFY_IRC_WEBHOOK_TOKEN || process.env.KIWIFY_WEBHOOK_TOKEN || '').trim();
  if (!expectedToken) return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 });
  if (!safeEquals(requestToken(request, body), expectedToken)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const result = await provisionIrcPurchase(body);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    console.error('[kiwify/irc] processing failed:', error?.message || error);
    return NextResponse.json({ received: true, error: 'processing_failed' }, { status: 500 });
  }
}
