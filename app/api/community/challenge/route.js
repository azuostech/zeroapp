import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { hasStudentAccess } from '@/src/modules/profile/domain/access';

function toProgressPct(total, meta) {
  const safeMeta = Number(meta || 0);
  if (safeMeta <= 0) return 0;
  const value = (Number(total || 0) / safeMeta) * 100;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function GET() {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!hasStudentAccess(profile)) {
    return NextResponse.json({ error: 'student_access_required' }, { status: 403 });
  }

  const { data: challenge, error: challengeError } = await supabase
    .from('weekly_challenges')
    .select('*')
    .eq('is_active', true)
    .order('starts_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (challengeError) {
    return NextResponse.json({ error: challengeError.message || 'challenge_lookup_failed' }, { status: 500 });
  }

  if (!challenge) {
    return NextResponse.json({
      challenge: null,
      participations: 0,
      user_participated: false,
      progress_pct: 0
    });
  }

  const [{ count, error: countError }, { data: ownParticipation, error: ownError }] = await Promise.all([
    supabase
      .from('weekly_challenge_participations')
      .select('id', { count: 'exact', head: true })
      .eq('challenge_id', challenge.id),
    supabase
      .from('weekly_challenge_participations')
      .select('id')
      .eq('challenge_id', challenge.id)
      .eq('user_id', user.id)
      .maybeSingle()
  ]);

  if (countError) {
    return NextResponse.json({ error: countError.message || 'challenge_count_failed' }, { status: 500 });
  }

  if (ownError) {
    return NextResponse.json({ error: ownError.message || 'challenge_user_state_failed' }, { status: 500 });
  }

  const participations = Number(count || 0);

  return NextResponse.json({
    challenge,
    participations,
    user_participated: Boolean(ownParticipation),
    progress_pct: toProgressPct(participations, challenge.meta)
  });
}
