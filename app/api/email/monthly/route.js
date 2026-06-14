import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { authorizeCronOrAdmin } from '@/src/lib/email/request-auth';
import { coletarDadosUsuario } from '@/src/lib/email/user-data-collector';
import { buildMonthlyEmailSnapshot } from '@/src/lib/email/email-snapshot';
import { monthlyReportTemplate } from '@/src/lib/email/templates/monthly-report';
import { sendEmail } from '@/src/lib/email/email-service';

export const runtime = 'nodejs';

function parseBodySafe(request) {
  return request.json().catch(() => ({}));
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function resolvePreviousMonthPeriod() {
  const now = new Date();
  const monthIndex = now.getUTCMonth();
  const year = now.getUTCFullYear();

  if (monthIndex === 0) {
    return {
      month: '12',
      year: String(year - 1)
    };
  }

  return {
    month: pad2(monthIndex),
    year: String(year)
  };
}

function resolveMonthYear(mesRaw, anoRaw) {
  const fallback = resolvePreviousMonthPeriod();

  if (typeof mesRaw === 'undefined' && typeof anoRaw === 'undefined') {
    return fallback;
  }

  const monthNum = Number(mesRaw);
  const yearNum = Number(anoRaw);

  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    return null;
  }

  if (!Number.isInteger(yearNum) || yearNum < 1970) {
    return null;
  }

  return {
    month: pad2(monthNum),
    year: String(yearNum)
  };
}

function normalizeUserId(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

export async function POST(request) {
  const auth = await authorizeCronOrAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await parseBodySafe(request);
  const period = resolveMonthYear(body?.mes, body?.ano);

  if (!period) {
    return NextResponse.json(
      {
        error: 'invalid_month_or_year',
        details: 'mes deve ser 1-12 e ano deve ser >= 1970'
      },
      { status: 400 }
    );
  }

  const requestedUserId = normalizeUserId(body?.user_id);

  let serviceSupabase;
  try {
    serviceSupabase = getServiceSupabase();
  } catch (error) {
    return NextResponse.json(
      {
        error: error?.message || 'service_client_unavailable'
      },
      { status: 500 }
    );
  }

  let userIds = [];

  if (requestedUserId) {
    userIds = [requestedUserId];
  } else {
    const { data, error } = await serviceSupabase
      .from('profiles')
      .select('id')
      .eq('status', 'active')
      .not('email', 'is', null);

    if (error) {
      return NextResponse.json({ error: error.message || 'profiles_query_failed' }, { status: 500 });
    }

    userIds = (data || []).map((item) => item.id);
  }

  const results = [];

  for (const userId of userIds) {
    try {
      const dados = await coletarDadosUsuario(userId, period.month, period.year);

      if (!dados?.profile) {
        results.push({
          user_id: userId,
          success: false,
          skipped: 'profile_not_found'
        });
        continue;
      }

      const recipient = String(dados.profile.email || '').trim();
      if (!recipient) {
        results.push({
          user_id: userId,
          success: false,
          skipped: 'missing_email'
        });
        continue;
      }

      const { subject, html } = monthlyReportTemplate(dados);
      const emailSnapshot = buildMonthlyEmailSnapshot(dados);
      const sent = await sendEmail({
        userId,
        to: recipient,
        subject,
        html,
        emailType: 'monthly_report',
        emailSnapshot
      });

      results.push({ user_id: userId, ...sent });
    } catch (error) {
      results.push({
        user_id: userId,
        success: false,
        error: error?.message || 'monthly_email_failed'
      });
    }
  }

  const sentCount = results.filter((item) => item.success === true).length;
  const skippedCount = results.filter((item) => Boolean(item.skipped)).length;
  const failedCount = results.filter((item) => item.success === false && !item.skipped).length;

  return NextResponse.json({
    period: {
      mes: period.month,
      ano: period.year
    },
    total_targets: userIds.length,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount,
    results
  });
}
