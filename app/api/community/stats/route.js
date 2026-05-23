import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';

function monthWindowUtc() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString()
  };
}

export async function GET() {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const serviceSupabase = getServiceSupabase();

  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ data: activeRows, error: activeError }, { count: totalMembers, error: membersError }, { data: coinsRows, error: coinsError }] =
      await Promise.all([
        serviceSupabase
          .from('feed_events')
          .select('user_id')
          .eq('is_visible', true)
          .gte('created_at', dayAgo),
        serviceSupabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        serviceSupabase.from('coins_balance').select('coins_total')
      ]);

    if (activeError) throw new Error(activeError.message || 'community_active_query_failed');
    if (membersError) throw new Error(membersError.message || 'community_members_query_failed');
    if (coinsError) throw new Error(coinsError.message || 'community_coins_query_failed');

    const activeUsers = new Set((activeRows || []).map((row) => row.user_id).filter(Boolean));
    const coinsGerados = (coinsRows || []).reduce((sum, row) => sum + Number(row?.coins_total || 0), 0);

    const { startIso, endIso } = monthWindowUtc();
    const { count: completaramMes, error: monthError } = await serviceSupabase
      .from('feed_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', 'month_complete')
      .eq('is_visible', true)
      .gte('created_at', startIso)
      .lt('created_at', endIso);

    if (monthError) throw new Error(monthError.message || 'community_month_complete_query_failed');

    return NextResponse.json({
      ativos_hoje: activeUsers.size,
      total_membros: Number(totalMembers || 0),
      coins_gerados: coinsGerados,
      completaram_mes: Number(completaramMes || 0)
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'community_stats_failed' }, { status: 500 });
  }
}
