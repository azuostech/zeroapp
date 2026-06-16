import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { resolveShamarDbError } from '@/src/lib/shamar/api';
import { calculateAndPersistShamarIndex } from '@/src/lib/shamar/index-calculator';

export const runtime = 'nodejs';

function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET || '';
  const authHeader = request.headers.get('authorization');
  return Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;
}

async function runIndexJob(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let supabase;
  try {
    supabase = getServiceSupabase();
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'service_supabase_unavailable' }, { status: 500 });
  }

  const { data: seasons, error } = await supabase
    .from('shamar_seasons')
    .select('id,user_id,tribo_config_id,status')
    .eq('status', 'active')
    .order('started_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: resolveShamarDbError(error, 'shamar_active_seasons_lookup_failed') }, { status: 500 });
  }

  const processed = [];
  const errors = [];

  for (const season of seasons || []) {
    try {
      const result = await calculateAndPersistShamarIndex({
        supabase,
        userId: season.user_id,
        seasonId: season.id
      });

      processed.push({
        season_id: season.id,
        user_id: season.user_id,
        index_total: result.index?.index_total || 0,
        identity_level: result.identity_level
      });
    } catch (jobError) {
      errors.push({
        season_id: season.id,
        user_id: season.user_id,
        error: jobError?.message || 'shamar_index_calculation_failed'
      });
    }
  }

  return NextResponse.json({
    ok: errors.length === 0,
    active_seasons: (seasons || []).length,
    processed,
    errors
  });
}

export async function GET(request) {
  return runIndexJob(request);
}

export async function POST(request) {
  return runIndexJob(request);
}
