import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { hasStudentAccess } from '@/src/modules/profile/domain/access';

export async function GET() {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!hasStudentAccess(profile)) {
    return NextResponse.json({ error: 'student_access_required' }, { status: 403 });
  }

  const turmaUsuario = String(profile?.turma || '').trim() || null;

  try {
    const { data: statsRows, error: statsError } = await supabase.rpc('get_community_stats', {
      p_turma: turmaUsuario
    });
    if (statsError) {
      throw new Error(statsError.message || 'community_stats_rpc_failed');
    }

    const stats = Array.isArray(statsRows) ? statsRows[0] : statsRows;
    const safe = stats && typeof stats === 'object' ? stats : {};

    return NextResponse.json({
      ativos_hoje: Number(safe.ativos_hoje || 0),
      total_membros: Number(safe.total_membros || 0),
      completaram_mes: Number(safe.completaram_mes || 0),
      pct_completaram: Number(safe.pct_completaram || 0),
      coins_totais: Number(safe.coins_totais || 0),
      coins_gerados: Number(safe.coins_gerados || 0),
      turma: String(safe.turma || turmaUsuario || '').trim() || null
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'community_stats_failed' }, { status: 500 });
  }
}
