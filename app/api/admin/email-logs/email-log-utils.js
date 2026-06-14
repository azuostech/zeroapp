import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { isAdminProfile } from '@/src/modules/admin/application/admin-impersonation-service';

export async function requireAdminEmailAccess() {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    };
  }

  if (!isAdminProfile(profile)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'forbidden' }, { status: 403 })
    };
  }

  return { ok: true, supabase, user, profile };
}

export function parsePositiveInt(value, fallback, { min = 1, max = 100 } = {}) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

export function resolveMonthRange(monthValue) {
  const [yearRaw, monthRaw] = String(monthValue || '').split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString()
  };
}

export async function fetchProfilesMap(supabase, userIds) {
  const ids = Array.from(new Set((userIds || []).filter(Boolean)));
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, tier, turma')
    .in('id', ids);

  if (error) {
    console.error('[admin/email-logs] profile lookup failed:', error.message || error);
    return new Map();
  }

  return new Map((data || []).map((item) => [item.id, item]));
}

export function serializeEmailLog(log, profile = null) {
  const createdAt = log?.created_at || log?.sent_at || null;

  return {
    id: log?.id,
    user_id: log?.user_id,
    email_type: log?.email_type,
    recipient: log?.recipient,
    subject: log?.subject,
    resend_id: log?.resend_id,
    status: log?.status,
    sent_at: log?.sent_at || createdAt,
    created_at: createdAt,
    opened_at: log?.opened_at || null,
    clicked_at: log?.clicked_at || null,
    open_count: Number(log?.open_count || 0),
    click_count: Number(log?.click_count || 0),
    last_event_at: log?.last_event_at || null,
    email_snapshot: log?.email_snapshot || null,
    profile: profile
      ? {
          full_name: profile.full_name || '',
          email: profile.email || '',
          tier: profile.tier || '',
          turma: profile.turma || ''
        }
      : null
  };
}

export const EMAIL_LOG_COLUMNS =
  'id,user_id,email_type,recipient,subject,resend_id,status,sent_at,created_at,opened_at,clicked_at,open_count,click_count,last_event_at,email_snapshot';
