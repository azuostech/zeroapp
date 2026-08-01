import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';

function getSiteOrigin(requestUrl) {
  const fallbackOrigin = new URL(requestUrl).origin;
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (!configured) return fallbackOrigin;

  try {
    const normalized = configured.startsWith('http://') || configured.startsWith('https://') ? configured : `https://${configured}`;
    return new URL(normalized).origin;
  } catch (_) {
    return fallbackOrigin;
  }
}

function getSafeNext(value) {
  const next = String(value || '').trim();
  if (!next.startsWith('/') || next.startsWith('//')) return '';
  return next;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const email = body?.email?.trim?.();
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const origin = getSiteOrigin(request.url);
  const finalNext = getSafeNext(body?.next);
  const resetPath = new URL('/auth/reset-password', origin);
  if (finalNext) resetPath.searchParams.set('next', finalNext);
  const callbackPath = new URL('/auth/callback', origin);
  callbackPath.searchParams.set('next', `${resetPath.pathname}${resetPath.search}`);
  const redirectTo = callbackPath.toString();

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
