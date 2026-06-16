import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import {
  createAuthenticatedContext,
  normalizeId,
  resolveShamarDbError,
  roundMoney,
  toNumber
} from '@/src/lib/shamar/api';

function displayName(profile) {
  const name = String(profile?.full_name || '').trim();
  if (name) return name.split(/\s+/).slice(0, 2).join(' ');
  const email = String(profile?.email || '').trim();
  return email.includes('@') ? email.split('@')[0] : 'Guardiao';
}

function avatarInitial(profile) {
  return displayName(profile).charAt(0).toUpperCase() || 'G';
}

async function resolveSeason(supabase, userId, seasonId) {
  let query = supabase
    .from('shamar_seasons')
    .select('id,user_id,tribo_config_id,status,identity_level')
    .eq('user_id', userId);

  if (seasonId) query = query.eq('id', seasonId);
  else query = query.eq('status', 'active').order('started_at', { ascending: false }).limit(1);

  const { data, error } = await query.maybeSingle();
  if (error) return { season: null, error };
  return { season: data || null, error: null };
}

async function seasonSummary(serviceSupabase, season, profile, currentUserId) {
  const [contribResult, markedResult, indexResult] = await Promise.all([
    serviceSupabase
      .from('shamar_contributions')
      .select('amount')
      .eq('season_id', season.id)
      .eq('user_id', season.user_id),
    serviceSupabase
      .from('shamar_marked_squares')
      .select('id')
      .eq('season_id', season.id),
    serviceSupabase
      .from('shamar_index_history')
      .select('*')
      .eq('season_id', season.id)
      .eq('user_id', season.user_id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const firstError = [contribResult.error, markedResult.error, indexResult.error].find(Boolean);
  if (firstError) throw firstError;

  return {
    season_id: season.id,
    user_id: season.user_id,
    current_user: season.user_id === currentUserId,
    name: displayName(profile),
    avatar: avatarInitial(profile),
    identity_level: indexResult.data?.identity_level || season.identity_level || 'guardiao',
    index_total: toNumber(indexResult.data?.index_total),
    patrimonio: roundMoney((contribResult.data || []).reduce((sum, row) => sum + toNumber(row.amount), 0)),
    squares_marked: (markedResult.data || []).length,
    weeks: Math.round(toNumber(indexResult.data?.score_constancia) / 60)
  };
}

export async function GET(request) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const { searchParams } = new URL(request.url);
  const requestedSeasonId = normalizeId(searchParams.get('season_id'));
  const { season, error: seasonError } = await resolveSeason(context.supabase, context.user.id, requestedSeasonId);

  if (seasonError) {
    return NextResponse.json({ error: resolveShamarDbError(seasonError, 'shamar_season_lookup_failed') }, { status: 500 });
  }

  if (!season) {
    return NextResponse.json({ partnership: null, invite: true });
  }

  const { data: partnership, error: partnershipError } = await context.supabase
    .from('shamar_partnerships')
    .select('id,season_id_a,season_id_b,status,created_at')
    .or(`season_id_a.eq.${season.id},season_id_b.eq.${season.id}`)
    .in('status', ['pending', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (partnershipError) {
    return NextResponse.json({ error: resolveShamarDbError(partnershipError, 'shamar_partnership_lookup_failed') }, { status: 500 });
  }

  if (!partnership) {
    return NextResponse.json({
      season_id: season.id,
      partnership: null,
      invite: true
    });
  }

  try {
    const serviceSupabase = getServiceSupabase();
    const pairSeasonIds = [partnership.season_id_a, partnership.season_id_b];
    const { data: pairSeasons, error: seasonsError } = await serviceSupabase
      .from('shamar_seasons')
      .select('id,user_id,tribo_config_id,status,identity_level')
      .in('id', pairSeasonIds);

    if (seasonsError) throw seasonsError;

    const userIds = [...new Set((pairSeasons || []).map((item) => item.user_id))];
    const { data: profiles, error: profilesError } = userIds.length > 0
      ? await serviceSupabase.from('profiles').select('id,email,full_name').in('id', userIds)
      : { data: [], error: null };

    if (profilesError) throw profilesError;

    const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
    const summaries = await Promise.all(
      (pairSeasons || []).map((item) => seasonSummary(serviceSupabase, item, profilesById.get(item.user_id), context.user.id))
    );

    const current = summaries.find((item) => item.current_user) || null;
    const partner = summaries.find((item) => !item.current_user) || null;
    const patrimonioConjunto = roundMoney(summaries.reduce((sum, item) => sum + item.patrimonio, 0));

    return NextResponse.json({
      season_id: season.id,
      partnership,
      invite: false,
      current,
      partner,
      patrimonio_conjunto: patrimonioConjunto
    });
  } catch (aggregateError) {
    return NextResponse.json({ error: resolveShamarDbError(aggregateError, 'shamar_nos_lookup_failed') }, { status: 500 });
  }
}
