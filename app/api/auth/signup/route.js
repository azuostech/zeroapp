import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';

const signupSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(6).max(128),
  full_name: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(40).optional().default('')
});

function getSiteOrigin(requestUrl) {
  const fallbackOrigin = new URL(requestUrl).origin;
  const configured = String(process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (!configured) return fallbackOrigin;

  try {
    const normalized = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
    return new URL(normalized).origin;
  } catch (_) {
    return fallbackOrigin;
  }
}

export async function POST(request) {
  const payload = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados de cadastro invalidos.' }, { status: 400 });
  }

  const { email, password, full_name: fullName, phone } = parsed.data;
  const supabase = await createServerSupabase();
  const origin = getSiteOrigin(request.url);
  const emailRedirectTo = new URL('/auth/callback?next=/app', origin).toString();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        full_name: fullName,
        phone,
        signup_source: 'public_despertar'
      }
    }
  });

  if (error) {
    return NextResponse.json({ error: error.message || 'Nao foi possivel criar a conta.' }, { status: 400 });
  }

  const userId = data?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Nao foi possivel concluir o cadastro.' }, { status: 500 });
  }

  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return NextResponse.json({ error: 'Este e-mail ja esta cadastrado.' }, { status: 400 });
  }

  try {
    const serviceSupabase = getServiceSupabase();
    const { data: profile, error: profileError } = await serviceSupabase
      .from('profiles')
      .update({
        status: 'active',
        phone: phone || null
      })
      .eq('id', userId)
      .eq('tier', 'DESPERTAR')
      .select('id,status,tier')
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile || profile.status !== 'active' || profile.tier !== 'DESPERTAR') {
      throw new Error('despertar_profile_activation_failed');
    }
  } catch (activationError) {
    console.error('[signup] DESPERTAR activation failed:', activationError?.message || activationError);
    return NextResponse.json({ error: 'Conta criada, mas nao foi possivel liberar o acesso agora. Tente entrar em instantes.' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    user_id: userId,
    tier: 'DESPERTAR',
    status: 'active',
    has_session: Boolean(data?.session)
  });
}
