import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';

function getSafeNext(nextValue) {
  if (!nextValue || typeof nextValue !== 'string') return '/';
  return nextValue.startsWith('/') ? nextValue : '/';
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = getSafeNext(requestUrl.searchParams.get('next'));

  const supabase = await createServerSupabase();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash && type) {
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  }

  return NextResponse.redirect(new URL(next, request.url));
}
