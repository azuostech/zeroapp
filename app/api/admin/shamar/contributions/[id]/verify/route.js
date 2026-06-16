import { NextResponse } from 'next/server';
import { publishFeedEvent } from '@/src/modules/community/application/feed-publisher';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';
import { createAdminContext, getShamarWriterSupabase, parseJsonBody, resolveShamarDbError, toNumber } from '@/src/lib/shamar/api';

export async function PATCH(request, { params }) {
  const context = await createAdminContext();
  if (context.error) return context.error;

  const contributionId = String(params?.id || '').trim();
  if (!contributionId) return NextResponse.json({ error: 'contribution_id_obrigatorio' }, { status: 422 });

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const verified = parsed.body?.verified;
  const rejectionReason = String(parsed.body?.rejection_reason || '').trim() || null;

  if (typeof verified !== 'boolean') {
    return NextResponse.json({ error: 'verified_invalido' }, { status: 422 });
  }

  const supabase = getShamarWriterSupabase(context.supabase);

  const { data, error } = await supabase
    .from('shamar_contributions')
    .update({ proof_verified: verified })
    .eq('id', contributionId)
    .select('id,season_id,user_id,amount,contributed_at,observation,proof_url,proof_verified,created_at')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_contribution_verify_failed') }, { status: 500 });
  }

  if (verified) {
    await publishFeedEvent(context.supabase, {
      userId: data.user_id,
      eventType: 'shamar_aporte_registered',
      title: 'Aporte SHAMAR validado',
      body: `Aporte de R$ ${toNumber(data.amount).toLocaleString('pt-BR')} confirmado pela mentoria.`,
      metadata: {
        source: 'shamar',
        season_id: data.season_id,
        contribution_id: data.id,
        amount: toNumber(data.amount)
      }
    });
  }

  await recordAdminAudit({
    supabase: context.supabase,
    adminUserId: context.user.id,
    targetUserId: data.user_id,
    action: verified ? 'verify' : 'reject',
    resource: 'shamar_contribution',
    resourceId: data.id,
    metadata: {
      verified,
      rejection_reason: rejectionReason
    }
  });

  return NextResponse.json({
    contribution: {
      ...data,
      amount: toNumber(data.amount)
    }
  });
}
