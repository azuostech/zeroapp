import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { coletarDadosUsuario } from '@/src/lib/email/user-data-collector';
import { monthlyReportTemplate } from '@/src/lib/email/templates/monthly-report';
import { sendEmail } from '@/src/lib/email/email-service';

export const runtime = 'nodejs';

function pad2(value) {
  return String(value).padStart(2, '0');
}

export async function POST() {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const isAdmin = Boolean(profile?.role === 'admin' || profile?.is_admin);
  if (!isAdmin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const now = new Date();
  const month = pad2(now.getUTCMonth() + 1);
  const year = String(now.getUTCFullYear());

  try {
    const dados = await coletarDadosUsuario(user.id, month, year);
    const { subject, html } = monthlyReportTemplate(dados);

    const recipient = String(user.email || dados?.profile?.email || '').trim();
    if (!recipient) {
      return NextResponse.json({ error: 'missing_email' }, { status: 422 });
    }

    const result = await sendEmail({
      userId: user.id,
      to: recipient,
      subject: `[TESTE] ${subject}`,
      html,
      emailType: 'test'
    });

    return NextResponse.json({
      period: { mes: month, ano: year },
      ...result
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error?.message || 'test_email_failed'
      },
      { status: 500 }
    );
  }
}
