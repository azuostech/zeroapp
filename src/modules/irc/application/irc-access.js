import 'server-only';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { IRC_PRODUCT_CODE } from '@/src/modules/irc/domain/irc-domains';

export async function getIrcRequestContext() {
  const sessionClient = await createServerSupabase();
  const {
    data: { user },
    error
  } = await sessionClient.auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, error: 'unauthorized' };
  }

  const service = getServiceSupabase();
  const [{ data: profile }, { data: entitlement }] = await Promise.all([
    service
      .from('profiles')
      .select('id,email,full_name,phone,status,role,tier,turma')
      .eq('id', user.id)
      .maybeSingle(),
    service
      .from('product_access')
      .select('id,user_id,product_code,purchase_id,status,source,granted_at')
      .eq('user_id', user.id)
      .eq('product_code', IRC_PRODUCT_CODE)
      .eq('status', 'active')
      .order('granted_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  if (!profile || profile.status !== 'active') {
    return { ok: false, status: 403, error: 'inactive_account', user, profile };
  }

  if (!entitlement) {
    return { ok: false, status: 403, error: 'diagnostic_access_required', user, profile };
  }

  return { ok: true, user, profile, entitlement, service };
}

export async function findOrCreateDiagnostic(context) {
  const { service, user, entitlement } = context;
  const { data: existing, error: selectError } = await service
    .from('irc_diagnostics')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) {
    if (existing.entitlement_id !== entitlement.id) {
      const { data: relinked, error: relinkError } = await service
        .from('irc_diagnostics')
        .update({ entitlement_id: entitlement.id })
        .eq('id', existing.id)
        .eq('user_id', user.id)
        .select('*')
        .single();
      if (relinkError) throw relinkError;
      return relinked;
    }
    return existing;
  }

  const { data, error } = await service
    .from('irc_diagnostics')
    .upsert(
      {
        user_id: user.id,
        entitlement_id: entitlement.id,
        status: 'not_started',
        current_domain: 0,
        current_stage: 'entry',
        answers: {}
      },
      { onConflict: 'user_id', ignoreDuplicates: false }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export function serializeDiagnostic(diagnostic) {
  return {
    id: diagnostic.id,
    status: diagnostic.status,
    current_domain: diagnostic.current_domain,
    current_stage: diagnostic.current_stage,
    answers: diagnostic.answers || {},
    report: diagnostic.report || null,
    report_generated_at: diagnostic.report_generated_at || null,
    pdf_ready: Boolean(diagnostic.pdf_path && diagnostic.pdf_status === 'ready'),
    pdf_status: diagnostic.pdf_status,
    email_status: diagnostic.email_status,
    email_sent_at: diagnostic.email_sent_at || null,
    generation_attempts: diagnostic.generation_attempts,
    last_error: diagnostic.last_error || null,
    updated_at: diagnostic.updated_at
  };
}
