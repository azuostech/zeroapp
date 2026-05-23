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
  const turmaUsuario = String(profile?.turma || '').trim() || null;

  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { startIso, endIso } = monthWindowUtc();

    let membersQuery = serviceSupabase.from('profiles').select('id').eq('status', 'active');
    if (turmaUsuario) {
      membersQuery = membersQuery.eq('turma', turmaUsuario);
    }

    const { data: membersRows, error: membersError } = await membersQuery;
    if (membersError) throw new Error(membersError.message || 'community_members_query_failed');

    const memberIds = (membersRows || []).map((row) => row.id).filter(Boolean);
    const totalMembers = memberIds.length;

    let activeQuery = serviceSupabase
      .from('feed_events')
      .select('user_id')
      .eq('is_visible', true)
      .gte('created_at', dayAgo);

    if (turmaUsuario) {
      activeQuery = activeQuery.eq('turma', turmaUsuario);
    }

    const { data: activeRows, error: activeError } = await activeQuery;
    if (activeError) throw new Error(activeError.message || 'community_active_query_failed');

    const activeUsers = new Set((activeRows || []).map((row) => row.user_id).filter(Boolean));

    let coinsRows = [];
    if (memberIds.length > 0) {
      const { data, error: coinsError } = await serviceSupabase
        .from('coins_balance')
        .select('user_id,coins_total')
        .in('user_id', memberIds);
      if (coinsError) throw new Error(coinsError.message || 'community_coins_query_failed');
      coinsRows = data || [];
    }

    const coinsTotais = coinsRows.reduce((sum, row) => sum + Number(row?.coins_total || 0), 0);

    let monthQuery = serviceSupabase
      .from('feed_events')
      .select('user_id')
      .eq('event_type', 'month_complete')
      .eq('is_visible', true)
      .gte('created_at', startIso)
      .lt('created_at', endIso);

    if (turmaUsuario) {
      monthQuery = monthQuery.eq('turma', turmaUsuario);
    }

    const { data: monthRows, error: monthError } = await monthQuery;

    if (monthError) throw new Error(monthError.message || 'community_month_complete_query_failed');

    const completaramMes = new Set((monthRows || []).map((row) => row.user_id).filter(Boolean)).size;
    const pctCompletaram = totalMembers > 0 ? Math.round((completaramMes / totalMembers) * 100) : 0;

    return NextResponse.json({
      ativos_hoje: activeUsers.size,
      total_membros: totalMembers,
      completaram_mes: completaramMes,
      pct_completaram: pctCompletaram,
      coins_totais: coinsTotais,
      coins_gerados: coinsTotais,
      turma: turmaUsuario
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'community_stats_failed' }, { status: 500 });
  }
}
