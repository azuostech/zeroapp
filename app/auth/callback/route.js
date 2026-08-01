import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';

function getSafeNext(nextValue) {
  if (!nextValue || typeof nextValue !== 'string') return '/';
  return nextValue.startsWith('/') && !nextValue.startsWith('//') ? nextValue : '/';
}

function confirmationUrl(requestUrl, status, hasSession = false) {
  const url = new URL('/auth/confirmed', requestUrl);
  url.searchParams.set('status', status);
  if (hasSession) url.searchParams.set('session', 'active');
  return url;
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = getSafeNext(requestUrl.searchParams.get('next'));
  const isRecovery = next.startsWith('/auth/reset-password') || type === 'recovery';

  const supabase = await createServerSupabase();
  let verificationError = null;
  let hasSession = false;
  let confirmationWasAccepted = false;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    verificationError = error;
    hasSession = Boolean(data?.session);
    // O servidor do Supabase so redireciona com `code` depois de aceitar o
    // token do e-mail. A troca de sessao ainda pode falhar se o link for aberto
    // em outro navegador, sem o PKCE verifier original; o e-mail, entretanto,
    // ja foi confirmado e deve receber feedback de sucesso.
    confirmationWasAccepted = !error || String(error.message || '').includes('code verifier');
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    verificationError = error;
    hasSession = Boolean(data?.session);
    confirmationWasAccepted = !error;
  } else {
    verificationError = new Error('missing_confirmation_token');
  }

  if (isRecovery) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (confirmationWasAccepted) {
    return NextResponse.redirect(confirmationUrl(request.url, 'success', hasSession));
  }

  console.error('[auth/callback] confirmation failed:', verificationError?.message || verificationError);
  return NextResponse.redirect(confirmationUrl(request.url, 'error'));
}
