import { NextResponse } from 'next/server';
import { getResendClient } from '@/src/lib/email/resend-client';
import { requireAdminEmailAccess } from '../email-log-utils';

export const runtime = 'nodejs';

const MAX_EMAILS = 1000;
const PAGE_SIZE = 100;

function normalizeRecipient(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/<([^>]+)>/);
  return String(match?.[1] || raw).trim().toLowerCase();
}

function inferEmailType(subject) {
  const normalized = String(subject || '').toLowerCase();

  if (normalized.includes('seja bem-vindo')) return 'welcome_lead';
  if (normalized.includes('aporte shamar')) return 'shamar_contribution_registered';
  if (normalized.includes('convidou voce') || normalized.includes('convidou você')) return 'shamar_invite';
  if (normalized.includes('dados de acesso ao zeroapp')) return 'zeroapp_access_granted';
  if (normalized.includes('diagnóstico completo') || normalized.includes('diagnostico completo')) return 'irc_access_granted';
  if (normalized.includes('workshop') || normalized.includes('acesso liberado')) return 'workshop_access_granted';
  if (normalized.includes('reconex')) return 'reconnect';
  if (normalized.includes('marco') || normalized.includes('fase')) return 'phase_milestone';
  if (normalized.includes('[teste]') || normalized.includes('[test]')) return 'test';
  return 'monthly_report';
}

function normalizeStatus(lastEvent) {
  const event = String(lastEvent || '').toLowerCase();

  if (['clicked', 'opened', 'delivered', 'sent', 'bounced'].includes(event)) return event;
  if (['failed', 'suppressed', 'canceled', 'complained'].includes(event)) return 'failed';
  return 'sent';
}

async function listResendEmails(resend) {
  const emails = [];
  let after;

  while (emails.length < MAX_EMAILS) {
    const { data, error } = await resend.emails.list({ limit: PAGE_SIZE, ...(after ? { after } : {}) });
    if (error) throw new Error(error.message || 'resend_list_failed');

    const page = Array.isArray(data?.data) ? data.data : [];
    emails.push(...page);

    if (!data?.has_more || page.length === 0) break;
    after = page[page.length - 1]?.id;
    if (!after) break;
  }

  return emails.slice(0, MAX_EMAILS);
}

export async function POST() {
  const auth = await requireAdminEmailAccess();
  if (!auth.ok) return auth.response;

  try {
    const resend = getResendClient();
    if (!resend) {
      return NextResponse.json({ error: 'resend_not_configured' }, { status: 503 });
    }

    const emails = await listResendEmails(resend);
    if (emails.length === 0) {
      return NextResponse.json({ imported: 0, updated: 0, total: 0 });
    }

    // O usuario ja foi validado como admin; usar a sessao autenticada tambem
    // permite que a policy email_logs_admin controle a importacao.
    const service = auth.supabase;
    const resendIds = emails.map((email) => email.id).filter(Boolean);
    const { data: existing, error: existingError } = await service
      .from('email_logs')
      .select('id,resend_id,status')
      .in('resend_id', resendIds);

    if (existingError) throw existingError;

    const recipients = Array.from(
      new Set(emails.flatMap((email) => email.to || []).map(normalizeRecipient).filter(Boolean))
    );
    const { data: profiles, error: profilesError } = recipients.length
      ? await service.from('profiles').select('id,email').in('email', recipients)
      : { data: [], error: null };

    if (profilesError) {
      console.warn('[admin/email-logs/sync] profile lookup skipped:', profilesError.message || profilesError);
    }

    const profileByEmail = new Map(
      (profiles || []).map((profile) => [normalizeRecipient(profile.email), profile.id])
    );
    const existingByResendId = new Map((existing || []).map((log) => [log.resend_id, log]));
    const newRows = [];
    const updates = [];

    for (const email of emails) {
      const recipient = normalizeRecipient(email.to?.[0]);
      if (!email.id || !recipient) continue;

      const status = normalizeStatus(email.last_event);
      const eventFields = {
        open_count: ['opened', 'clicked'].includes(status) ? 1 : 0,
        click_count: status === 'clicked' ? 1 : 0
      };
      const current = existingByResendId.get(email.id);

      if (current) {
        if (current.status !== status) {
          updates.push(
            service
              .from('email_logs')
              .update({ status, ...eventFields })
              .eq('id', current.id)
          );
        }
        continue;
      }

      newRows.push({
        user_id: profileByEmail.get(recipient) || null,
        email_type: inferEmailType(email.subject),
        recipient,
        subject: String(email.subject || '(sem assunto)'),
        resend_id: email.id,
        status,
        sent_at: email.created_at,
        created_at: email.created_at,
        ...eventFields
      });
    }

    if (newRows.length > 0) {
      const { error } = await service.from('email_logs').insert(newRows);
      if (error) throw error;
    }

    if (updates.length > 0) {
      const results = await Promise.all(updates);
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;
    }

    return NextResponse.json({
      imported: newRows.length,
      updated: updates.length,
      total: emails.length,
      truncated: emails.length >= MAX_EMAILS
    });
  } catch (error) {
    console.error('[admin/email-logs/sync]', error);
    return NextResponse.json({ error: error?.message || 'resend_sync_failed' }, { status: 500 });
  }
}
