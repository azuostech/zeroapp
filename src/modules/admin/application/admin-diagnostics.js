import 'server-only';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { isAdminProfile } from '@/src/modules/admin/application/admin-impersonation-service';

export async function requireAdminDiagnosticsAccess() {
  const session = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(session);
  if (!user || !profile) {
    return { ok: false, response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }
  if (!isAdminProfile(profile)) {
    return { ok: false, response: NextResponse.json({ error: 'forbidden' }, { status: 403 }) };
  }
  return { ok: true, user, profile, service: getServiceSupabase() };
}

export async function profilesById(service, userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return new Map();
  const { data, error } = await service
    .from('profiles')
    .select('id,email,full_name,phone,status,tier,turma')
    .in('id', ids);
  if (error) throw error;
  return new Map((data || []).map((profile) => [profile.id, profile]));
}

export function serializeAdminDiagnostic(diagnostic, profile, { includeReport = false } = {}) {
  return {
    id: diagnostic.id,
    user_id: diagnostic.user_id,
    status: diagnostic.status,
    current_domain: diagnostic.current_domain,
    current_stage: diagnostic.current_stage,
    report_generated_at: diagnostic.report_generated_at || null,
    pdf_status: diagnostic.pdf_status,
    pdf_ready: Boolean(diagnostic.pdf_path && diagnostic.pdf_status === 'ready'),
    email_status: diagnostic.email_status,
    email_sent_at: diagnostic.email_sent_at || null,
    generation_attempts: diagnostic.generation_attempts,
    last_error: diagnostic.last_error || null,
    created_at: diagnostic.created_at,
    updated_at: diagnostic.updated_at,
    profile: profile || null,
    ...(includeReport ? { report: diagnostic.report || null } : {})
  };
}
