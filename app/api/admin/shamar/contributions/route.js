import { NextResponse } from 'next/server';
import { createAdminContext, getShamarWriterSupabase, resolveShamarDbError, toNumber } from '@/src/lib/shamar/api';

async function signedProofUrl(supabase, path) {
  const proofPath = String(path || '').trim();
  if (!proofPath) return null;

  try {
    const { data, error } = await supabase.storage.from('shamar-provas').createSignedUrl(proofPath, 15 * 60);
    if (error) return null;
    return data?.signedUrl || null;
  } catch (_) {
    return null;
  }
}

export async function GET() {
  const context = await createAdminContext();
  if (context.error) return context.error;

  const supabase = getShamarWriterSupabase(context.supabase);

  try {
    const { data: contributions, error } = await supabase
      .from('shamar_contributions')
      .select('id,season_id,user_id,amount,contributed_at,observation,proof_url,proof_verified,created_at')
      .eq('proof_verified', false)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const rows = contributions || [];
    const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
    const seasonIds = [...new Set(rows.map((row) => row.season_id).filter(Boolean))];

    const [profilesResult, seasonsResult] = await Promise.all([
      userIds.length
        ? supabase
            .from('profiles')
            .select('id,email,full_name,turma,tier')
            .in('id', userIds)
        : { data: [], error: null },
      seasonIds.length
        ? supabase
            .from('shamar_seasons')
            .select('id,tribo_config_id,status,identity_level,started_at')
            .in('id', seasonIds)
        : { data: [], error: null }
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (seasonsResult.error) throw seasonsResult.error;

    const configIds = [...new Set((seasonsResult.data || []).map((season) => season.tribo_config_id).filter(Boolean))];
    const configsResult = configIds.length
      ? await supabase
          .from('shamar_tribo_configs')
          .select('id,turma,meta_total,started_at,ends_at')
          .in('id', configIds)
      : { data: [], error: null };

    if (configsResult.error) throw configsResult.error;

    const profilesById = new Map((profilesResult.data || []).map((profile) => [profile.id, profile]));
    const configsById = new Map((configsResult.data || []).map((config) => [config.id, config]));
    const seasonsById = new Map((seasonsResult.data || []).map((season) => [
      season.id,
      {
        ...season,
        config: configsById.get(season.tribo_config_id) || null
      }
    ]));

    const enriched = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        amount: toNumber(row.amount),
        profile: profilesById.get(row.user_id) || null,
        season: seasonsById.get(row.season_id) || null,
        proof_signed_url: await signedProofUrl(supabase, row.proof_url)
      }))
    );

    return NextResponse.json({ contributions: enriched, total: enriched.length });
  } catch (error) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_contributions_admin_lookup_failed') }, { status: 500 });
  }
}
