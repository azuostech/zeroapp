import { NextResponse } from 'next/server';
import { isCronRequestAuthorized } from '@/src/lib/security/cron-auth';

export const runtime = 'nodejs';

function resolveBaseUrl(request) {
  const configured = String(process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  return request.nextUrl.origin;
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

export async function GET(request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const cronSecret = process.env.CRON_SECRET || '';
  const baseUrl = resolveBaseUrl(request);

  try {
    const response = await fetch(`${baseUrl}/api/email/reconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cronSecret}`
      },
      body: JSON.stringify({ dias_sem_acesso: 10 }),
      cache: 'no-store'
    });

    const payload = await parseJsonSafe(response);

    return NextResponse.json(
      {
        status: response.status,
        payload
      },
      { status: response.ok ? 200 : response.status }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error?.message || 'cron_reconnect_email_failed'
      },
      { status: 500 }
    );
  }
}
