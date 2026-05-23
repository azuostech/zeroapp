import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { publishFeedEvent } from '@/src/modules/community/application/feed-publisher';

const WORKSHOP_AWARD_AMOUNT = 500;
const TIER_ORDER = {
  DESPERTAR: 0,
  MOVIMENTO: 1,
  ACELERACAO: 2,
  AUTOGOVERNO: 3
};

function normalizeCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase();
}

function tierRank(rawTier) {
  const tier = String(rawTier || '').toUpperCase();
  return Number.isInteger(TIER_ORDER[tier]) ? TIER_ORDER[tier] : 0;
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch (_) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const code = normalizeCode(body?.code);
  if (!code || code.length < 6) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (profile.status !== 'active') {
    return NextResponse.json({ error: 'inactive_account' }, { status: 403 });
  }

  if (tierRank(profile.tier) >= tierRank('MOVIMENTO')) {
    return NextResponse.json({ error: 'tier_already_unlocked' }, { status: 422 });
  }

  const serviceSupabase = getServiceSupabase();

  try {
    const { data: workshopCode, error: workshopCodeError } = await serviceSupabase
      .from('workshop_codes')
      .select('code, used_by_user_id, used_at, expires_at')
      .eq('code', code)
      .maybeSingle();

    if (workshopCodeError) {
      throw new Error(workshopCodeError.message || 'workshop_code_lookup_failed');
    }

    if (!workshopCode) {
      return NextResponse.json({ error: 'code_not_found' }, { status: 404 });
    }

    if (workshopCode.used_by_user_id) {
      return NextResponse.json({ error: 'code_already_used' }, { status: 409 });
    }

    if (workshopCode.expires_at && new Date(workshopCode.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'code_expired' }, { status: 410 });
    }

    const nowIso = new Date().toISOString();
    const { data: lockedCode, error: lockError } = await serviceSupabase
      .from('workshop_codes')
      .update({
        used_by_user_id: user.id,
        used_at: nowIso
      })
      .eq('code', code)
      .is('used_by_user_id', null)
      .select('code')
      .maybeSingle();

    if (lockError) {
      throw new Error(lockError.message || 'workshop_code_lock_failed');
    }

    if (!lockedCode) {
      return NextResponse.json({ error: 'code_already_used' }, { status: 409 });
    }

    const { data: upgradedProfile, error: tierError } = await serviceSupabase
      .from('profiles')
      .update({ tier: 'MOVIMENTO' })
      .eq('id', user.id)
      .eq('tier', 'DESPERTAR')
      .select('id')
      .maybeSingle();

    if (tierError) {
      throw new Error(tierError.message || 'tier_upgrade_failed');
    }

    if (!upgradedProfile) {
      // Se o tier já mudou em corrida, liberamos o código para não consumir indevidamente.
      await serviceSupabase
        .from('workshop_codes')
        .update({
          used_by_user_id: null,
          used_at: null
        })
        .eq('code', code)
        .eq('used_by_user_id', user.id);

      return NextResponse.json({ error: 'tier_already_unlocked' }, { status: 422 });
    }

    let rpcRow = null;
    try {
      const { data: rpcData, error: rpcError } = await serviceSupabase.rpc('award_coins', {
        p_user_id: user.id,
        p_amount: WORKSHOP_AWARD_AMOUNT,
        p_action_type: 'workshop_code',
        p_description: 'Código do Workshop resgatado',
        p_metadata: {
          code,
          source: 'workshop_redeem'
        }
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'award_coins_failed');
      }

      rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    } catch (awardError) {
      // Best-effort rollback para evitar inconsistência em caso de falha parcial.
      await serviceSupabase
        .from('profiles')
        .update({ tier: 'DESPERTAR' })
        .eq('id', user.id)
        .eq('tier', 'MOVIMENTO');

      await serviceSupabase
        .from('workshop_codes')
        .update({
          used_by_user_id: null,
          used_at: null
        })
        .eq('code', code)
        .eq('used_by_user_id', user.id);

      throw awardError;
    }

    await publishFeedEvent(supabase, {
      userId: user.id,
      eventType: 'workshop_redeemed',
      title: 'Entrou para a mentoria! 🎓',
      body: null,
      metadata: { novo_tier: 'MOVIMENTO' }
    });

    return NextResponse.json({
      success: true,
      novo_tier: 'MOVIMENTO',
      coins_awarded: [
        {
          action_type: 'workshop_code',
          amount: WORKSHOP_AWARD_AMOUNT,
          description: 'Código do Workshop resgatado'
        }
      ],
      balance: {
        coins: Number(rpcRow?.new_coins || 0),
        coins_total: Number(rpcRow?.new_total || 0),
        phase: String(rpcRow?.new_phase || 'BOMBEIRO')
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'workshop_redeem_failed' }, { status: 500 });
  }
}
