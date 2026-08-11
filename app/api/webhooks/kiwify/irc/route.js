import crypto from 'node:crypto';
import { after, NextResponse } from 'next/server';
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

function requestSignature(request, body) {
  try {
    return String(body?.signature || new URL(request.url).searchParams.get('signature') || '').trim();
  } catch (_) {
    return String(body?.signature || '').trim();
  }
}

function calculatedSignature(body, token) {
  if (!body?.order || typeof body.order !== 'object' || Array.isArray(body.order)) return '';
  return crypto.createHmac('sha1', token).update(JSON.stringify(body.order)).digest('hex');
}

function configuredTokens() {
  return [process.env.KIWIFY_IRC_WEBHOOK_TOKEN, process.env.KIWIFY_WEBHOOK_TOKEN]
    .map((token) => String(token || '').trim())
    .filter((token, index, tokens) => token && tokens.indexOf(token) === index);
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const expectedTokens = configuredTokens();
  if (!expectedTokens.length) return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 });
  const receivedToken = requestToken(request, body);
  const receivedSignature = requestSignature(request, body);
  const authorized = expectedTokens.some((expectedToken) => (
    safeEquals(receivedToken, expectedToken) ||
    safeEquals(receivedSignature, calculatedSignature(body, expectedToken))
  ));
  if (!authorized) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  after(async () => {
    try {
      const result = await provisionIrcPurchase(body);
      if (!result.ok) {
        console.error('[kiwify/irc] processing rejected:', result.error || 'processing_rejected');
      }
    } catch (error) {
      console.error('[kiwify/irc] processing failed:', error?.message || error);
    }
  });

  return NextResponse.json({ received: true, accepted: true });
}
