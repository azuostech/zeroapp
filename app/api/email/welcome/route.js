import { NextResponse } from 'next/server';
import { sendEmail } from '@/src/lib/email/email-service';
import { welcomeLeadTemplate } from '@/src/lib/email/templates/welcome-lead';
import { getServiceSupabase } from '@/src/lib/supabase/service';

export const runtime = 'nodejs';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email);
    const fullName = String(body?.full_name || '').trim();
    const userId = String(body?.user_id || '').trim() || null;

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    let profile = {
      id: userId,
      email,
      full_name: fullName
    };

    try {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,full_name')
        .ilike('email', email)
        .maybeSingle();

      if (!error && data) {
        profile = {
          id: data.id || userId,
          email: data.email || email,
          full_name: data.full_name || fullName
        };
      } else if (error) {
        console.error('[welcome-email] profile lookup failed:', error.message || error);
      }
    } catch (error) {
      console.error('[welcome-email] service lookup failed:', error?.message || error);
    }

    const template = welcomeLeadTemplate({ profile });
    const result = await sendEmail({
      userId: profile.id || userId,
      to: profile.email || email,
      subject: template.subject,
      html: template.html,
      emailType: 'welcome_lead',
      emailSnapshot: {
        kind: 'welcome_lead',
        email,
        full_name: profile.full_name || fullName || null
      }
    });

    return NextResponse.json({
      ok: true,
      sent: Boolean(result?.success)
    });
  } catch (error) {
    console.error('[welcome-email]', error);
    return NextResponse.json({ ok: true, sent: false, warning: 'email_processing_failed' });
  }
}
